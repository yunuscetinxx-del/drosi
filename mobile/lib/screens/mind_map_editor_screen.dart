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

  void _addNode({
    String? parentId,
    Offset? at,
    MindMapNodeRole? role,
  }) {
    MindMapNode? parent;
    if (parentId != null) {
      for (final n in _map.nodes) {
        if (n.id == parentId) {
          parent = n;
          break;
        }
      }
    }

    final resolvedRole = role ??
        (parentId != null ? MindMapNodeRole.branch : MindMapNodeRole.main);
    final w =
        resolvedRole == MindMapNodeRole.main ? kMindMapMainW : kMindMapBranchW;
    final h =
        resolvedRole == MindMapNodeRole.main ? kMindMapMainH : kMindMapBranchH;

    double x;
    double y;
    if (at != null) {
      x = at.dx - w / 2;
      y = at.dy - h / 2;
    } else if (parent != null) {
      x = parent.x + 180;
      y = parent.y + (_childCount(parentId!) * 90);
    } else {
      x = 140;
      y = 200 + (_map.nodes.length * 40);
    }

    final colorIndex = _map.nodes.length % kMindMapNodeColors.length;
    final node = MindMapNode(
      id: newId(),
      text: resolvedRole == MindMapNodeRole.main ? 'فكرة رئيسية' : 'فرع',
      x: x,
      y: y,
      parentId: parentId,
      color: hexFromColor(kMindMapNodeColors[colorIndex]),
      role: resolvedRole,
    );
    _map.nodes = [..._map.nodes, node];
    _selectedId = node.id;
    _commit();
  }

  void _addSibling(MindMapNode node) {
    if (node.parentId != null) {
      _addNode(parentId: node.parentId);
    } else {
      _addNode();
    }
  }

  int _childCount(String parentId) =>
      _map.nodes.where((n) => n.parentId == parentId).length;

  void _moveNode(String id, Offset delta) {
    final node = _map.nodes.firstWhere((n) => n.id == id);
    node.x += delta.dx;
    node.y += delta.dy;
    setState(() {});
  }

  Future<void> _editNode(MindMapNode node) async {
    final controller = TextEditingController(text: node.text);
    final noteController = TextEditingController(text: node.note ?? '');
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تعديل العقدة'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                autofocus: true,
                decoration: const InputDecoration(
                  labelText: 'النص',
                  prefixIcon: Icon(Icons.title),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'ملاحظة (اختياري)',
                  prefixIcon: Icon(Icons.sticky_note_2_outlined),
                ),
              ),
              const SizedBox(height: 12),
              _ColorPicker(
                selected: node.color,
                onPick: (c) => node.color = c,
              ),
            ],
          ),
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
      node.text = controller.text.trim().isEmpty ? node.text : controller.text.trim();
      node.note = noteController.text.trim().isEmpty
          ? null
          : noteController.text.trim();
      _commit();
    }
  }

  void _setNodeColor(MindMapNode node, String hex) {
    node.color = hex;
    _commit();
  }

  void _deleteNode(String id) {
    final toRemove = <String>{id};
    var changed = true;
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
    setState(() => _selectedId = node.id);
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(
                node.text,
                style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            ListTile(
              leading: const Icon(Icons.edit, color: Colors.blue),
              title: const Text('تعديل النص'),
              subtitle: const Text('أو ضغطتين سريعتين على العقدة'),
              onTap: () {
                Navigator.pop(ctx);
                _editNode(node);
              },
            ),
            ListTile(
              leading: const Icon(Icons.add_circle_outline, color: Colors.green),
              title: const Text('إضافة فرع'),
              onTap: () {
                Navigator.pop(ctx);
                _addNode(parentId: node.id);
              },
            ),
            if (node.parentId != null)
              ListTile(
                leading: const Icon(Icons.add, color: Colors.teal),
                title: const Text('إضافة عقدة شقيقة'),
                onTap: () {
                  Navigator.pop(ctx);
                  _addSibling(node);
                },
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'لون العقدة',
                  style: Theme.of(ctx).textTheme.labelMedium,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: _ColorPicker(
                selected: node.color,
                onPick: (hex) {
                  _setNodeColor(node, hex);
                  Navigator.pop(ctx);
                },
              ),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('حذف العقدة وفروعها', style: TextStyle(color: Colors.red)),
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

  void _showCanvasMenu(Offset position) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.star_outline, color: Colors.amber),
              title: const Text('إضافة فكرة رئيسية هنا'),
              onTap: () {
                Navigator.pop(ctx);
                _addNode(at: position);
              },
            ),
            ListTile(
              leading: const Icon(Icons.account_tree_outlined),
              title: const Text('إضافة فرع منفصل هنا'),
              onTap: () {
                Navigator.pop(ctx);
                _addNode(at: position, role: MindMapNodeRole.branch);
              },
            ),
            if (_selected != null)
              ListTile(
                leading: const Icon(Icons.add_box_outlined, color: Colors.green),
                title: Text('إضافة فرع لـ «${_selected!.text}»'),
                onTap: () {
                  Navigator.pop(ctx);
                  _addNode(parentId: _selected!.id);
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
      body: Stack(
        children: [
          MindMapCanvas(
            nodes: _map.nodes,
            selectedId: _selectedId,
            onSelect: (id) => setState(() => _selectedId = id),
            onMove: _moveNode,
            onMoveEnd: _commit,
            onTapNode: (node) => setState(() => _selectedId = node.id),
            onDoubleTapNode: _editNode,
            onMenuNode: _showNodeMenu,
            onTapEmpty: () => setState(() => _selectedId = null),
            onLongPressEmpty: _showCanvasMenu,
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: IgnorePointer(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  'ضغطتان = تعديل • ضغطة مطولة على العقدة = قائمة • على الخلفية = إضافة',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: _selected != null
          ? FloatingActionButton.extended(
              heroTag: 'branch',
              onPressed: () => _addNode(parentId: _selected!.id),
              icon: const Icon(Icons.add_box),
              label: const Text('فرع'),
            )
          : FloatingActionButton.extended(
              heroTag: 'node',
              onPressed: () => _addNode(),
              icon: const Icon(Icons.add),
              label: const Text('فكرة رئيسية'),
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
      spacing: 10,
      runSpacing: 10,
      children: kMindMapNodeColors.map((argb) {
        final hex = hexFromColor(argb);
        final selected = hex == _current;
        return GestureDetector(
          onTap: () {
            setState(() => _current = hex);
            widget.onPick(hex);
          },
          child: Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: Color(argb),
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent,
                width: 3,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
