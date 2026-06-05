import 'package:flutter/material.dart';

import '../models/json_utils.dart';
import '../models/mind_map.dart';
import '../theme/app_theme.dart';
import '../utils/mind_map_clipboard.dart';
import '../widgets/mind_map_canvas.dart';

class MindMapEditorScreen extends StatefulWidget {
  const MindMapEditorScreen({
    super.key,
    required this.map,
    required this.allMaps,
    required this.onChanged,
  });

  final MindMap map;
  final List<MindMap> allMaps;
  final ValueChanged<MindMap> onChanged;

  @override
  State<MindMapEditorScreen> createState() => _MindMapEditorScreenState();
}

class _MindMapEditorScreenState extends State<MindMapEditorScreen> {
  final _canvasKey = GlobalKey<MindMapCanvasState>();
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

  bool _wouldCreateCycle(String fromId, String toId) {
    if (fromId == toId) return true;
    final byId = {for (final n in _map.nodes) n.id: n};
    var cur = fromId;
    while (true) {
      final parentId = byId[cur]?.parentId;
      if (parentId == null) return false;
      if (parentId == toId) return true;
      cur = parentId;
    }
  }

  void _connectNodes(String fromId, String toId) {
    if (_wouldCreateCycle(fromId, toId)) return;
    final idx = _map.nodes.indexWhere((n) => n.id == toId);
    if (idx == -1) return;
    _map.nodes[idx].parentId = fromId;
    if (_map.nodes[idx].role != MindMapNodeRole.main) {
      _map.nodes[idx].role = MindMapNodeRole.branch;
    }
    _commit();
  }

  void _unlinkNode(String nodeId) {
    final node = _map.nodes.firstWhere((n) => n.id == nodeId);
    if (node.parentId == null) return;
    node.parentId = null;
    _commit();
  }

  void _setNodeRole(MindMapNode node, MindMapNodeRole role) {
    node.role = role;
    if (role == MindMapNodeRole.main) {
      node.parentId = null;
    }
    _commit();
  }

  void _linkMap(MindMapNode node, String? mapId) {
    node.linkedMapId = mapId;
    _commit();
  }

