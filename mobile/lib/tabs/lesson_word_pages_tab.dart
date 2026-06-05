import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../models/word_page.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/word_page_editor_screen.dart';
import '../widgets/empty_state.dart';

class LessonWordPagesTab extends StatelessWidget {
  const LessonWordPagesTab({
    super.key,
    required this.lesson,
    required this.onWordPagesChanged,
  });

  final Lesson lesson;
  final ValueChanged<List<WordPage>> onWordPagesChanged;

  @override
  Widget build(BuildContext context) {
    final pages = lesson.wordPages;
    return Scaffold(
      body: pages.isEmpty
          ? const EmptyState(
              icon: Icons.article_outlined,
              title: 'لا توجد صفحات بعد',
              message: 'أنشئ صفحات لكتابة ملاحظات أو نصوص مرتبطة بالدرس.',
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: pages.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final page = pages[i];
                return _WordPageCard(
                  page: page,
                  onTap: () => _open(context, page),
                  onDelete: () => _delete(context, page),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final page = LessonItemFactory.wordPage();
          onWordPagesChanged([...pages, page]);
          _open(context, page);
        },
        icon: const Icon(Icons.add),
        label: const Text('صفحة جديدة'),
      ),
    );
  }

  void _open(BuildContext context, WordPage page) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => WordPageEditorScreen(
          page: page,
          onChanged: (updated) {
            onWordPagesChanged(
              lesson.wordPages
                  .map((p) => p.id == updated.id ? updated : p)
                  .toList(),
            );
          },
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, WordPage page) async {
    final title = page.title.isEmpty ? 'بدون عنوان' : page.title;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 32),
        title: const Text('حذف الصفحة؟'),
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
      onWordPagesChanged(
        lesson.wordPages.where((p) => p.id != page.id).toList(),
      );
    }
  }
}

class _WordPageCard extends StatelessWidget {
  const _WordPageCard({
    required this.page,
    required this.onTap,
    required this.onDelete,
  });

  final WordPage page;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final preview = page.content.trim();

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
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.article_outlined, color: scheme.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      page.title.isEmpty ? 'بدون عنوان' : page.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      preview.isEmpty ? 'صفحة فارغة' : preview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: scheme.onSurface.withValues(alpha: 0.55),
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
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
