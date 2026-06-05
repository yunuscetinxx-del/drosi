import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

import '../utils/lesson_note_content.dart';

/// عرض محتوى الملاحظة (HTML أو نص عادي) بأسلوب ورقة قراءة واسعة.
class LessonNoteHtmlView extends StatelessWidget {
  const LessonNoteHtmlView({
    super.key,
    required this.content,
    this.sheetStyle = true,
  });

  final String content;
  final bool sheetStyle;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final plain = notePreviewText(content, max: 100000);
    final isEmpty = plain.isEmpty;

    if (isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.45),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: scheme.outlineVariant),
        ),
        child: Text(
          'ملاحظة فارغة — استخدم زر التعديل لإضافة نص',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: scheme.onSurface.withValues(alpha: 0.5),
            height: 1.5,
          ),
        ),
      );
    }

    final html = Html(
      data: normalizeNoteHtml(content),
      style: {
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(16),
          lineHeight: const LineHeight(1.75),
          color: scheme.onSurface,
        ),
        'h1': Style(
          fontSize: FontSize(28),
          fontWeight: FontWeight.bold,
          margin: Margins.only(top: 12, bottom: 8),
        ),
        'h2': Style(
          fontSize: FontSize(22),
          fontWeight: FontWeight.bold,
          margin: Margins.only(top: 10, bottom: 6),
        ),
        'h3': Style(
          fontSize: FontSize(18),
          fontWeight: FontWeight.w600,
          margin: Margins.only(top: 8, bottom: 4),
        ),
        'p': Style(margin: Margins.only(bottom: 8)),
        'ul': Style(padding: HtmlPaddings.only(left: 20)),
        'ol': Style(padding: HtmlPaddings.only(left: 20)),
        'blockquote': Style(
          border: Border(
            left: BorderSide(color: scheme.primary.withValues(alpha: 0.45), width: 3),
          ),
          padding: HtmlPaddings.only(left: 12),
          color: scheme.onSurface.withValues(alpha: 0.7),
        ),
        'a': Style(color: scheme.primary, textDecoration: TextDecoration.underline),
        'mark': Style(backgroundColor: const Color(0xFFFFF59D)),
      },
    );

    if (!sheetStyle) return html;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: scheme.outlineVariant.withValues(alpha: 0.7)),
        boxShadow: [
          BoxShadow(
            color: scheme.shadow.withValues(alpha: 0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: html,
    );
  }
}
