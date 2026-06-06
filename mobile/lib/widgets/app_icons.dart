import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// أيقونات موحّدة بأسلوب Material Rounded — متناسقة عبر التطبيق.
class AppIcons {
  AppIcons._();

  static const double sm = 18;
  static const double md = 22;
  static const double lg = 26;

  // تبويبات الدرس
  static Icon details({double size = md}) =>
      Icon(Icons.article_rounded, size: size);
  static Icon notes({double size = md}) =>
      Icon(Icons.edit_note_rounded, size: size);
  static Icon images({double size = md}) =>
      Icon(Icons.photo_library_rounded, size: size);
  static Icon mindMaps({double size = md}) =>
      Icon(Icons.hub_rounded, size: size);
  static Icon wordPages({double size = md}) =>
      Icon(Icons.menu_book_rounded, size: size);
  static Icon ai({double size = md}) =>
      Icon(Icons.auto_awesome_rounded, size: size);

  // إجراءات عامة
  static Icon share({double size = md}) =>
      Icon(Icons.ios_share_rounded, size: size);
  static Icon save({double size = md}) =>
      Icon(Icons.cloud_done_rounded, size: size);
  static Icon paste({double size = md}) =>
      Icon(Icons.content_paste_rounded, size: size);
  static Icon add({double size = md}) =>
      Icon(Icons.add_circle_rounded, size: size);
  static Icon edit({double size = sm}) =>
      Icon(Icons.edit_rounded, size: size);
  static Icon delete({double size = sm}) =>
      Icon(Icons.delete_rounded, size: size);
  static Icon schedule({double size = sm, Color? color}) =>
      Icon(Icons.schedule_rounded, size: size, color: color);
  static Icon note({double size = md}) =>
      Icon(Icons.sticky_note_2_rounded, size: size);
  static Icon close({double size = md}) =>
      Icon(Icons.close_rounded, size: size);
}

/// شارة أيقونة بخلفية متدرجة — للبطاقات والقوائم.
class AppIconBadge extends StatelessWidget {
  const AppIconBadge({
    super.key,
    required this.icon,
    this.size = 46,
    this.iconSize = 24,
    this.gradient = AppTheme.noteGradient,
    this.borderRadius = 14,
  });

  final IconData icon;
  final double size;
  final double iconSize;
  final Gradient gradient;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: AppTheme.accent.withValues(alpha: 0.28),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white, size: iconSize),
    );
  }
}

/// زر أيقونة دائري صغير — للتعديل والحذف في البطاقات.
class AppActionIcon extends StatelessWidget {
  const AppActionIcon({
    super.key,
    required this.icon,
    required this.onPressed,
    required this.tooltip,
    this.color,
    this.background,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;
  final Color? color;
  final Color? background;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fg = color ?? scheme.primary;
    final bg = background ?? fg.withValues(alpha: 0.12);

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(12),
          child: Ink(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: AppIcons.sm, color: fg),
          ),
        ),
      ),
    );
  }
}

/// زر عائم ممتد بأسلوب موحّد.
class AppFab extends StatelessWidget {
  const AppFab({
    super.key,
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.heroTag,
    this.isPrimary = true,
  });

  final VoidCallback onPressed;
  final IconData icon;
  final String label;
  final Object heroTag;
  final bool isPrimary;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    if (isPrimary) {
      return FloatingActionButton.extended(
        heroTag: heroTag,
        elevation: 3,
        highlightElevation: 6,
        onPressed: onPressed,
        icon: Icon(icon, size: 20),
        label: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      );
    }

    return FloatingActionButton.extended(
      heroTag: heroTag,
      elevation: 2,
      backgroundColor: scheme.surfaceContainerHigh,
      foregroundColor: scheme.onSurface,
      onPressed: onPressed,
      icon: Icon(icon, size: 20),
      label: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    );
  }
}
