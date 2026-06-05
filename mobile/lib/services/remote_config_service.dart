import 'package:dio/dio.dart';

import '../config/api_config.dart';

class RemoteAppConfig {
  RemoteAppConfig({
    required this.apiBaseUrl,
    this.forceApiBaseUrl = false,
    this.updatedAt,
  });

  final String apiBaseUrl;
  final bool forceApiBaseUrl;
  final String? updatedAt;
}

/// يجلب رابط السيرفر من مصادر ثابتة على الإنترنت (بدون إعادة بناء APK).
class RemoteConfigService {
  RemoteConfigService() : _dio = Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 8),
          receiveTimeout: const Duration(seconds: 8),
          headers: {'Accept': 'application/json'},
        ),
      );

  final Dio _dio;

  static final List<String> _bootstrapJsonUrls = [
    'https://raw.githubusercontent.com/yunuscetinxx-del/drosi/main/public/app-config.json',
  ];

  Future<RemoteAppConfig?> fetchBest() async {
    final candidates = <String>[
      ..._bootstrapJsonUrls,
      '${ApiConfig.defaultBaseUrl}/api/public-config',
      '${ApiConfig.defaultBaseUrl}/app-config.json',
      '${ApiConfig.baseUrl}/api/public-config',
      '${ApiConfig.baseUrl}/app-config.json',
    ];

    final seen = <String>{};
    for (final raw in candidates) {
      final url = raw.trim().replaceAll(RegExp(r'/$'), '');
      if (url.isEmpty || seen.contains(url)) continue;
      seen.add(url);
      final parsed = await _fetchOne(url);
      if (parsed != null) return parsed;
    }
    return null;
  }

  Future<RemoteAppConfig?> _fetchOne(String url) async {
    try {
      final res = await _dio.get<dynamic>(url);
      final data = res.data;
      if (data is! Map) return null;
      final map = Map<String, dynamic>.from(data);
      final apiBaseUrl = map['apiBaseUrl']?.toString().trim() ?? '';
      if (!_isValidHttps(apiBaseUrl)) return null;
      return RemoteAppConfig(
        apiBaseUrl: apiBaseUrl.replaceAll(RegExp(r'/$'), ''),
        forceApiBaseUrl: map['forceApiBaseUrl'] == true,
        updatedAt: map['updatedAt']?.toString(),
      );
    } on DioException {
      return null;
    } catch (_) {
      return null;
    }
  }

  bool _isValidHttps(String url) {
    final uri = Uri.tryParse(url);
    return uri != null && uri.scheme == 'https' && uri.host.isNotEmpty;
  }
}
