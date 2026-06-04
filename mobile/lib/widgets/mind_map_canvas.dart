import 'package:flutter/material.dart';

import '../models/mind_map.dart';

/// أبعاد العقد — مطابقة لـ lib/mind-map-node.ts.
const double _mainW = 168;
const double _mainH = 52;
const double _branchW = 124;
const double _branchH = 38;

double _nodeWidth(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? _mainW : _branchW;
double _nodeHeight(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? _mainH : _branchH;

/// لوحة الخريطة الذهنية: تكبير/تصغير + تحريك اللوحة + سحب العُقد باللمس.
class MindMapCanvas extends StatefulWidget {
  const MindMapCanvas({
    super.key,
    required this.nodes,
    required this.selectedId,
    required this.onSelect,
    required this.onMove,
    required this.onMoveEnd,
    required this.onTapNode,
    required this.onMenuNode,
    required this.onTapEmpty,
  });

  final List<MindMapNode> nodes;
  final String? selectedId;
  final ValueChanged<String> onSelect;
  final void Function(String id, Offset delta) onMove;
  final VoidCallback onMoveEnd;
  final ValueChanged<MindMapNode> onTapNode;
  final ValueChanged<MindMapNode> onMenuNode;
  final VoidCallback onTapEmpty;

  @override
  State<MindMapCanvas> createState() => _MindMapCanvasState();
}

class _MindMapCanvasState extends State<MindMapCanvas> {
  final _controller = TransformationController();
  static const double _canvasSize = 4000;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _scale => _controller.value.getMaxScaleOnAxis();

  @override
  Widget build(BuildContext context) {
    return InteractiveViewer(
      transformationController: _controller,
      minScale: 0.3,
      maxScale: 3,
      boundaryMargin: const EdgeInsets.all(800),
      constrained: false,
      child: GestureDetector(
        onTap: widget.onTapEmpty,
        child: SizedBox(
          width: _canvasSize,
          height: _canvasSize,
          child: Stack(
            children: [
              // خطوط الربط بين العُقد.
              Positioned.fill(
                child: CustomPaint(
                  painter: _ConnectionPainter(widget.nodes),
                ),
              ),
              // العُقد نفسها.
              ...widget.nodes.map(_buildNode),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNode(MindMapNode node) {
    final isSelected = node.id == widget.selectedId;
    final w = _nodeWidth(node);
    final isMain = node.resolvedRole == MindMapNodeRole.main;
    final color = Color(colorFromHex(node.color));

    return Positioned(
      left: node.x,
      top: node.y,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => widget.onTapNode(node),
        onLongPress: () => widget.onMenuNode(node),
        onPanStart: (_) => widget.onSelect(node.id),
        onPanUpdate: (d) {
          // قسمة على مقياس التكبير لتطابق الحركة مع الإصبع.
          widget.onMove(node.id, d.delta / _scale);
        },
        onPanEnd: (_) => widget.onMoveEnd(),
        child: SizedBox(
          width: w,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: w,
                height: _nodeHeight(node),
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius:
                      BorderRadius.circular(isMain ? _mainH / 2 : 8),
                  border: Border.all(
                    color: isSelected ? Colors.white : Colors.black26,
                    width: isSelected ? 3 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.4),
                      blurRadius: isSelected ? 16 : 6,
                      spreadRadius: isSelected ? 1 : 0,
                    ),
                  ],
                ),
                child: Text(
                  node.text,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: isMain ? FontWeight.bold : FontWeight.w500,
                    fontSize: isMain ? 14 : 12,
                  ),
                ),
              ),
              if (node.note != null && node.note!.isNotEmpty)
                Container(
                  width: w,
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: color.withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    node.note!,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, color: Colors.black87),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConnectionPainter extends CustomPainter {
  _ConnectionPainter(this.nodes);
  final List<MindMapNode> nodes;

  @override
  void paint(Canvas canvas, Size size) {
    final byId = {for (final n in nodes) n.id: n};
    final paint = Paint()
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    for (final node in nodes) {
      final parentId = node.parentId;
      if (parentId == null) continue;
      final parent = byId[parentId];
      if (parent == null) continue;

      final start = Offset(
        parent.x + _nodeWidth(parent) / 2,
        parent.y + _nodeHeight(parent) / 2,
      );
      final end = Offset(
        node.x + _nodeWidth(node) / 2,
        node.y + _nodeHeight(node) / 2,
      );

      paint.color = Color(colorFromHex(node.color)).withValues(alpha: 0.6);

      // منحنى بيزييه ناعم بين الأب والابن.
      final path = Path()..moveTo(start.dx, start.dy);
      final midX = (start.dx + end.dx) / 2;
      path.cubicTo(midX, start.dy, midX, end.dy, end.dx, end.dy);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_ConnectionPainter oldDelegate) => true;
}
