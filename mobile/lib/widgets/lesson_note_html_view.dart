import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';

import '../utils/lesson_note_content.dart';
import '../utils/markdown_to_note_html.dart';

/// عرض محتوى الملاحظة (HTML أو نص عادي).
class LessonNoteHtmlView extends StatelessWidget {
  const LessonNoteHtmlView({
    super.key,
    required this.content,
    this.sheetStyle = true,
    this.fullWidth = false,
  });

  final String content;
  final bool sheetStyle;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final plain = notePreviewText(content, max: 100000);
    final isEmpty = plain.isEmpty;

    if (isEmpty) {
      return Container(
        width: double.infinity,
        padding: fullWidth ? const EdgeInsets.all(20) : const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: 0.45),
          borderRadius: fullWidth ? BorderRadius.zero : BorderRadius.circular(16),
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

    final tableBg = scheme.surfaceContainerLow;
    final headerBg = scheme.surfaceContainerHighest.withValues(alpha: 0.85);
    final rowLine = scheme.outlineVariant.withValues(alpha: 0.55);
    final tableBorder = scheme.outlineVariant;
    final horizontalPad = fullWidth ? 0.0 : 20.0;

    Widget buildHtml(double maxWidth) {
      return Html(
        data: resolveNoteHtmlForDisplay(content),
        style: {
          'body': Style(
            margin: Margins.zero,
            padding: HtmlPaddings.symmetric(horizontal: horizontalPad),
            fontSize: FontSize(fullWidth ? 15 : 16),
            lineHeight: const LineHeight(1.75),
            color: scheme.onSurface,
            width: Width(maxWidth, Unit.px),
            display: Display.block,
            textAlign: TextAlign.start,
          ),
          'h1': Style(
            fontSize: FontSize(26),
            fontWeight: FontWeight.bold,
            margin: Margins.only(top: 4, bottom: 10),
            textAlign: TextAlign.start,
          ),
          'h2': Style(
            fontSize: FontSize(22),
            fontWeight: FontWeight.bold,
            margin: Margins.only(top: 4, bottom: 8),
            textAlign: TextAlign.start,
          ),
          'h3': Style(
            fontSize: FontSize(18),
            fontWeight: FontWeight.w600,
            margin: Margins.only(top: 4, bottom: 6),
            textAlign: TextAlign.start,
          ),
          'p': Style(
            margin: Margins.only(bottom: 10),
            textAlign: TextAlign.start,
            lineHeight: const LineHeight(1.7),
          ),
          'ul': Style(
            display: Display.block,
            padding: HtmlPaddings.only(right: 22, left: 8),
            margin: Margins.only(bottom: 12, top: 4),
            listStyleType: ListStyleType.disc,
          ),
          'ol': Style(
            display: Display.block,
            padding: HtmlPaddings.only(right: 22, left: 8),
            margin: Margins.only(bottom: 12, top: 4),
            listStyleType: ListStyleType.decimal,
          ),
          'li': Style(
            display: Display.listItem,
            margin: Margins.only(bottom: 6),
            textAlign: TextAlign.start,
            lineHeight: const LineHeight(1.6),
          ),
          'blockquote': Style(
            border: Border(
              right: BorderSide(color: scheme.primary.withValues(alpha: 0.45), width: 3),
            ),
            padding: HtmlPaddings.only(right: 12),
            margin: Margins.only(bottom: 10),
            color: scheme.onSurface.withValues(alpha: 0.7),
          ),
          'a': Style(color: scheme.primary, textDecoration: TextDecoration.underline),
          'mark': Style(backgroundColor: const Color(0xFFFFF59D)),
          'strong': Style(fontWeight: FontWeight.bold),
          'b': Style(fontWeight: FontWeight.bold),
          'table': Style(
            width: Width(100, Unit.percent),
            display: Display.block,
            backgroundColor: tableBg,
            border: Border.all(color: tableBorder),
            margin: Margins.symmetric(vertical: 10),
            padding: HtmlPaddings.zero,
          ),
          'thead': Style(backgroundColor: headerBg),
          'th': Style(
            padding: HtmlPaddings.symmetric(horizontal: 10, vertical: 10),
            backgroundColor: headerBg,
            fontWeight: FontWeight.w600,
            fontSize: FontSize(14),
            border: Border(bottom: BorderSide(color: tableBorder, width: 1)),
            textAlign: TextAlign.start,
          ),
          'td': Style(
            padding: HtmlPaddings.symmetric(horizontal: 10, vertical: 10),
            fontSize: FontSize(14),
            border: Border(bottom: BorderSide(color: rowLine, width: 1)),
            textAlign: TextAlign.start,
            verticalAlign: VerticalAlign.top,
          ),
          'tr': Style(backgroundColor: Colors.transparent),
          'code': Style(
            fontFamily: 'monospace',
            backgroundColor: scheme.surfaceContainerHighest,
            padding: HtmlPaddings.symmetric(horizontal: 4, vertical: 2),
          ),
        },
      );
    }

    final htmlBody = LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? constraints.maxWidth
            : MediaQuery.sizeOf(context).width;
        return Directionality(
          textDirection: TextDirection.rtl,
          child: SizedBox(
            width: width,
            child: buildHtml(width),
          ),
        );
      },
    );

    if (sheetStyle) {
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
        child: htmlBody,
      );
    }

    return SizedBox(width: double.infinity, child: htmlBody);
  }
}
