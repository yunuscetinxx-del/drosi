import 'package:dio/dio.dart';

import '../models/lesson.dart';
import '../models/json_utils.dart';
import 'api_client.dart';

class LessonsService {
  final _api = ApiClient.instance;

  Future<List<Lesson>> fetchLessons() async {
    try {
      final res = await _api.dio.get('/api/lessons');
      final data = res.data as Map<String, dynamic>;
      final list = data['lessons'] as List<dynamic>? ?? [];
      return list
          .whereType<Map<String, dynamic>>()
          .map(Lesson.fromJson)
          .toList();
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Future<void> saveLessons(List<Lesson> lessons) async {
    try {
      await _api.dio.put(
        '/api/lessons',
        data: {'lessons': lessons.map((l) => l.toJson()).toList()},
      );
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  Lesson createLesson({
    required String title,
    required String subject,
    required String description,
  }) {
    final now = DateTime.now();
    return Lesson(
      id: newId(),
      title: title,
      subject: subject,
      description: description,
      summary: '',
      keyPoints: [],
      notes: '',
      images: [],
      wordPages: [],
      mindMaps: [],
      mindMapFolders: [],
      createdAt: now,
      updatedAt: now,
    );
  }
}
