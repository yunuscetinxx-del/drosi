import 'package:shared_preferences/shared_preferences.dart';

import '../services/remote_config_service.dart';

/// عنوان API الخادم — يُحدَّث تلقائياً من الموقع أو يدوياً من الإعدادات.
class ApiConfig {
  static const _keyBaseUrl = 'api_base_url';
  static const _keyUserOverride = 'api_base_url_user_override';

  static String get defaultBaseUrl => 'https://sdda.up.railway.app';

  static String _baseUrl = defaultBaseUrl;
  static bool _userOverride = false;

  static String get baseUrl => _baseUrl;
  static bool get userOverride => _userOverride;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _userOverride = prefs.getBool(_keyUserOverride) ?? false;
    _baseUrl = prefs.getString(_keyBaseUrl) ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url, {bool userOverride = true}) async {
    final trimmed = url.trim().replaceAll(RegExp(r'/$'), '');
    _baseUrl = trimmed;
    _userOverride = userOverride;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, trimmed);
    await prefs.setBool(_keyUserOverride, userOverride);
  }

  static Future<void> clearUserOverride() async {
    _userOverride = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyUserOverride, false);
  }

  /// يجلب الرابط من الموقع/ملف الإعدادات ويطبّقه إن لزم.
  static Future<String?> syncFromRemote() async {
    final remote = await RemoteConfigService().fetchBest();
    if (remote == null) return null;

    if (_userOverride && !remote.forceApiBaseUrl) return null;
    if (remote.apiBaseUrl == _baseUrl) return null;

    await setBaseUrl(remote.apiBaseUrl, userOverride: false);
    return remote.apiBaseUrl;
  }
}
