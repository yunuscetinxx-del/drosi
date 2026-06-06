import 'package:flutter/material.dart';

import '../models/lesson_note.dart';
import '../utils/lesson_note_content.dart';
import '../widgets/app_icons.dart';
import '../widgets/lesson_note_html_view.dart';

/// عرض الملاحظة للقراءة بملء الشاشة — التعديل من أيقونة القلم في الأعلى.
class LessonNoteViewScreen extends StatelessWidget {
  const LessonNoteViewScreen({
    super.key,
    required this.note,
    required this.onEdit,
  });

  final LessonNote note;
  final VoidCallback onEdit;

  String _formatDate(DateTime d) {
    final local = d.toLocal();
    return '${local.year}/${local.month.toString().padLeft(2, '0')}/${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final title = note.title.trim().isEmpty ? 'بدون عنوان' : note.title;
    final charCount = notePreviewText(note.content, max: 100000).length;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        leading: IconButton(
          tooltip: 'إغلاق',
          icon: AppIcons.close(),
          onPressed: () => Navigator.maybePop(context),
        ),
        automaticallyImplyLeading: false,
        actions: [
          IconButton(
            tooltip: 'تعديل',
            icon: AppIcons.edit(size: AppIcons.md),
            onPressed: onEdit,
          ),
        ],
      ),
      body: MediaQuery.removePadding(
        context: context,
        removeLeft: true,
        removeRight: true,
        child: SingleChildScrollView(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
              child: Row(
                children: [
                  AppIcons.schedule(
                      size: 16,
                      color: scheme.onSurface.withValues(alpha: 0.5)),
                  const SizedBox(width: 6),
                  Text(
                    'آخر تعديل: ${_formatDate(note.updatedAt)}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurface.withValues(alpha: 0.55),
                        ),
                  ),
                  const Spacer(),
                  Text(
                    '$charCount حرف',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurface.withValues(alpha: 0.45),
                        ),
                  ),
                ],
              ),
            ),
            LessonNoteHtmlView(
              content: note.content,
              sheetStyle: false,
              fullWidth: true,
            ),
            SizedBox(height: MediaQuery.paddingOf(context).bottom + 8),
          ],
        ),
      ),
      ),
    );
  }
}
