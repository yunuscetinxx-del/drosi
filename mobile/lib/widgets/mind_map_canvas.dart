import 'dart:math' as math;

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
    required this.onConnect,
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
  final void Function(String fromId, String toId) onConnect;

  @override
  State<MindMapCanvas> createState() => MindMapCanvasState();
}

class _ConnectDrag {
  const _ConnectDrag({
    required this.fromId,
    required this.end,
  });

  final String fromId;
  final Offset end;
}

class MindMapCanvasState extends State<MindMapCanvas> {
  final _controller = TransformationController();
  final _canvasKey = GlobalKey();
  static const double canvasSize = 4000;
  Size _viewportSize = Size.zero;
  _ConnectDrag? _connectDrag;
  String? _connectDropTargetId;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _scale => _controller.value.getMaxScaleOnAxis();

  double _nodeHeight(MindMapNode node) {
    var h = mindMapNodeHeight(node);
    if (node.note != null && node.note!.isNotEmpty) h += 56;
    return h;
  }

  Rect _nodeRect(MindMapNode node) =>
      Rect.fromLTWH(node.x, node.y, mindMapNodeWidth(node), _nodeHeight(node));

  Offset _connectHandleCenter(MindMapNode node) {
    final w = mindMapNodeWidth(node);
    final h = mindMapNodeHeight(node);
    return Offset(node.x + w + 10, node.y + h / 2);
  }

