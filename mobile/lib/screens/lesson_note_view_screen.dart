import 'package:flutter/material.dart';

import '../models/lesson_note.dart';
import '../utils/lesson_note_content.dart';
import '../widgets/lesson_note_html_view.dart';

/// عرض الملاحظة للقراءة بملء الشاشة — التعديل من زر منفصل.
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
      backgroundColor: scheme.surfaceContainerLowest,
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          IconButton(
            tooltip: 'تعديل',
            icon: const Icon(Icons.edit_outlined),
            onPressed: onEdit,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                    child: Row(
                      children: [
                        Icon(Icons.schedule,
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
                  const SizedBox(height: 8),
                  LessonNoteHtmlView(content: note.content),
                ],
              ),
            ),
          ),
          Material(
            elevation: 6,
            color: scheme.surface,
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: FilledButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit),
                  label: const Text('تعديل الملاحظة'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
