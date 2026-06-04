import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../models/word_page.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/word_page_editor_screen.dart';

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
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.post_add,
                      size: 64, color: Theme.of(context).disabledColor),
                  const SizedBox(height: 12),
                  const Text('لا توجد صفحات بعد'),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: pages.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final page = pages[i];
                final preview = page.content.trim();
                return Card(
                  child: ListTile(
                    leading: const Icon(Icons.article_outlined),
                    title: Text(
                      page.title.isEmpty ? 'بدون عنوان' : page.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text(
                      preview.isEmpty ? 'صفحة فارغة' : preview,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _delete(context, page),
                    ),
                    onTap: () => _open(context, page),
                  ),
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
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف الصفحة؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
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
