import '../models/json_utils.dart';
import '../models/mind_map.dart';

/// حافظة عُقد الخريطة — تبقى عند الانتقال بين خرائط الدرس.
class MindMapClipboard {
  MindMapClipboard._();

  static List<_ClipEntry> _entries = [];

  static int get count => _entries.length;
  static bool get hasContent => _entries.isNotEmpty;

  static void copy(Iterable<MindMapNode> nodes, Set<String> selectedIds) {
    if (selectedIds.isEmpty) return;
    final list = nodes.toList();
    final expanded = <String>{};
    for (final id in selectedIds) {
      _collectDescendants(list, id, expanded);
    }
    _entries = list
        .where((n) => expanded.contains(n.id))
        .map(
          (n) => _ClipEntry(
            sourceId: n.id,
            text: n.text,
            x: n.x,
            y: n.y,
            parentId: n.parentId,
            color: n.color,
            role: n.role,
            note: n.note,
          ),
        )
        .toList();
  }

  static void _collectDescendants(
    List<MindMapNode> nodes,
    String rootId,
    Set<String> acc,
  ) {
    acc.add(rootId);
    for (final n in nodes) {
      if (n.parentId == rootId && !acc.contains(n.id)) {
        _collectDescendants(nodes, n.id, acc);
      }
    }
  }

  static List<MindMapNode> paste({double offsetX = 48, double offsetY = 48}) {
    if (_entries.isEmpty) return [];

    final sourceIds = _entries.map((e) => e.sourceId).toSet();
    final idMap = <String, String>{
      for (final e in _entries) e.sourceId: newId(),
    };

    final minX = _entries.map((e) => e.x).reduce((a, b) => a < b ? a : b);
    final minY = _entries.map((e) => e.y).reduce((a, b) => a < b ? a : b);
    final anchorX = minX + offsetX;
    final anchorY = minY + offsetY;

    return _entries.map((e) {
      final parentInClip = e.parentId != null && sourceIds.contains(e.parentId)
          ? idMap[e.parentId]
          : null;
      return MindMapNode(
        id: idMap[e.sourceId]!,
        text: e.text,
        x: e.x - minX + anchorX,
        y: e.y - minY + anchorY,
        parentId: parentInClip,
        color: e.color,
        role: e.role,
        note: e.note,
        linkedMapId: null,
        linkedImageId: null,
        linkedWordPageId: null,
        linkedKeyPointIndex: null,
      );
    }).toList();
  }
}

class _ClipEntry {
  _ClipEntry({
    required this.sourceId,
    required this.text,
    required this.x,
    required this.y,
    required this.parentId,
    required this.color,
    this.role,
    this.note,
  });

  final String sourceId;
  final String text;
  final double x;
  final double y;
  final String? parentId;
  final String color;
  final MindMapNodeRole? role;
  final String? note;
}
