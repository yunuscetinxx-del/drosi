import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';
import '../models/app_update_info.dart';
import '../models/lesson.dart';
import '../services/api_client.dart';
import '../services/app_update_service.dart';
import '../services/auth_service.dart';
import '../services/lesson_store.dart';
import '../services/lessons_service.dart';
import '../services/sync_service.dart';

enum SyncStatus { idle, syncing, offline, error }

class AppState extends ChangeNotifier {
  static const _themeKey = 'theme_mode';

  final _auth = AuthService();
  final _lessons = LessonsService();
  final _connectivity = Connectivity();

  AuthUser? user;
  List<Lesson> lessons = [];
  bool loading = true;
  String? error;
  String baseUrl = ApiConfig.baseUrl;

  ThemeMode themeMode = ThemeMode.system;

  bool online = true;
  SyncStatus syncStatus = SyncStatus.idle;
  String? syncError;
  DateTime? lastSyncedAt;
  int pendingCount = 0;

  String appVersionLabel = '';
  AppUpdateInfo? availableUpdate;
  bool checkingUpdate = false;

  LessonStore? _store;
  final _appUpdate = AppUpdateService();
  StreamSubscription<List<ConnectivityResult>>? _connSub;

  LessonStore? get _activeStore => _store;

  Future<void> bootstrap() async {
    loading = true;
    error = null;
    notifyListeners();

    await _loadThemeMode();
    await ApiConfig.load();
    baseUrl = ApiConfig.baseUrl;
    await ApiClient.instance.init();

    // راقب الاتصال وزامن تلقائياً عند عودته.
    await _refreshConnectivity();
    _connSub = _connectivity.onConnectivityChanged.listen(_onConnectivityChanged);

    // استرجع المستخدم المخزّن محلياً (يسمح بالدخول دون إنترنت).
    user = await _auth.cachedUser();

    if (user != null) {
      _store = LessonStore(user!.email);
      // اعرض المحلي فوراً.
      lessons = await _store!.readLessons();
      await _refreshPendingCount();
      notifyListeners();

      // إن كان هناك اتصال، تحقّق من الجلسة وزامن.
      if (online) {
        final fresh = await _auth.me();
        if (fresh != null) {
          user = fresh;
          await syncNow();
        } else {
          // الجلسة منتهية فعلاً (مع وجود اتصال) → خروج.
          await logout();
        }
      }
    }

    loading = false;
    notifyListeners();

    if (user != null) {
      unawaited(_loadAppVersion());
    }
  }

  Future<void> _loadAppVersion() async {
    final pkg = await PackageInfo.fromPlatform();
    appVersionLabel = '${pkg.version} (${pkg.buildNumber})';
    notifyListeners();
  }

  /// يتحقق من mobile-update.json على السيرفر.
  Future<bool> checkForAppUpdate({bool force = false}) async {
    checkingUpdate = true;
    notifyListeners();
    try {
      await _loadAppVersion();
      await _refreshConnectivity();
      if (!online) {
        if (force) availableUpdate = null;
        return false;
      }
      final update = await _appUpdate.checkForUpdate();
      if (update == null) {
        availableUpdate = null;
        return false;
      }
      if (!force && !update.mandatory) {
        final prefs = await SharedPreferences.getInstance();
        final skipped = prefs.getInt(AppUpdateService.skippedBuildKey) ?? 0;
        if (skipped >= update.buildNumber) {
          availableUpdate = null;
          return false;
        }
      }
      availableUpdate = update;
      return true;
    } finally {
      checkingUpdate = false;
      notifyListeners();
    }
  }

