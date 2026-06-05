import 'package:flutter/material.dart';

import '../models/mind_map.dart';

/// أبعاد العقد — مطابقة لـ lib/mind-map-node.ts.
const double kMindMapMainW = 168;
const double kMindMapMainH = 52;
const double kMindMapBranchW = 124;
const double kMindMapBranchH = 38;

double mindMapNodeWidth(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? kMindMapMainW : kMindMapBranchW;
double mindMapNodeHeight(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? kMindMapMainH : kMindMapBranchH;

/// لوحة الخريطة الذهنية: خلفية منقّطة، تكبير/تصغير، سحب العُقد.
class MindMapCanvas extends StatefulWidget {
  const MindMapCanvas({
    super.key,
    required this.nodes,
    required this.selectedId,
    required this.onSelect,
    required this.onMove,
    required this.onMoveEnd,
    required this.onTapNode,
    required this.onDoubleTapNode,
    required this.onMenuNode,
    required this.onTapEmpty,
    required this.onLongPressEmpty,
  });

  final List<MindMapNode> nodes;
  final String? selectedId;
  final ValueChanged<String> onSelect;
  final void Function(String id, Offset delta) onMove;
  final VoidCallback onMoveEnd;
  final ValueChanged<MindMapNode> onTapNode;
  final ValueChanged<MindMapNode> onDoubleTapNode;
  final ValueChanged<MindMapNode> onMenuNode;
  final VoidCallback onTapEmpty;
  final ValueChanged<Offset> onLongPressEmpty;

  @override
  State<MindMapCanvas> createState() => _MindMapCanvasState();
}

class _MindMapCanvasState extends State<MindMapCanvas> {
  final _controller = TransformationController();
  static const double canvasSize = 4000;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _scale => _controller.value.getMaxScaleOnAxis();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF12141C) : const Color(0xFFF3F4F8);

    return InteractiveViewer(
      transformationController: _controller,
      minScale: 0.3,
      maxScale: 3,
      boundaryMargin: const EdgeInsets.all(800),
      constrained: false,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: widget.onTapEmpty,
        onLongPressStart: (d) => widget.onLongPressEmpty(d.localPosition),
        child: ColoredBox(
          color: bg,
          child: SizedBox(
            width: canvasSize,
            height: canvasSize,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _DotGridPainter(isDark: isDark),
                  ),
                ),
                Positioned.fill(
                  child: CustomPaint(
                    painter: _ConnectionPainter(widget.nodes),
                  ),
                ),
                ...widget.nodes.map(_buildNode),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNode(MindMapNode node) {
    final isSelected = node.id == widget.selectedId;
    final w = mindMapNodeWidth(node);
    final isMain = node.resolvedRole == MindMapNodeRole.main;
    final color = Color(colorFromHex(node.color));

    return Positioned(
      left: node.x,
      top: node.y,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => widget.onTapNode(node),
        onDoubleTap: () => widget.onDoubleTapNode(node),
        onLongPress: () => widget.onMenuNode(node),
        onPanStart: (_) => widget.onSelect(node.id),
        onPanUpdate: (d) {
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
                height: mindMapNodeHeight(node),
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius:
                      BorderRadius.circular(isMain ? kMindMapMainH / 2 : 8),
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

/// شبكة نقاط مثل الموقع (نقاط صغيرة كل 24px + أكبر كل 96px).
class _DotGridPainter extends CustomPainter {
  _DotGridPainter({required this.isDark});
  final bool isDark;

  static const _smallStep = 24.0;
  static const _largeStep = 96.0;

  @override
  void paint(Canvas canvas, Size size) {
    final small = Paint()
      ..color = isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.06)
      ..style = PaintingStyle.fill;
    final large = Paint()
      ..color = isDark ? Colors.white.withValues(alpha: 0.14) : Colors.black.withValues(alpha: 0.1)
      ..style = PaintingStyle.fill;

    for (var x = _smallStep / 2; x < size.width; x += _smallStep) {
      for (var y = _smallStep / 2; y < size.height; y += _smallStep) {
        canvas.drawCircle(Offset(x, y), 0.8, small);
      }
    }
    for (var x = _largeStep / 2; x < size.width; x += _largeStep) {
      for (var y = _largeStep / 2; y < size.height; y += _largeStep) {
        canvas.drawCircle(Offset(x, y), 1.5, large);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DotGridPainter old) => old.isDark != isDark;
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
        parent.x + mindMapNodeWidth(parent) / 2,
        parent.y + mindMapNodeHeight(parent) / 2,
      );
      final end = Offset(
        node.x + mindMapNodeWidth(node) / 2,
        node.y + mindMapNodeHeight(node) / 2,
      );

      paint.color = Color(colorFromHex(node.color)).withValues(alpha: 0.6);

      final path = Path()..moveTo(start.dx, start.dy);
      final midX = (start.dx + end.dx) / 2;
      path.cubicTo(midX, start.dy, midX, end.dy, end.dx, end.dy);
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_ConnectionPainter oldDelegate) => true;
}
