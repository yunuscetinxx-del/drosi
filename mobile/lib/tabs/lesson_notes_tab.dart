import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/lesson.dart';
import '../models/lesson_note.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/lesson_note_editor_screen.dart';
import '../screens/lesson_note_view_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/empty_state.dart';

class LessonNotesTab extends StatelessWidget {
  const LessonNotesTab({
    super.key,
    required this.lesson,
    required this.onNotesChanged,
  });

  final Lesson lesson;
  final ValueChanged<List<LessonNote>> onNotesChanged;

  List<LessonNote> get _sorted {
    final list = [...lesson.lessonNotes];
    list.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final notes = _sorted;
    return Scaffold(
      body: notes.isEmpty
          ? const EmptyState(
              icon: Icons.sticky_note_2_outlined,
              title: 'لا توجد ملاحظات بعد',
              message:
                  'أنشئ ملاحظات متعددة، الصق نصوصاً طويلة، وافتحها لاحقاً — تُزامن مع الموقع عند الحفظ.',
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: notes.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final note = notes[i];
                return _NoteCard(
                  note: note,
                  onTap: () => _view(context, note),
                  onEdit: () => _edit(context, note),
                  onDelete: () => _delete(context, note),
                );
              },
            ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton.extended(
            heroTag: 'note_paste',
            onPressed: () => _createAndPaste(context),
            icon: const Icon(Icons.content_paste),
            label: const Text('لصق ملاحظة'),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'note_add',
            onPressed: () => _create(context),
            icon: const Icon(Icons.add),
            label: const Text('ملاحظة جديدة'),
          ),
        ],
      ),
    );
  }

  void _create(BuildContext context) {
    final note = LessonItemFactory.lessonNote();
    onNotesChanged([...lesson.lessonNotes, note]);
    _edit(context, note);
  }

  Future<void> _createAndPaste(BuildContext context) async {
    final clip = await Clipboard.getData(Clipboard.kTextPlain);
    final pasted = clip?.text?.trim() ?? '';
    final note = LessonItemFactory.lessonNote(
      title: pasted.isNotEmpty ? 'ملاحظة ملصوقة' : 'ملاحظة جديدة',
      content: pasted,
    );
    onNotesChanged([...lesson.lessonNotes, note]);
    if (!context.mounted) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => LessonNoteEditorScreen(
          note: note,
          onChanged: (updated) {
            onNotesChanged(
              lesson.lessonNotes
                  .map((n) => n.id == updated.id ? updated : n)
                  .toList(),
            );
          },
        ),
      ),
    );
  }

  void _view(BuildContext context, LessonNote note) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (viewCtx) => LessonNoteViewScreen(
          note: note,
          onEdit: () {
            Navigator.pop(viewCtx);
            _edit(context, note);
          },
        ),
      ),
    );
  }

  void _edit(BuildContext context, LessonNote note) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LessonNoteEditorScreen(
          note: note,
          onChanged: (updated) {
            onNotesChanged(
              lesson.lessonNotes
                  .map((n) => n.id == updated.id ? updated : n)
                  .toList(),
            );
          },
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, LessonNote note) async {
    final title = note.title.isEmpty ? 'بدون عنوان' : note.title;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 32),
        title: const Text('حذف الملاحظة؟'),
        content: Text('سيُحذف «$title» نهائياً.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok == true) {
      onNotesChanged(
        lesson.lessonNotes.where((n) => n.id != note.id).toList(),
      );
    }
  }
}

class _NoteCard extends StatelessWidget {
  const _NoteCard({
    required this.note,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  final LessonNote note;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  String _preview(String text) {
    final t = text.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (t.isEmpty) return 'ملاحظة فارغة — اضغط للعرض أو زر التعديل';
    return t.length > 140 ? '${t.substring(0, 140)}…' : t;
  }

  String _formatDate(DateTime d) {
    final local = d.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final chars = note.content.length;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF59E0B), AppTheme.accent],
                    begin: Alignment.topRight,
                    end: Alignment.bottomLeft,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.sticky_note_2, color: Colors.white),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      note.title.isEmpty ? 'بدون عنوان' : note.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _preview(note.content),
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.35,
                        color: scheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.schedule,
                            size: 14,
                            color: scheme.onSurface.withValues(alpha: 0.45)),
                        const SizedBox(width: 4),
                        Text(
                          _formatDate(note.updatedAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurface.withValues(alpha: 0.45),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '$chars حرف',
                          style: TextStyle(
                            fontSize: 12,
                            color: scheme.onSurface.withValues(alpha: 0.45),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'تعديل',
                icon: Icon(Icons.edit_outlined,
                    color: scheme.primary.withValues(alpha: 0.85)),
                onPressed: onEdit,
              ),
              IconButton(
                tooltip: 'حذف',
                icon: Icon(Icons.delete_outline,
                    color: Colors.red.withValues(alpha: 0.7)),
                onPressed: onDelete,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
