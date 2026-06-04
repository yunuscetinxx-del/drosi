import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/lesson.dart';

/// تخزين محلي دائم للدروس على الهاتف (يعمل بدون إنترنت).
///
/// يحفظ لكل مستخدم: قائمة الدروس + معرّفات الدروس المعدّلة محلياً
/// (بانتظار الرفع) + معرّفات المحذوفة محلياً (بانتظار الحذف من الخادم).
class LessonStore {
  LessonStore(this.userKey);

  /// مفتاح يميّز المستخدم (نستخدم البريد) لفصل بيانات الحسابات.
  final String userKey;

  String get _lessonsKey => 'lessons_cache::$userKey';
  String get _dirtyKey => 'lessons_dirty::$userKey';
  String get _deletedKey => 'lessons_deleted::$userKey';

  Future<List<Lesson>> readLessons() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_lessonsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .whereType<Map<String, dynamic>>()
          .map(Lesson.fromJson)
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> writeLessons(List<Lesson> lessons) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(lessons.map((l) => l.toJson()).toList());
    await prefs.setString(_lessonsKey, encoded);
  }

  Future<Set<String>> readDirty() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_dirtyKey) ?? const []).toSet();
  }

  Future<void> writeDirty(Set<String> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_dirtyKey, ids.toList());
  }

  Future<Set<String>> readDeleted() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_deletedKey) ?? const []).toSet();
  }

  Future<void> writeDeleted(Set<String> ids) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_deletedKey, ids.toList());
  }

  Future<void> markDirty(String id) async {
    final ids = await readDirty();
    ids.add(id);
    await writeDirty(ids);
  }

  Future<void> markDeleted(String id) async {
    final deleted = await readDeleted();
    deleted.add(id);
    await writeDeleted(deleted);
    // العنصر المحذوف لم يعد بحاجة لعلامة "معدّل".
    final dirty = await readDirty();
    if (dirty.remove(id)) await writeDirty(dirty);
  }

  /// إزالة كل علامات المزامنة المعلّقة بعد نجاح الرفع.
  Future<void> clearPending() async {
    await writeDirty(<String>{});
    await writeDeleted(<String>{});
  }

  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_lessonsKey);
    await prefs.remove(_dirtyKey);
    await prefs.remove(_deletedKey);
  }
}