  Offset? _globalToCanvas(Offset global) {
    final box = _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null) return null;
    return box.globalToLocal(global);
  }

  MindMapNode? _nodeAt(Offset canvasPos) {
    for (final node in widget.nodes.reversed) {
      if (_nodeRect(node).contains(canvasPos)) return node;
    }
    return null;
  }

  void _updateConnectDrag(Offset canvasPos) {
    final fromId = _connectDrag?.fromId;
    if (fromId == null) return;
    final target = _nodeAt(canvasPos);
    setState(() {
      _connectDrag = _ConnectDrag(fromId: fromId, end: canvasPos);
      _connectDropTargetId =
          target != null && target.id != fromId ? target.id : null;
    });
  }

  MindMapNode? _connectSourceNode() {
    final fromId = _connectDrag?.fromId;
    if (fromId == null) return null;
    for (final node in widget.nodes) {
      if (node.id == fromId) return node;
    }
    return null;
  }

  void _finishConnectDrag(Offset canvasPos) {
    final drag = _connectDrag;
    if (drag == null) return;
    final target = _nodeAt(canvasPos);
    if (target != null && target.id != drag.fromId) {
      widget.onConnect(drag.fromId, target.id);
    }
    setState(() {
      _connectDrag = null;
      _connectDropTargetId = null;
    });
  }

  /// تمركز العرض على عقدة واحدة أو على كل العقد.
  void focusOn({MindMapNode? node}) {
    final targets = node != null ? [node] : widget.nodes;
    if (targets.isEmpty) return;

    var minX = double.infinity;
    var minY = double.infinity;
    var maxX = double.negativeInfinity;
    var maxY = double.negativeInfinity;
    for (final n in targets) {
      final w = mindMapNodeWidth(n);
      var h = mindMapNodeHeight(n);
      if (n.note != null && n.note!.isNotEmpty) h += 52;
      minX = math.min(minX, n.x);
      minY = math.min(minY, n.y);
      maxX = math.max(maxX, n.x + w);
      maxY = math.max(maxY, n.y + h);
    }

    final pad = 100.0;
    final boxW = maxX - minX + pad * 2;
    final boxH = maxY - minY + pad * 2;
    final cx = (minX + maxX) / 2;
    final cy = (minY + maxY) / 2;

    if (_viewportSize.width <= 0 || _viewportSize.height <= 0 || boxW <= 0 || boxH <= 0) {
      return;
    }
    final vw = _viewportSize.width;
    final vh = _viewportSize.height;
    final s = math.min(vw / boxW, vh / boxH).clamp(0.3, 3.0);

    final matrix = Matrix4.identity()
      ..translateByDouble(vw / 2, vh / 2, 0, 1)
      ..scaleByDouble(s, s, 1, 1)
      ..translateByDouble(-cx, -cy, 0, 1);
    _controller.value = matrix;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF12141C) : const Color(0xFFF3F4F8);

    return LayoutBuilder(
      builder: (context, constraints) {
        _viewportSize = Size(constraints.maxWidth, constraints.maxHeight);
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
            key: _canvasKey,
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
                    painter: _ConnectionPainter(
                      widget.nodes,
                      connectDrag: _connectDrag,
                      connectFrom: _connectSourceNode(),
                    ),
                  ),
                ),
                ...widget.nodes.map(_buildNode),
                ...widget.nodes.map(_buildConnectHandle),
              ],
            ),
          ),
        ),
      ),
    );
      },
    );
  }

  Widget _buildNode(MindMapNode node) {
    final isSelected = node.id == widget.selectedId;
    final isDropTarget = node.id == _connectDropTargetId;
    final isConnectSource = node.id == _connectDrag?.fromId;
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
        onPanStart: (_) {
          if (_connectDrag != null) return;
          widget.onSelect(node.id);
        },
        onPanUpdate: (d) {
          if (_connectDrag != null) return;
          widget.onMove(node.id, d.delta / _scale);
        },
        onPanEnd: (_) {
          if (_connectDrag != null) return;
          widget.onMoveEnd();
        },
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
                    color: isDropTarget
                        ? const Color(0xFF8B5CF6)
                        : isSelected || isConnectSource
                            ? Colors.white
                            : Colors.black26,
                    width: isDropTarget || isSelected || isConnectSource ? 3 : 1,
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

  Widget _buildConnectHandle(MindMapNode node) {
    final w = mindMapNodeWidth(node);
    final h = mindMapNodeHeight(node);
    final isSelected = node.id == widget.selectedId;
    final isSource = node.id == _connectDrag?.fromId;

    return Positioned(
      left: node.x + w + 10 - 14,
      top: node.y + h / 2 - 14,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onPanStart: (details) {
          final anchor = _connectHandleCenter(node);
          setState(() {
            _connectDrag = _ConnectDrag(fromId: node.id, end: anchor);
            _connectDropTargetId = null;
          });
          widget.onSelect(node.id);
        },
        onPanUpdate: (details) {
          final local = _globalToCanvas(details.globalPosition);
          if (local != null) _updateConnectDrag(local);
        },
        onPanEnd: (details) {
          final local = _globalToCanvas(details.globalPosition);
          if (local != null) _finishConnectDrag(local);
        },
        onPanCancel: () {
          setState(() {
            _connectDrag = null;
            _connectDropTargetId = null;
          });
        },
        child: SizedBox(
          width: 28,
          height: 28,
          child: Center(
            child: Container(
              width: isSelected || isSource ? 22 : 18,
              height: isSelected || isSource ? 22 : 18,
              decoration: BoxDecoration(
                color: const Color(0xFF8B5CF6),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF8B5CF6).withValues(alpha: 0.45),
                    blurRadius: isSelected || isSource ? 8 : 4,
                  ),
                ],
              ),
              child: const Icon(
                Icons.swap_horiz,
                size: 12,
                color: Colors.white,
              ),
            ),
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
  _ConnectionPainter(
    this.nodes, {
    this.connectDrag,
    this.connectFrom,
  });

  final List<MindMapNode> nodes;
  final _ConnectDrag? connectDrag;
  final MindMapNode? connectFrom;

  void _drawBezier(Canvas canvas, Paint paint, Offset start, Offset end) {
    final path = Path()..moveTo(start.dx, start.dy);
    final midX = (start.dx + end.dx) / 2;
    path.cubicTo(midX, start.dy, midX, end.dy, end.dx, end.dy);
    canvas.drawPath(path, paint);
  }

  Offset _anchor(MindMapNode node) {
    final w = mindMapNodeWidth(node);
    final h = mindMapNodeHeight(node);
    return Offset(node.x + w + 10, node.y + h / 2);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final byId = {for (final n in nodes) n.id: n};
    final paint = Paint()
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    if (connectDrag != null && connectFrom != null) {
      final dragPaint = Paint()
        ..color = const Color(0xFF8B5CF6).withValues(alpha: 0.9)
        ..strokeWidth = 2.5
        ..style = PaintingStyle.stroke;
      _drawBezier(canvas, dragPaint, _anchor(connectFrom!), connectDrag!.end);
    }

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
      _drawBezier(canvas, paint, start, end);
    }
  }

  @override
  bool shouldRepaint(_ConnectionPainter oldDelegate) =>
      oldDelegate.connectDrag != connectDrag ||
      oldDelegate.connectFrom != connectFrom ||
      oldDelegate.nodes != nodes;
}
