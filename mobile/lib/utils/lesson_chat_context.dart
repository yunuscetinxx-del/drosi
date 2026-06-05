import '../models/chat_source_scope.dart';
import '../models/lesson.dart';
import '../models/lesson_analysis.dart';
import 'lesson_note_content.dart';

String buildChatContextFromLesson(
  Lesson lesson,
  ChatSourceScope scope,
  List<LessonAnalysisEntry> analyses,
) {
  final blocks = <String>[];

  for (final id in scope.analysisIds) {
    for (final a in analyses) {
      if (a.id == id) {
        blocks.add('### سجل تحليل: ${a.title}\n${a.markdownReport.isNotEmpty ? a.markdownReport : a.summary}');
        break;
      }
    }
  }

  for (final id in scope.imageIds) {
    for (final img in lesson.images) {
      if (img.id != id) continue;
      final ai = img.aiAnalysis;
      if (ai != null) {
        blocks.add(
          '### صورة الدرس\n${ai.description}\nعناصر: ${ai.keyElements.join('، ')}\nملاحظات: ${ai.studyNotes.join(' | ')}',
        );
      } else {
        LessonAnalysisEntry? linked;
        for (final a in analyses) {
          if (a.imageId == id) {
            linked = a;
            break;
          }
        }
        if (linked != null) {
          blocks.add('### صورة (تحليل مرتبط)\n${linked.summary}');
        } else {
          blocks.add('### صورة مرفقة\n[صورة من الدرس — اطلب تحليلها إن لزم]');
        }
      }
      break;
    }
  }

  for (final id in scope.noteIds) {
    for (final n in lesson.lessonNotes) {
      if (n.id == id) {
        final plain = notePreviewText(n.content, max: 8000);
        blocks.add('### ملاحظة: ${n.title}\n$plain');
        break;
      }
    }
  }

  for (final id in scope.wordPageIds) {
    for (final p in lesson.wordPages) {
      if (p.id == id) {
        final text = p.content
            .replaceAll(RegExp(r'<[^>]+>'), ' ')
            .trim();
        final clipped = text.length > 4000 ? '${text.substring(0, 4000)}…' : text;
        blocks.add('### صفحة Word: ${p.title}\n$clipped');
        break;
      }
    }
  }

  return blocks.isEmpty ? '' : blocks.join('\n\n---\n\n');
}
