import 'package:dio/dio.dart';

import 'api_client.dart';

class LessonShareInfo {
  LessonShareInfo({
    required this.id,
    required this.token,
    required this.permission,
    required this.allowCopy,
    required this.active,
    required this.shareUrl,
    required this.createdAt,
  });

  final String id;
  final String token;
  final String permission;
  final bool allowCopy;
  final bool active;
  final String shareUrl;
  final DateTime createdAt;

  factory LessonShareInfo.fromJson(Map<String, dynamic> json) {
    return LessonShareInfo(
      id: json['id']?.toString() ?? '',
      token: json['token']?.toString() ?? '',
      permission: json['permission']?.toString() ?? 'read',
      allowCopy: json['allowCopy'] == true,
      active: json['active'] == true,
      shareUrl: json['shareUrl']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class ShareService {
  final _api = ApiClient.instance;

  Future<List<LessonShareInfo>> listShares(String lessonId) async {
    try {
      final res = await _api.dio.get('/api/lessons/$lessonId/shares');
      final data = res.data as Map<String, dynamic>;
      final list = data['shares'] as List<dynamic>? ?? [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(LessonShareInfo.fromJson)
          .toList();
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<LessonShareInfo> createShare({
    required String lessonId,
    String permission = 'read',
    bool allowCopy = true,
  }) async {
    try {
      final res = await _api.dio.post(
        '/api/lessons/$lessonId/shares',
        data: {
          'permission': permission,
          'allowCopy': allowCopy,
        },
      );
      final data = res.data as Map<String, dynamic>;
      final share = data['share'] as Map<String, dynamic>? ?? data;
      return LessonShareInfo.fromJson(share);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<void> revokeShare(String shareId) async {
    try {
      await _api.dio.delete('/api/shares/$shareId');
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }
}
