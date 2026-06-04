import 'package:dio/dio.dart';

import '../models/lesson.dart';
import '../models/lesson_image.dart';
import 'api_client.dart';

/// نتيجة تحليل الدرس النصي — مطابقة لمخرجات /api/analyze-lesson.
class LessonAnalysis {
  LessonAnalysis(this.raw);
  final Map<String, dynamic> raw;

  String get difficulty => raw['difficulty']?.toString() ?? '';
  num get difficultyScore =>
      raw['difficultyScore'] is num ? raw['difficultyScore'] as num : 0;
  num get completeness =>
      raw['completeness'] is num ? raw['completeness'] as num : 0;
  String get estimatedStudyTime => raw['estimatedStudyTime']?.toString() ?? '';
  String get summary => raw['summary']?.toString() ?? '';

  List<String> _list(String key) =>
      (raw[key] as List<dynamic>? ?? []).map((e) => e.toString()).toList();

  List<String> get strengths => _list('strengths');
  List<String> get improvements => _list('improvements');
  List<String> get studyTips => _list('studyTips');
  List<String> get relatedTopics => _list('relatedTopics');
  List<String> get mindMapSuggestions => _list('mindMapSuggestions');
}

class AiService {
  final _api = ApiClient.instance;

  /// الذكاء الاصطناعي قد يستغرق وقتاً؛ نمنح مهلة أطول لهذه الطلبات.
  Options get _aiOptions => Options(
        receiveTimeout: const Duration(seconds: 90),
        sendTimeout: const Duration(seconds: 90),
      );

  /// تحليل صورة عبر الخادم. [imageUrl] هو data URL أو رابط عام.
  Future<ImageAIAnalysis> analyzeImage(
    String imageUrl, {
    String? instructions,
  }) async {
    try {
      final res = await _api.dio.post(
        '/api/analyze-image',
        data: {
          'imageUrl': imageUrl,
          if (instructions != null && instructions.trim().isNotEmpty)
            'instructions': instructions.trim(),
        },
        options: _aiOptions,
      );
      final data = res.data as Map<String, dynamic>;
      final analysis = data['analysis'] as Map<String, dynamic>?;
      if (analysis == null) {
        throw Exception('تعذّر تحليل الصورة');
      }
      return ImageAIAnalysis.fromJson({
        ...analysis,
        'analyzedAt': DateTime.now().toIso8601String(),
      });
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  /// تحليل الدرس النصي عبر الخادم.
  Future<LessonAnalysis> analyzeLesson(Lesson lesson) async {
    try {
      final res = await _api.dio.post(
        '/api/analyze-lesson',
        data: {
          'lesson': {
            'title': lesson.title,
            'subject': lesson.subject,
            'description': lesson.description,
            'summary': lesson.summary,
            'keyPoints': lesson.keyPoints,
            'notes': lesson.notes,
          },
        },
        options: _aiOptions,
      );
      final data = res.data as Map<String, dynamic>;
      final analysis = data['analysis'] as Map<String, dynamic>?;
      if (analysis == null) {
        throw Exception('تعذّر تحليل الدرس');
      }
      return LessonAnalysis(analysis);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }
}
