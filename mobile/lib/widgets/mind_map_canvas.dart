import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models/mind_map.dart';
import 'mind_map_node_button.dart';

/// أبعاد العقد — مطابقة لـ lib/mind-map-node.ts.
const double kMindMapMainW = 168;
const double kMindMapMainH = 52;
const double kMindMapBranchW = 124;
const double kMindMapBranchH = 38;

double mindMapNodeWidth(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? kMindMapMainW : kMindMapBranchW;
double mindMapNodeHeight(MindMapNode n) =>
    n.resolvedRole == MindMapNodeRole.main ? kMindMapMainH : kMindMapBranchH;

Offset mindMapNodeAnchor(MindMapNode node) {
  final w = mindMapNodeWidth(node);
  final h = mindMapNodeHeight(node);
  return Offset(node.x + w / 2, node.y + h / 2);
}

Offset mindMapConnectHandle(MindMapNode node) {
  final w = mindMapNodeWidth(node);
  final h = mindMapNodeHeight(node);
  return Offset(node.x + w + 10, node.y + h / 2);
}

/// لوحة الخريطة الذهنية — مطابقة تقريباً لموقع الحاسوب.
class MindMapCanvas extends StatefulWidget {
  const MindMapCanvas({
    super.key,
    required this.nodes,
    required this.selectedId,
    required this.allMaps,
    required this.onSelect,
    required this.onMove,
    required this.onMoveEnd,
    required this.onTapNode,
    required this.onDoubleTapNode,
    required this.onMenuNode,
    required this.onTapEmpty,
    required this.onLongPressEmpty,
    required this.onConnect,
    required this.onUnlink,
    required this.onDelete,
    required this.onAddChild,
    required this.onEdit,
    required this.onFocusNode,
    this.onNavigateToMap,
  });

  final List<MindMapNode> nodes;
  final String? selectedId;
  final List<MindMap> allMaps;
  final ValueChanged<String> onSelect;
  final void Function(String id, Offset delta) onMove;
  final VoidCallback onMoveEnd;
  final ValueChanged<MindMapNode> onTapNode;
  final ValueChanged<MindMapNode> onDoubleTapNode;
  final ValueChanged<MindMapNode> onMenuNode;
  final VoidCallback onTapEmpty;
  final ValueChanged<Offset> onLongPressEmpty;
  final void Function(String fromId, String toId) onConnect;
  final ValueChanged<String> onUnlink;
  final ValueChanged<String> onDelete;
  final ValueChanged<String> onAddChild;
  final ValueChanged<MindMapNode> onEdit;
  final ValueChanged<MindMapNode> onFocusNode;
  final ValueChanged<String>? onNavigateToMap;

  @override
  State<MindMapCanvas> createState() => MindMapCanvasState();
}

class _ConnectDrag {
  const _ConnectDrag({required this.fromId, required this.end});
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

  double _noteHeight(MindMapNode node) {
    final note = node.note?.trim() ?? '';
    if (note.isEmpty) return 0;
    final lines = math.min(4, math.max(1, (note.length / 14).ceil()));
    return 6 + 12 + lines * 15;
  }

  double _nodeHeight(MindMapNode node) =>
      mindMapNodeHeight(node) + _noteHeight(node);

  Rect _nodeRect(MindMapNode node) =>
      Rect.fromLTWH(node.x, node.y, mindMapNodeWidth(node), _nodeHeight(node));

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

  MindMapNode? _connectSourceNode() {
    final fromId = _connectDrag?.fromId;
    if (fromId == null) return null;
    for (final node in widget.nodes) {
      if (node.id == fromId) return node;
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

  void _zoomBy(double factor) {
    if (_viewportSize.width <= 0) return;
    final current = _scale;
    final next = (current * factor).clamp(0.3, 3.0);
    if ((next - current).abs() < 0.001) return;
    final focal = Offset(_viewportSize.width / 2, _viewportSize.height / 2);
    final m = _controller.value.clone();
    m.translateByDouble(focal.dx, focal.dy, 0, 1);
    m.scaleByDouble(next / current, next / current, 1, 1);
    m.translateByDouble(-focal.dx, -focal.dy, 0, 1);
    _controller.value = m;
  }

  void zoomIn() => _zoomBy(1.25);
  void zoomOut() => _zoomBy(0.8);

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
      final h = _nodeHeight(n);
      minX = math.min(minX, n.x);
      minY = math.min(minY, n.y);
      maxX = math.max(maxX, n.x + w);
      maxY = math.max(maxY, n.y + h);
    }

    const pad = 120.0;
    final boxW = maxX - minX + pad * 2;
    final boxH = maxY - minY + pad * 2;
    final cx = (minX + maxX) / 2;
    final cy = (minY + maxY) / 2;

    if (_viewportSize.width <= 0 ||
        _viewportSize.height <= 0 ||
        boxW <= 0 ||
        boxH <= 0) {
      return;
    }
    final vw = _viewportSize.width;
    final vh = _viewportSize.height;
    final s = math.min(vw / boxW, vh / boxH).clamp(0.3, 3.0);

    _controller.value = Matrix4.identity()
      ..translateByDouble(vw / 2, vh / 2, 0, 1)
      ..scaleByDouble(s, s, 1, 1)
      ..translateByDouble(-cx, -cy, 0, 1);
  }

  MindMap? _linkedMap(MindMapNode node) {
    final id = node.linkedMapId;
    if (id == null) return null;
    for (final m in widget.allMaps) {
      if (m.id == id) return m;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF12141C) : const Color(0xFFF3F4F8);
    final cardBg = isDark ? const Color(0xFF1A1D28) : Colors.white;
    final cardFg = isDark ? Colors.white : const Color(0xFF1F2937);

    return LayoutBuilder(
      builder: (context, constraints) {
        _viewportSize = Size(constraints.maxWidth, constraints.maxHeight);
        return Stack(
          children: [
            InteractiveViewer(
              transformationController: _controller,
              minScale: 0.3,
              maxScale: 3,
              boundaryMargin: const EdgeInsets.all(800),
              constrained: false,
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: widget.onTapEmpty,
                onLongPressStart: (d) =>
                    widget.onLongPressEmpty(d.localPosition),
                child: ColoredBox(
                  color: bg,
                  child: SizedBox(
                    key: _canvasKey,
                    width: canvasSize,
                    height: canvasSize,
                    child: Stack(
                      clipBehavior: Clip.none,
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
                        ..._buildUnlinkButtons(),
                        ...widget.nodes.map(
                          (n) => _buildNode(n, cardBg, cardFg, isDark),
                        ),
                        ...widget.nodes
                            .where((n) => n.id == widget.selectedId)
                            .map(_buildSelectedActions),
                        ...widget.nodes.map(_buildTopButtons),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              right: 12,
              bottom: 72,
              child: _ZoomToolbar(
                onZoomIn: zoomIn,
                onZoomOut: zoomOut,
                onFit: () => focusOn(),
              ),
            ),
            if (_connectDrag != null)
              Positioned(
                top: 8,
                left: 12,
                right: 12,
                child: IgnorePointer(
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFF8B5CF6).withValues(alpha: 0.4),
                      ),
                    ),
                    child: const Text(
                      'أفلت الخط على القسم أو الفرع لربطهما',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF8B5CF6),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  List<Widget> _buildUnlinkButtons() {
    final byId = {for (final n in widget.nodes) n.id: n};
    return [
      for (final node in widget.nodes)
        if (node.parentId != null)
          Builder(
            builder: (_) {
              final parent = byId[node.parentId];
              if (parent == null) return const SizedBox.shrink();
              final from = mindMapNodeAnchor(parent);
              final to = mindMapNodeAnchor(node);
              final mid = Offset((from.dx + to.dx) / 2, (from.dy + to.dy) / 2);
              return Positioned(
                left: mid.dx - 16,
                top: mid.dy - 16,
                child: MindMapNodeButton(
                  icon: Icons.remove,
                  color: const Color(0xFFF97316),
                  size: 24,
                  tooltip: 'فك الربط',
                  onTap: () => widget.onUnlink(node.id),
                ),
              );
            },
          ),
    ];
  }

  Widget _buildNode(MindMapNode node, Color cardBg, Color cardFg, bool isDark) {
    final isSelected = node.id == widget.selectedId;
    final isDropTarget = node.id == _connectDropTargetId;
    final isConnectSource = node.id == _connectDrag?.fromId;
    final w = mindMapNodeWidth(node);
    final bodyH = mindMapNodeHeight(node);
    final isMain = node.resolvedRole == MindMapNodeRole.main;
    final accent = Color(colorFromHex(node.color));
    final note = node.note?.trim() ?? '';

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
                height: bodyH,
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(
                    isMain ? kMindMapMainH / 2 : 8,
                  ),
                  border: Border.all(
                    color: isDropTarget
                        ? const Color(0xFF8B5CF6)
                        : isConnectSource
                            ? accent
                            : isSelected
                                ? Colors.white
                                : accent.withValues(alpha: 0.65),
                    width: isDropTarget || isSelected || isConnectSource
                        ? 2.5
                        : isMain
                            ? 2
                            : 1.5,
                  ),
                  boxShadow: [
                    if (isSelected || isDropTarget || isConnectSource)
                      BoxShadow(
                        color: accent.withValues(alpha: 0.35),
                        blurRadius: 14,
                        spreadRadius: 1,
                      ),
                  ],
                ),
                child: Stack(
                  children: [
                    Positioned(
                      left: 0,
                      top: 0,
                      bottom: 0,
                      child: Container(
                        width: 4,
                        decoration: BoxDecoration(
                          color: accent,
                          borderRadius: BorderRadius.horizontal(
                            left: Radius.circular(isMain ? kMindMapMainH / 2 : 8),
                          ),
                        ),
                      ),
                    ),
                    if (isMain)
                      Positioned(
                        right: 10,
                        top: 10,
                        child: Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    else
                      Positioned(
                        right: 6,
                        top: 6,
                        child: CustomPaint(
                          size: const Size(10, 10),
                          painter: _BranchMarkerPainter(accent),
                        ),
                      ),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(
                          node.text,
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: cardFg,
                            fontWeight:
                                isMain ? FontWeight.w600 : FontWeight.w400,
                            fontSize: isMain ? 13 : 11,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (note.isNotEmpty)
                Container(
                  width: w,
                  margin: const EdgeInsets.only(top: 6),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: isDark ? 0.12 : 0.08),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: accent.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Text(
                    note,
                    maxLines: 4,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: cardFg.withValues(alpha: 0.75),
                      height: 1.3,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedActions(MindMapNode node) {
    final w = mindMapNodeWidth(node);
    final bodyH = mindMapNodeHeight(node);
    final totalH = _nodeHeight(node);
    final accent = Color(colorFromHex(node.color));

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: node.x + w - 6,
          top: node.y - 18,
          child: MindMapNodeButton(
            icon: Icons.close,
            color: const Color(0xFFEF4444),
            tooltip: 'حذف',
            onTap: () => widget.onDelete(node.id),
          ),
        ),
        Positioned(
          left: node.x + w / 2 - 14,
          top: node.y + totalH + 4,
          child: MindMapNodeButton(
            icon: Icons.add,
            color: accent,
            tooltip: 'إضافة فرع',
            onTap: () => widget.onAddChild(node.id),
          ),
        ),
        Positioned(
          left: node.x - 18,
          top: node.y + bodyH / 2 - 14,
          child: MindMapNodeButton(
            icon: Icons.edit,
            color: const Color(0xFF3B82F6),
            tooltip: 'تعديل',
            onTap: () => widget.onEdit(node),
          ),
        ),
        Positioned(
          left: node.x + w + 2,
          top: node.y + bodyH / 2 - 14,
          child: _buildConnectHandleWidget(node),
        ),
      ],
    );
  }

  Widget _buildTopButtons(MindMapNode node) {
    final w = mindMapNodeWidth(node);
    final linked = _linkedMap(node);
    final hasNav = linked != null && widget.onNavigateToMap != null;
    final focusTop = hasNav ? -42.0 : -22.0;
    final navTop = -22.0;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned(
          left: node.x + w / 2 - 16,
          top: node.y + focusTop,
          child: MindMapNodeButton(
            icon: Icons.center_focus_strong,
            color: const Color(0xFF3B82F6),
            size: 32,
            tooltip: 'تركيز',
            onTap: () => widget.onFocusNode(node),
          ),
        ),
        if (hasNav)
          Positioned(
            left: node.x + w / 2 - 16,
            top: node.y + navTop,
            child: MindMapNodeButton(
              icon: Icons.open_in_new,
              color: const Color(0xFF10B981),
              size: 32,
              tooltip: linked.title.isEmpty
                  ? 'فتح الخريطة المرتبطة'
                  : linked.title,
              onTap: () => widget.onNavigateToMap!(linked.id),
            ),
          ),
      ],
    );
  }

  Widget _buildConnectHandleWidget(MindMapNode node) {
    const size = 28.0;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanStart: (_) {
        final anchor = mindMapConnectHandle(node);
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
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xFF8B5CF6),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF8B5CF6).withValues(alpha: 0.45),
              blurRadius: 6,
            ),
          ],
        ),
        child: const Icon(Icons.swap_horiz, size: 14, color: Colors.white),
      ),
    );
  }
}

class _ZoomToolbar extends StatelessWidget {
  const _ZoomToolbar({
    required this.onZoomIn,
    required this.onZoomOut,
    required this.onFit,
  });

  final VoidCallback onZoomIn;
  final VoidCallback onZoomOut;
  final VoidCallback onFit;

  @override
  Widget build(BuildContext context) {
    final surface = Theme.of(context).colorScheme.surface.withValues(alpha: 0.95);
    return Material(
      elevation: 4,
      borderRadius: BorderRadius.circular(12),
      color: surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'تكبير',
            icon: const Icon(Icons.zoom_in),
            onPressed: onZoomIn,
          ),
          IconButton(
            tooltip: 'تصغير',
            icon: const Icon(Icons.zoom_out),
            onPressed: onZoomOut,
          ),
          const Divider(height: 1),
          IconButton(
            tooltip: 'عرض الكل',
            icon: const Icon(Icons.fit_screen),
            onPressed: onFit,
          ),
        ],
      ),
    );
  }
}

