import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// عنوان API الخادم — غيّره من شاشة تسجيل الدخول → إعدادات الخادم.
class ApiConfig {
  static const _keyBaseUrl = 'api_base_url';

  static String get defaultBaseUrl {
    if (kIsWeb) return 'http://localhost:3000';
    if (!kIsWeb && Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://localhost:3000';
  }

  static String _baseUrl = defaultBaseUrl;

  static String get baseUrl => _baseUrl;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString(_keyBaseUrl) ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final trimmed = url.trim().replaceAll(RegExp(r'/$'), '');
    _baseUrl = trimmed;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, trimmed);
  }
}