  void _openLinkedMap(String mapId) {
    MindMap? target;
    for (final m in widget.allMaps) {
      if (m.id == mapId) {
        target = m;
        break;
      }
    }
    if (target == null) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => MindMapEditorScreen(
          map: target!,
          allMaps: widget.allMaps,
          onChanged: widget.onChanged,
        ),
      ),
    );
  }

  Future<void> _pickLinkedMap(MindMapNode node) async {
    final others = widget.allMaps.where((m) => m.id != _map.id).toList();
    if (others.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('أنشئ خريطة أخرى في الدرس أولاً')),
      );
      return;
    }

    final picked = await showModalBottomSheet<String?>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text(
                'ربط العقدة بخريطة',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            if (node.linkedMapId != null)
              ListTile(
                leading: const Icon(Icons.link_off, color: Colors.orange),
                title: const Text('إلغاء الربط'),
                onTap: () => Navigator.pop(ctx, ''),
              ),
            ...others.map(
              (m) => ListTile(
                leading: Icon(
                  Icons.account_tree,
                  color: m.id == node.linkedMapId
                      ? const Color(0xFF10B981)
                      : null,
                ),
                title: Text(m.title.isEmpty ? 'خريطة بدون عنوان' : m.title),
                subtitle: Text('${m.nodes.length} عقدة'),
                trailing: m.id == node.linkedMapId
                    ? const Icon(Icons.check, color: Color(0xFF10B981))
                    : null,
                onTap: () => Navigator.pop(ctx, m.id),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (!mounted || picked == null) return;
    _linkMap(node, picked.isEmpty ? null : picked);
  }

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
                maxLines: 3,
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
      node.text =
          controller.text.trim().isEmpty ? node.text : controller.text.trim();
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

  void _copySelection({String? nodeId}) {
    final ids = <String>{};
    if (_selectedId != null) {
      ids.add(_selectedId!);
    } else if (nodeId != null) {
      ids.add(nodeId);
    }
    if (ids.isEmpty) return;
    MindMapClipboard.copy(_map.nodes, ids);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم نسخ ${MindMapClipboard.count} عقدة — انتقل لخريطة أخرى والصق'),
        duration: const Duration(seconds: 2),
      ),
    );
    setState(() {});
  }

  void _pasteNodes() {
    if (!MindMapClipboard.hasContent) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لا يوجد عُقد منسوخة')),
      );
      return;
    }
    final pasted = MindMapClipboard.paste();
    if (pasted.isEmpty) return;
    _map.nodes = [..._map.nodes, ...pasted];
    _selectedId = pasted.first.id;
    _commit();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم لصق ${pasted.length} عقدة'),
        duration: const Duration(seconds: 2),
      ),
    );
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
    String? linkedTitle;
    if (node.linkedMapId != null) {
      for (final m in widget.allMaps) {
        if (m.id == node.linkedMapId) {
          linkedTitle = m.title;
          break;
        }
      }
    }

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
              leading: const Icon(Icons.copy, color: Colors.lightBlue),
              title: const Text('نسخ العقدة والفروع'),
              subtitle: const Text('يُلصق في خريطة أخرى'),
              onTap: () {
                Navigator.pop(ctx);
                _copySelection(nodeId: node.id);
              },
            ),
            if (MindMapClipboard.hasContent)
              ListTile(
                leading: const Icon(Icons.content_paste, color: Colors.green),
                title: Text('لصق (${MindMapClipboard.count} عقدة)'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pasteNodes();
                },
              ),
            ListTile(
              leading: const Icon(Icons.center_focus_strong, color: Colors.blue),
              title: const Text('تركيز على العقدة'),
              onTap: () {
                Navigator.pop(ctx);
                _canvasKey.currentState?.focusOn(node: node);
              },
            ),
            ListTile(
              leading: const Icon(Icons.edit, color: Colors.blue),
              title: const Text('تعديل النص والملاحظة'),
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
            if (node.parentId != null)
              ListTile(
                leading: const Icon(Icons.link_off, color: Colors.orange),
                title: const Text('فك الربط من العقدة الأم'),
                onTap: () {
                  Navigator.pop(ctx);
                  _unlinkNode(node.id);
                },
              ),
            ListTile(
              leading: const Icon(Icons.account_tree_outlined,
                  color: Color(0xFF10B981)),
              title: Text(
                node.linkedMapId != null
                    ? 'تغيير الخريطة المرتبطة'
                    : 'ربط بخريطة أخرى',
              ),
              subtitle: linkedTitle != null && linkedTitle.isNotEmpty
                  ? Text(linkedTitle)
                  : null,
              onTap: () {
                Navigator.pop(ctx);
                _pickLinkedMap(node);
              },
            ),
            if (node.linkedMapId != null)
              ListTile(
                leading: const Icon(Icons.open_in_new, color: Colors.green),
                title: const Text('الانتقال للخريطة المرتبطة'),
                onTap: () {
                  Navigator.pop(ctx);
                  _openLinkedMap(node.linkedMapId!);
                },
              ),
            ListTile(
              leading: const Icon(Icons.star_outline, color: Colors.amber),
              title: const Text('تعيين كقسم رئيسي'),
              onTap: () {
                Navigator.pop(ctx);
                _setNodeRole(node, MindMapNodeRole.main);
              },
            ),
            ListTile(
              leading: const Icon(Icons.call_split, color: Colors.indigo),
              title: const Text('تعيين كفرع'),
              onTap: () {
                Navigator.pop(ctx);
                _setNodeRole(node, MindMapNodeRole.branch);
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
              title: const Text('حذف العقدة وفروعها',
                  style: TextStyle(color: Colors.red)),
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
              leading: const Icon(Icons.fit_screen),
              title: const Text('عرض كل العقد'),
              onTap: () {
                Navigator.pop(ctx);
                _canvasKey.currentState?.focusOn();
              },
            ),
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
            if (MindMapClipboard.hasContent)
              ListTile(
                leading: const Icon(Icons.content_paste, color: Colors.green),
                title: Text('لصق (${MindMapClipboard.count} عقدة)'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pasteNodes();
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
          if (MindMapClipboard.hasContent)
            IconButton(
              tooltip: 'لصق ${MindMapClipboard.count} عقدة',
              icon: const Icon(Icons.content_paste),
              onPressed: _pasteNodes,
            ),
          IconButton(
            tooltip: 'نسخ المحدد',
            icon: const Icon(Icons.copy),
            onPressed: _selectedId != null ? () => _copySelection() : null,
          ),
          IconButton(
            tooltip: 'تكبير',
            icon: const Icon(Icons.zoom_in),
            onPressed: () => _canvasKey.currentState?.zoomIn(),
          ),
          IconButton(
            tooltip: 'تصغير',
            icon: const Icon(Icons.zoom_out),
            onPressed: () => _canvasKey.currentState?.zoomOut(),
          ),
          IconButton(
            tooltip: 'تركيز',
            icon: const Icon(Icons.center_focus_strong),
            onPressed: () {
              if (_selected != null) {
                _canvasKey.currentState?.focusOn(node: _selected);
              } else {
                _canvasKey.currentState?.focusOn();
              }
            },
          ),
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
            key: _canvasKey,
            nodes: _map.nodes,
            selectedId: _selectedId,
            allMaps: widget.allMaps,
            onSelect: (id) => setState(() => _selectedId = id),
            onMove: _moveNode,
            onMoveEnd: _commit,
            onTapNode: (node) => setState(() => _selectedId = node.id),
            onDoubleTapNode: _editNode,
            onMenuNode: _showNodeMenu,
            onTapEmpty: () => setState(() => _selectedId = null),
            onLongPressEmpty: _showCanvasMenu,
            onConnect: _connectNodes,
            onUnlink: _unlinkNode,
            onDelete: _deleteNode,
            onAddChild: (id) => _addNode(parentId: id),
            onEdit: _editNode,
            onFocusNode: (node) => _canvasKey.currentState?.focusOn(node: node),
            onNavigateToMap: _openLinkedMap,
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: IgnorePointer(
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context)
                      .colorScheme
                      .surface
                      .withValues(alpha: 0.92),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
                  ),
                ),
                child: Text(
                  'اختر عقدة لإظهار الأزرار • ↔ ربط • ⊙ تركيز • ↗ انتقال • − فك الربط على الخط',
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
                color: selected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.transparent,
                width: 3,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
