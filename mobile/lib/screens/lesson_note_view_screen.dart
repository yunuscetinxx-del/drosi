import 'package:flutter/material.dart';

import '../models/lesson_note.dart';

/// عرض الملاحظة للقراءة — التعديل من زر منفصل.
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
    final content = note.content.trim();

    return Scaffold(
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
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
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
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '${content.length} حرف',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.45),
                      ),
                ),
                const SizedBox(height: 16),
                if (content.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Text(
                      'ملاحظة فارغة — استخدم زر التعديل لإضافة نص',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: scheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  )
                else
                  SelectableText(
                    content,
                    style: const TextStyle(fontSize: 15, height: 1.5),
                  ),
              ],
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit),
                label: const Text('تعديل الملاحظة'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