class _BranchMarkerPainter extends CustomPainter {
  _BranchMarkerPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color.withValues(alpha: 0.75);
    final path = Path()
      ..moveTo(size.width, 0)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height / 2)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _BranchMarkerPainter old) => old.color != color;
}

class _DotGridPainter extends CustomPainter {
  _DotGridPainter({required this.isDark});
  final bool isDark;

  static const _smallStep = 24.0;
  static const _largeStep = 96.0;

  @override
  void paint(Canvas canvas, Size size) {
    final small = Paint()
      ..color = isDark
          ? Colors.white.withValues(alpha: 0.08)
          : Colors.black.withValues(alpha: 0.06)
      ..style = PaintingStyle.fill;
    final large = Paint()
      ..color = isDark
          ? Colors.white.withValues(alpha: 0.14)
          : Colors.black.withValues(alpha: 0.1)
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

  @override
  void paint(Canvas canvas, Size size) {
    final byId = {for (final n in nodes) n.id: n};
    final paint = Paint()
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    if (connectDrag != null && connectFrom != null) {
      final dragPaint = Paint()
        ..color = const Color(0xFF8B5CF6).withValues(alpha: 0.9)
        ..strokeWidth = 2.5
        ..style = PaintingStyle.stroke;
      _drawBezier(
        canvas,
        dragPaint,
        mindMapConnectHandle(connectFrom!),
        connectDrag!.end,
      );
    }

    for (final node in nodes) {
      final parentId = node.parentId;
      if (parentId == null) continue;
      final parent = byId[parentId];
      if (parent == null) continue;

      paint.color = Color(colorFromHex(node.color)).withValues(alpha: 0.55);
      _drawBezier(
        canvas,
        paint,
        mindMapNodeAnchor(parent),
        mindMapNodeAnchor(node),
      );
    }
  }

  @override
  bool shouldRepaint(_ConnectionPainter oldDelegate) =>
      oldDelegate.connectDrag != connectDrag ||
      oldDelegate.connectFrom != connectFrom ||
      oldDelegate.nodes != nodes;
}
