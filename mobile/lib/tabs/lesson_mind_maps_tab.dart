import 'package:flutter/material.dart';

import '../models/json_utils.dart';
import '../models/lesson.dart';
import '../models/mind_map.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../screens/mind_map_editor_screen.dart';
import '../theme/app_theme.dart';
import '../widgets/empty_state.dart';

class LessonMindMapsTab extends StatefulWidget {
  const LessonMindMapsTab({
    super.key,
    required this.lesson,
    required this.onMindMapsChanged,
    required this.onFoldersChanged,
  });

  final Lesson lesson;
  final ValueChanged<List<MindMap>> onMindMapsChanged;
  final ValueChanged<List<MindMapFolder>> onFoldersChanged;

  @override
  State<LessonMindMapsTab> createState() => _LessonMindMapsTabState();
}

class _LessonMindMapsTabState extends State<LessonMindMapsTab> {
  final _expanded = <String>{};

  List<MindMap> _mapsInFolder(String? folderId) =>
      widget.lesson.mindMaps.where((m) => m.folderId == folderId).toList();

  void _createFolder() {
    final now = DateTime.now();
    final folder = MindMapFolder(
      id: newId(),
      title: 'مجلد جديد',
      createdAt: now,
      updatedAt: now,
    );
    widget.onFoldersChanged([...widget.lesson.mindMapFolders, folder]);
    setState(() => _expanded.add(folder.id));
  }

  void _createMap({String? folderId}) {
    final map = LessonItemFactory.mindMap();
    if (folderId != null) {
      final updated = MindMap(
        id: map.id,
        title: map.title,
        nodes: map.nodes,
        saved: map.saved,
        folderId: folderId,
        createdAt: map.createdAt,
        updatedAt: map.updatedAt,
      );
      widget.onMindMapsChanged([...widget.lesson.mindMaps, updated]);
      _open(updated);
    } else {
      widget.onMindMapsChanged([...widget.lesson.mindMaps, map]);
      _open(map);
    }
  }

  void _open(MindMap map) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MindMapEditorScreen(
          map: map,
          allMaps: widget.lesson.mindMaps,
          onChanged: (updated) {
            widget.onMindMapsChanged(
              widget.lesson.mindMaps
                  .map((m) => m.id == updated.id ? updated : m)
                  .toList(),
            );
          },
        ),
      ),
    );
  }

  Future<void> _deleteMap(MindMap map) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف الخريطة؟'),
        content: Text('سيُحذف «${map.title}» نهائياً.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok == true) {
      widget.onMindMapsChanged(
        widget.lesson.mindMaps.where((m) => m.id != map.id).toList(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final folders = widget.lesson.mindMapFolders;
    final unfiled = _mapsInFolder(null);
    final hasAny = widget.lesson.mindMaps.isNotEmpty || folders.isNotEmpty;

    return Scaffold(
      body: !hasAny
          ? const EmptyState(
              icon: Icons.account_tree_outlined,
              title: 'لا توجد خرائط ذهنية بعد',
              message: 'أنشئ مجلدات وخرائط — تُزامن مع الموقع عند الحفظ.',
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                ...folders.map((folder) {
                  final maps = _mapsInFolder(folder.id);
                  final open = _expanded.contains(folder.id) || maps.isEmpty;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: ExpansionTile(
                      initiallyExpanded: open,
                      onExpansionChanged: (v) => setState(() {
                        if (v) {
                          _expanded.add(folder.id);
                        } else {
                          _expanded.remove(folder.id);
                        }
                      }),
                      leading: const Icon(Icons.folder_outlined, color: Colors.amber),
                      title: Text(folder.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${maps.length} خرائط'),
                      trailing: IconButton(
                        icon: const Icon(Icons.add, size: 20),
                        onPressed: () => _createMap(folderId: folder.id),
                      ),
                      children: maps.isEmpty
                          ? [
                              const Padding(
                                padding: EdgeInsets.all(12),
                                child: Text('مجلد فارغ — أضف خريطة'),
                              ),
                            ]
                          : maps
                              .map((m) => _MindMapCard(
                                    map: m,
                                    onTap: () => _open(m),
                                    onDelete: () => _deleteMap(m),
                                  ))
                              .toList(),
                    ),
                  );
                }),
                if (unfiled.isNotEmpty) ...[
                  if (folders.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'بدون مجلد',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.6),
                            ),
                      ),
                    ),
                  ...unfiled.map((m) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _MindMapCard(
                          map: m,
                          onTap: () => _open(m),
                          onDelete: () => _deleteMap(m),
                        ),
                      )),
                ],
              ],
            ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FloatingActionButton.small(
            heroTag: 'folder_add',
            onPressed: _createFolder,
            child: const Icon(Icons.create_new_folder_outlined),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'map_add',
            onPressed: () => _createMap(),
            icon: const Icon(Icons.add),
            label: const Text('خريطة جديدة'),
          ),
        ],
      ),
    );
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
