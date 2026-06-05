import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/lesson.dart';
import 'api_client.dart';

class AuthService {
  final _api = ApiClient.instance;

  static const _emailKey = 'cached_user_email';
  static const _nameKey = 'cached_user_name';
  static const _adminKey = 'cached_user_admin';

  Future<void> _cacheUser(AuthUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_emailKey, user.email);
    await prefs.setBool(_adminKey, user.isAdmin);
    final name = user.name?.trim();
    if (name != null && name.isNotEmpty) {
      await prefs.setString(_nameKey, name);
    } else {
      await prefs.remove(_nameKey);
    }
  }

  Future<void> _clearCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_emailKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_adminKey);
  }

  /// المستخدم المخزّن محلياً — يسمح بفتح التطبيق دون إنترنت
  /// طالما يوجد رمز جلسة محفوظ.
  Future<AuthUser?> cachedUser() async {
    if (_api.token == null || _api.token!.isEmpty) return null;
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_emailKey);
    if (email == null) return null;
    return AuthUser(
      email: email,
      isAdmin: prefs.getBool(_adminKey) ?? false,
      name: prefs.getString(_nameKey),
    );
  }

  Future<AuthUser> login(String email, String password) async {
    try {
      final res = await _api.dio.post(
        '/api/auth/login',
        data: {'email': email.trim(), 'password': password},
      );
      final data = res.data as Map<String, dynamic>;
      final token = data['token'] as String?;
      if (token == null || token.isEmpty) {
        throw Exception('لم يُرجع الخادم رمز الجلسة');
      }
      await _api.saveToken(token);
      final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
      await _cacheUser(user);
      return user;
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<AuthUser> register(String name, String email, String password) async {
    try {
      final res = await _api.dio.post(
        '/api/auth/register',
        data: {
          'name': name.trim(),
          'email': email.trim(),
          'password': password,
        },
      );
      final data = res.data as Map<String, dynamic>;
      final token = data['token'] as String?;
      if (token == null || token.isEmpty) {
        throw Exception('لم يُرجع الخادم رمز الجلسة');
      }
      await _api.saveToken(token);
      final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
      await _cacheUser(user);
      return user;
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  /// التحقق من الجلسة عبر الخادم. يُرجع المستخدم، أو null إن انتهت الجلسة.
  /// يميّز بين انتهاء الجلسة (401) وانقطاع الشبكة (لا يحذف الرمز عندها).
  Future<AuthUser?> me() async {
    if (_api.token == null) return null;
    try {
      final res = await _api.dio.get('/api/auth/me');
      final data = res.data as Map<String, dynamic>;
      final user = data['user'];
      if (user == null) return null;
      final parsed = AuthUser.fromJson(user as Map<String, dynamic>);
      await _cacheUser(parsed);
      return parsed;
    } on DioException catch (e) {
      // خطأ شبكة (وليس رفض جلسة): أبقِ الرمز للعمل دون اتصال.
      final status = e.response?.statusCode;
      if (status == null) {
        return cachedUser();
      }
      if (status == 401 || status == 403) {
        await _api.clearToken();
        await _clearCachedUser();
        return null;
      }
      return cachedUser();
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post('/api/auth/logout');
    } catch (_) {
      /* ignore */
    }
    await _api.clearToken();
    await _clearCachedUser();
  }
}
