import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';

import '../models/lesson.dart';
import '../models/lesson_note.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/lesson_note_editor_screen.dart';
import '../screens/lesson_note_view_screen.dart';
import '../utils/lesson_note_content.dart';
import '../utils/markdown_to_note_html.dart' show extractTitleFromImportedContent;
import '../widgets/app_icons.dart';
import '../widgets/empty_state.dart';

class LessonNotesTab extends StatelessWidget {
  const LessonNotesTab({
    super.key,
    required this.lesson,
    required this.onNotesChanged,
  });

  final Lesson lesson;
  final Future<void> Function(List<LessonNote> notes) onNotesChanged;

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
              icon: Icons.edit_note_rounded,
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
          AppFab(
            heroTag: 'note_paste',
            onPressed: () => _createAndPaste(context),
            icon: Icons.content_paste_rounded,
            label: 'لصق ملاحظة',
            isPrimary: false,
          ),
          const SizedBox(height: 12),
          AppFab(
            heroTag: 'note_add',
            onPressed: () => _create(context),
            icon: Icons.add_circle_rounded,
            label: 'ملاحظة جديدة',
          ),
        ],
      ),
    );
  }

  Future<void> _create(BuildContext context) async {
    final note = LessonItemFactory.lessonNote();
    await onNotesChanged([...lesson.lessonNotes, note]);
    if (!context.mounted) return;
    _edit(context, note);
  }

  Future<void> _createAndPaste(BuildContext context) async {
    final clip = await Clipboard.getData(Clipboard.kTextPlain);
    final pasted = clip?.text?.trim() ?? '';
    final title = pasted.isNotEmpty
        ? extractTitleFromImportedContent(pasted)
        : 'ملاحظة جديدة';
    final note = LessonItemFactory.lessonNote(
      title: title,
      content: pasted,
    );
    final notes = [...lesson.lessonNotes, note];
    await onNotesChanged(notes);
    if (!context.mounted) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => LessonNoteEditorScreen(
          note: note,
          onChanged: (updated) => _replaceNote(context, updated),
        ),
      ),
    );
  }

  Future<void> _replaceNote(BuildContext context, LessonNote updated) async {
    final live = context.read<AppState>().lessonById(lesson.id);
    final base = live?.lessonNotes ?? lesson.lessonNotes;
    await onNotesChanged(
      base.map((n) => n.id == updated.id ? updated : n).toList(),
    );
  }

  void _view(BuildContext context, LessonNote note) {
    Navigator.push(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
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
          onChanged: (updated) => _replaceNote(context, updated),
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, LessonNote note) async {
    final title = note.title.isEmpty ? 'بدون عنوان' : note.title;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: Icon(Icons.delete_rounded, color: Colors.red.shade400, size: 32),
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
      await onNotesChanged(
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
    final t = notePreviewText(text);
    if (t.isEmpty) return 'ملاحظة فارغة — اضغط للعرض';
    return t;
  }

  String _formatDate(DateTime d) {
    final local = d.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final chars = notePreviewText(note.content, max: 100000).length;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const AppIconBadge(icon: Icons.edit_note_rounded),
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
                        AppIcons.schedule(
                          size: 14,
                          color: scheme.onSurface.withValues(alpha: 0.45),
                        ),
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
              const SizedBox(width: 6),
              Column(
                children: [
                  AppActionIcon(
                    tooltip: 'تعديل',
                    icon: Icons.edit_rounded,
                    color: scheme.primary,
                    onPressed: onEdit,
                  ),
                  const SizedBox(height: 6),
                  AppActionIcon(
                    tooltip: 'حذف',
                    icon: Icons.delete_rounded,
                    color: Colors.red.shade400,
                    background: Colors.red.withValues(alpha: 0.1),
                    onPressed: onDelete,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