  Future<void> skipAvailableUpdate() async {
    final update = availableUpdate;
    if (update == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(AppUpdateService.skippedBuildKey, update.buildNumber);
    availableUpdate = null;
    notifyListeners();
  }

  Future<void> _loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_themeKey);
    themeMode = switch (raw) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    themeMode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _themeKey,
      switch (mode) {
        ThemeMode.light => 'light',
        ThemeMode.dark => 'dark',
        ThemeMode.system => 'system',
      },
    );
  }

  Future<void> _refreshConnectivity() async {
    final results = await _connectivity.checkConnectivity();
    online = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
  }

  void _onConnectivityChanged(List<ConnectivityResult> results) async {
    final wasOnline = online;
    online = !results.contains(ConnectivityResult.none) && results.isNotEmpty;
    notifyListeners();
    // عند عودة الاتصال، زامن تلقائياً.
    if (!wasOnline && online && user != null) {
      await syncNow();
    }
  }

  Future<void> setBaseUrl(String url) async {
    await ApiConfig.setBaseUrl(url);
    baseUrl = ApiConfig.baseUrl;
    await ApiClient.instance.rebuildBaseUrl();
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    error = null;
    loading = true;
    notifyListeners();
    try {
      user = await _auth.login(email, password);
      _store = LessonStore(user!.email);
      lessons = await _store!.readLessons();
      notifyListeners();
      await syncNow();
    } catch (e) {
      error = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> register(String email, String password) async {
    error = null;
    loading = true;
    notifyListeners();
    try {
      user = await _auth.register(email, password);
      _store = LessonStore(user!.email);
      lessons = await _store!.readLessons();
      notifyListeners();
      await syncNow();
    } catch (e) {
      error = e.toString().replaceFirst('Exception: ', '');
      rethrow;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    user = null;
    lessons = [];
    pendingCount = 0;
    syncStatus = SyncStatus.idle;
    syncError = null;
    _store = null;
    notifyListeners();
  }

  /// مزامنة يدوية أو تلقائية. تعمل بصمت إن لم يكن هناك اتصال.
  Future<void> syncNow() async {
    final store = _activeStore;
    if (store == null) return;

    await _refreshConnectivity();
    if (!online) {
      syncStatus = SyncStatus.offline;
      notifyListeners();
      return;
    }

    syncStatus = SyncStatus.syncing;
    syncError = null;
    notifyListeners();

    try {
      final result = await SyncService(store: store).sync();
      lessons = result.lessons;
      lastSyncedAt = DateTime.now();
      syncStatus = SyncStatus.idle;
      await _refreshPendingCount();
    } catch (e) {
      syncStatus = SyncStatus.error;
      syncError = e.toString().replaceFirst('Exception: ', '');
    } finally {
      notifyListeners();
    }
  }

  Future<void> _refreshPendingCount() async {
    final store = _activeStore;
    if (store == null) {
      pendingCount = 0;
      return;
    }
    final dirty = await store.readDirty();
    final deleted = await store.readDeleted();
    pendingCount = dirty.length + deleted.length;
  }

  /// حفظ محلي فوري (يعمل دون إنترنت) ثم محاولة مزامنة.
  Future<void> _persistLocalAndSync() async {
    final store = _activeStore;
    if (store == null) return;
    await store.writeLessons(lessons);
    await _refreshPendingCount();
    notifyListeners();
    // محاولة مزامنة بدون إيقاف تجربة المستخدم.
    unawaited(syncNow());
  }

  Lesson? lessonById(String id) {
    for (final l in lessons) {
      if (l.id == id) return l;
    }
    return null;
  }

  Future<void> addLesson({
    required String title,
    required String subject,
    required String description,
  }) async {
    final lesson = _lessons.createLesson(
      title: title,
      subject: subject,
      description: description,
    );
    lessons = [lesson, ...lessons];
    await _activeStore?.markDirty(lesson.id);
    await _persistLocalAndSync();
  }

  Future<void> updateLesson(Lesson updated) async {
    final stamped = updated.copyWith(updatedAt: DateTime.now());
    lessons = lessons.map((l) => l.id == stamped.id ? stamped : l).toList();
    await _activeStore?.markDirty(stamped.id);
    await _persistLocalAndSync();
  }

  Future<void> deleteLesson(String id) async {
    lessons = lessons.where((l) => l.id != id).toList();
    await _activeStore?.markDeleted(id);
    await _persistLocalAndSync();
  }

  @override
  void dispose() {
    _connSub?.cancel();
    super.dispose();
  }
}
