import 'package:dio/dio.dart';

import 'api_client.dart';

class AiSettings {
  AiSettings({
    required this.hasGeminiKey,
    this.geminiKeyHint,
    this.activeSource = 'openrouter',
    this.serverFallbackAvailable = false,
  });

  final bool hasGeminiKey;
  final String? geminiKeyHint;
  final String activeSource;
  final bool serverFallbackAvailable;

  factory AiSettings.fromJson(Map<String, dynamic> json) {
    return AiSettings(
      hasGeminiKey: json['hasGeminiKey'] == true,
      geminiKeyHint: json['geminiKeyHint']?.toString(),
      activeSource: json['activeSource']?.toString() ?? 'openrouter',
      serverFallbackAvailable: json['serverFallbackAvailable'] == true,
    );
  }
}

class AiSettingsService {
  final _api = ApiClient.instance;

  Options get _opts => Options(
        receiveTimeout: const Duration(seconds: 60),
        sendTimeout: const Duration(seconds: 60),
      );

  Future<AiSettings> fetch() async {
    try {
      final res = await _api.dio.get('/api/user/ai-settings', options: _opts);
      return AiSettings.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<AiSettings> saveGeminiKey(String apiKey) async {
    try {
      final res = await _api.dio.put(
        '/api/user/ai-settings',
        data: {'apiKey': apiKey},
        options: _opts,
      );
      return AiSettings.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<AiSettings> removeGeminiKey() async {
    try {
      final res = await _api.dio.delete('/api/user/ai-settings', options: _opts);
      return AiSettings.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }
}
