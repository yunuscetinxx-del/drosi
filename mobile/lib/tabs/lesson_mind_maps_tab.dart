import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../models/mind_map.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/mind_map_editor_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/empty_state.dart';

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
          ? const EmptyState(
              icon: Icons.account_tree_outlined,
              title: 'لا توجد خرائط ذهنية بعد',
              message: 'أنشئ خريطة وحرّك العقد باللمس — تُزامن مع الموقع عند الحفظ.',
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: maps.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final map = maps[i];
                return _MindMapCard(
                  map: map,
                  onTap: () => _open(context, map),
                  onDelete: () => _delete(context, map),
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
          allMaps: lesson.mindMaps,
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
        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 32),
        title: const Text('حذف الخريطة؟'),
        content: Text('سيُحذف «${map.title}» نهائياً.'),
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
      onMindMapsChanged(lesson.mindMaps.where((m) => m.id != map.id).toList());
    }
  }
}

class _MindMapCard extends StatelessWidget {
  const _MindMapCard({
    required this.map,
    required this.onTap,
    required this.onDelete,
  });

  final MindMap map;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.seed, AppTheme.accent],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.account_tree, color: Colors.white),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      map.title.isEmpty ? 'خريطة بدون عنوان' : map.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${map.nodes.length} عقدة',
                      style: TextStyle(
                        fontSize: 13,
                        color: scheme.onSurface.withValues(alpha: 0.55),
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
