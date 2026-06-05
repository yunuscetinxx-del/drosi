import 'package:flutter/material.dart';

/// زر دائري صغير فوق العقدة — مطابق لأزرار الموقع.
class MindMapNodeButton extends StatelessWidget {
  const MindMapNodeButton({
    super.key,
    required this.icon,
    required this.color,
    required this.onTap,
    this.size = 28,
    this.tooltip,
  });

  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  final double size;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final button = GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 1.5),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.45),
              blurRadius: 6,
            ),
          ],
        ),
        child: Icon(icon, size: size * 0.42, color: Colors.white),
      ),
    );
    if (tooltip == null) return button;
    return Tooltip(message: tooltip!, child: button);
  }
}
