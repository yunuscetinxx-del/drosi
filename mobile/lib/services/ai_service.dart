import 'package:dio/dio.dart';

import '../models/lesson.dart';
import '../models/lesson_analysis.dart';
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

  Options get _aiOptions => Options(
        receiveTimeout: const Duration(seconds: 120),
        sendTimeout: const Duration(seconds: 120),
      );

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
          'mode': 'general',
        },
        options: _aiOptions,
      );
      final data = res.data as Map<String, dynamic>;
      final analysis = data['analysis'] as Map<String, dynamic>?;
      if (analysis == null) throw Exception('تعذّر تحليل الصورة');
      return ImageAIAnalysis.fromJson({
        ...analysis,
        'analyzedAt': DateTime.now().toIso8601String(),
      });
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  /// تحليل صفحة كتاب مدرسي — وضع school مع ملف تعلّم المستخدم.
  Future<Map<String, dynamic>> analyzeSchoolPage(
    String imageUrl, {
    String? instructions,
    String? subject,
    String? level,
    String subjectMode = 'auto',
    String? lessonTitle,
    String? lessonSubject,
  }) async {
    try {
      final res = await _api.dio.post(
        '/api/analyze-image',
        data: {
          'imageUrl': imageUrl,
          'mode': 'school',
          if (instructions != null && instructions.trim().isNotEmpty)
            'instructions': instructions.trim(),
          if (subject != null && subject.trim().isNotEmpty) 'subject': subject.trim(),
          if (level != null && level.trim().isNotEmpty) 'level': level.trim(),
          'subjectMode': subjectMode,
          if (lessonTitle != null) 'lessonTitle': lessonTitle,
          if (lessonSubject != null) 'lessonSubject': lessonSubject,
        },
        options: _aiOptions,
      );
      final data = res.data as Map<String, dynamic>;
      final content = data['content'] as Map<String, dynamic>? ?? {};
      final analysis = data['analysis'] as Map<String, dynamic>? ?? {};

      final detectedSubject =
          content['detectedSubject']?.toString() ?? lessonSubject ?? subject ?? 'عام';
      final summary = content['summary']?.toString() ??
          content['description']?.toString() ??
          '';
      final title = '$detectedSubject — ${content['pageType'] ?? 'صفحة درس'}';

      return {
        'title': title,
        'subject': detectedSubject,
        'level': content['detectedLevel']?.toString() ?? level,
        'summary': summary,
        'content': content,
        'markdown': _buildMarkdown(title, detectedSubject, content, analysis),
      };
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

  String _buildMarkdown(
    String title,
    String subject,
    Map<String, dynamic> content,
    Map<String, dynamic> raw,
  ) {
    final buf = StringBuffer('# $title\n\n**المادة:** $subject\n\n');
    if (content['summary'] != null) buf.writeln('${content['summary']}\n');
    if (content['description'] != null) buf.writeln('## الوصف\n${content['description']}\n');

    final grammar = content['grammarTopics'] as List<dynamic>? ?? [];
    if (grammar.isNotEmpty) {
      buf.writeln('## القواعد / المفاهيم');
      for (final g in grammar) buf.writeln('- $g');
      buf.writeln();
    }

    final exercises = content['exercises'] as List<dynamic>? ?? [];
    if (exercises.isNotEmpty) {
      buf.writeln('## التمارين');
      for (final ex in exercises) {
        if (ex is! Map) continue;
        buf.writeln('### تمرين ${ex['number']}: ${ex['title']}');
        buf.writeln('${ex['explanation'] ?? ''}\n');
      }
    }

    final notes = content['studyNotes'] as List<dynamic>? ?? raw['studyNotes'] as List<dynamic>? ?? [];
    if (notes.isNotEmpty) {
      buf.writeln('## ملاحظات دراسية');
      for (final n in notes) buf.writeln('- $n');
    }
    return buf.toString();
  }

  Future<String> lessonChat({
    required String message,
    required String lessonId,
    required String lessonTitle,
    required String lessonSubject,
    String? analysisId,
    String? contextText,
    required List<LessonAnalysisEntry> analyses,
    required List<Map<String, String>> previousMessages,
  }) async {
    try {
      final res = await _api.dio.post(
        '/api/lesson-chat',
        data: {
          'message': message,
          'lessonId': lessonId,
          'lessonTitle': lessonTitle,
          'lessonSubject': lessonSubject,
          if (analysisId != null) 'analysisId': analysisId,
          if (contextText != null && contextText.trim().isNotEmpty)
            'contextText': contextText.trim(),
          'analyses': analyses
              .map((a) => {
                    'id': a.id,
                    'title': a.title,
                    'summary': a.summary,
                    'markdownReport': a.markdownReport,
                    'subject': a.subject,
                    'content': a.content,
                  })
              .toList(),
          'previousMessages': previousMessages,
        },
        options: _aiOptions,
      );
      final data = res.data as Map<String, dynamic>;
      final reply = data['reply']?.toString();
      if (reply == null || reply.isEmpty) throw Exception('تعذّر الحصول على إجابة');
      return reply;
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }

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
      if (analysis == null) throw Exception('تعذّر تحليل الدرس');
      return LessonAnalysis(analysis);
    } on DioException catch (e) {
      throw Exception(_api.errorMessage(e));
    }
  }
}
