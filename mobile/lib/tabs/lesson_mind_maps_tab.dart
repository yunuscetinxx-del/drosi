import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../models/mind_map.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/mind_map_editor_screen.dart';

class LessonMindMapsTab extends StatelessWidget {
  const LessonMindMapsTab({
    super.key,
    required this.lesson,
    required this.onMindMapsChanged,
  });

  final Lesson lesson;
  final ValueChanged<List<MindMap>> onMindMapsChanged;

  @override
  Widget build(BuildContext context) {
    final maps = lesson.mindMaps;
    return Scaffold(
      body: maps.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.account_tree_outlined,
                      size: 64, color: Theme.of(context).disabledColor),
                  const SizedBox(height: 12),
                  const Text('لا توجد خرائط ذهنية بعد'),
                  const SizedBox(height: 4),
                  Text('أنشئ خريطة وحرّكها باللمس',
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: maps.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final map = maps[i];
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      child: Icon(Icons.account_tree_outlined),
                    ),
                    title: Text(
                      map.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Text('${map.nodes.length} عقدة'),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _delete(context, map),
                    ),
                    onTap: () => _open(context, map),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final map = LessonItemFactory.mindMap();
          onMindMapsChanged([...maps, map]);
          _open(context, map);
        },
        icon: const Icon(Icons.add),
        label: const Text('خريطة جديدة'),
      ),
    );
  }

  void _open(BuildContext context, MindMap map) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MindMapEditorScreen(
          map: map,
          onChanged: (updated) {
            onMindMapsChanged(
              lesson.mindMaps
                  .map((m) => m.id == updated.id ? updated : m)
                  .toList(),
            );
          },
        ),
      ),
    );
  }

  Future<void> _delete(BuildContext context, MindMap map) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف الخريطة؟'),
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
      onMindMapsChanged(lesson.mindMaps.where((m) => m.id != map.id).toList());
    }
  }
}
