import 'package:flutter/material.dart';

import '../models/json_utils.dart';
import '../models/mind_map.dart';
import '../theme/app_theme.dart';
import '../widgets/mind_map_canvas.dart';

class MindMapEditorScreen extends StatefulWidget {
  const MindMapEditorScreen({
    super.key,
    required this.map,
    required this.onChanged,
  });

  final MindMap map;
  final ValueChanged<MindMap> onChanged;

  @override
  State<MindMapEditorScreen> createState() => _MindMapEditorScreenState();
}

class _MindMapEditorScreenState extends State<MindMapEditorScreen> {
  late MindMap _map;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _map = widget.map;
  }

  void _commit() {
    _map.updatedAt = DateTime.now();
    widget.onChanged(_map);
    setState(() {});
  }

  MindMapNode? get _selected {
    if (_selectedId == null) return null;
    for (final n in _map.nodes) {
      if (n.id == _selectedId) return n;
    }
    return null;
  }

  void _addNode({String? parentId}) {
    final parent = parentId == null
        ? null
        : _map.nodes.firstWhere((n) => n.id == parentId);
    final colorIndex = _map.nodes.length % kMindMapNodeColors.length;
    final node = MindMapNode(
      id: newId(),
      text: parentId == null ? 'فكرة رئيسية' : 'فرع',
      x: parent == null ? 140 : parent.x + 180,
      y: parent == null ? 200 : parent.y + (_childCount(parentId!) * 90),
      parentId: parentId,
      color: hexFromColor(kMindMapNodeColors[colorIndex]),
      role: parentId == null ? MindMapNodeRole.main : MindMapNodeRole.branch,
    );
    _map.nodes = [..._map.nodes, node];
    _selectedId = node.id;
    _commit();
  }

  int _childCount(String parentId) =>
      _map.nodes.where((n) => n.parentId == parentId).length;

  void _moveNode(String id, Offset delta) {
    final node = _map.nodes.firstWhere((n) => n.id == id);
    node.x += delta.dx;
    node.y += delta.dy;
    setState(() {}); // تحديث سريع أثناء السحب دون commit لكل إطار
  }

  Future<void> _editNode(MindMapNode node) async {
    final controller = TextEditingController(text: node.text);
    final noteController = TextEditingController(text: node.note ?? '');
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تعديل العقدة'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'النص',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'ملاحظة (اختياري)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            _ColorPicker(
              selected: node.color,
              onPick: (c) => node.color = c,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    if (result == true) {
      node.text = controller.text.trim();
      node.note = noteController.text.trim().isEmpty
          ? null
          : noteController.text.trim();
      _commit();
    }
  }

  void _deleteNode(String id) {
    // حذف العقدة وكل أبنائها.
    final toRemove = <String>{id};
    bool changed = true;
    while (changed) {
      changed = false;
      for (final n in _map.nodes) {
        if (n.parentId != null &&
            toRemove.contains(n.parentId) &&
            !toRemove.contains(n.id)) {
          toRemove.add(n.id);
          changed = true;
        }
      }
    }
    _map.nodes = _map.nodes.where((n) => !toRemove.contains(n.id)).toList();
    if (toRemove.contains(_selectedId)) _selectedId = null;
    _commit();
  }

  void _showNodeMenu(MindMapNode node) {
    showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('تعديل النص واللون'),
              onTap: () {
                Navigator.pop(ctx);
                _editNode(node);
              },
            ),
            ListTile(
              leading: const Icon(Icons.add_circle_outline),
              title: const Text('إضافة فرع'),
              onTap: () {
                Navigator.pop(ctx);
                _addNode(parentId: node.id);
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('حذف العقدة وفروعها'),
              onTap: () {
                Navigator.pop(ctx);
                _deleteNode(node.id);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [AppTheme.seed, AppTheme.accent],
              begin: Alignment.topRight,
              end: Alignment.bottomLeft,
            ),
          ),
        ),
        foregroundColor: Colors.white,
        title: Text(
          _map.title.isEmpty ? 'خريطة ذهنية' : _map.title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            tooltip: 'إعادة تسمية',
            icon: const Icon(Icons.drive_file_rename_outline),
            onPressed: _renameMap,
          ),
        ],
      ),
      body: MindMapCanvas(
        nodes: _map.nodes,
        selectedId: _selectedId,
        onSelect: (id) => setState(() => _selectedId = id),
        onMove: _moveNode,
        onMoveEnd: _commit,
        onTapNode: (node) => setState(() => _selectedId = node.id),
        onMenuNode: _showNodeMenu,
        onTapEmpty: () => setState(() => _selectedId = null),
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (_selected != null) ...[
            FloatingActionButton.small(
              heroTag: 'branch',
              tooltip: 'إضافة فرع',
              onPressed: () => _addNode(parentId: _selected!.id),
              child: const Icon(Icons.add_box),
            ),
            const SizedBox(height: 12),
          ],
          FloatingActionButton.extended(
            heroTag: 'node',
            onPressed: () => _addNode(),
            icon: const Icon(Icons.add),
            label: const Text('عقدة'),
          ),
        ],
      ),
    );
  }

  Future<void> _renameMap() async {
    final controller = TextEditingController(text: _map.title);
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('اسم الخريطة'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    if (value != null && value.isNotEmpty) {
      _map.title = value;
      _commit();
    }
  }
}

class _ColorPicker extends StatefulWidget {
  const _ColorPicker({required this.selected, required this.onPick});
  final String selected;
  final ValueChanged<String> onPick;

  @override
  State<_ColorPicker> createState() => _ColorPickerState();
}

class _ColorPickerState extends State<_ColorPicker> {
  late String _current = widget.selected;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: kMindMapNodeColors.map((argb) {
        final hex = hexFromColor(argb);
        final selected = hex == _current;
        return GestureDetector(
          onTap: () {
            setState(() => _current = hex);
            widget.onPick(hex);
          },
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: Color(argb),
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? Colors.black : Colors.transparent,
                width: 3,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
