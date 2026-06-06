import 'lesson_note_content.dart';
import 'markdown_to_note_html.dart';

const _allowedTags = {
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code', 'a', 'span', 'div', 'hr', 'mark',
};

String stripUnsafeHtml(String html) {
  var s = html
      .replaceAll(RegExp(r'<script[\s\S]*?</script>', caseSensitive: false), '')
      .replaceAll(RegExp(r'<style[\s\S]*?</style>', caseSensitive: false), '')
      .replaceAll(RegExp(r'<!--[\s\S]*?-->', caseSensitive: false), '');

  final tagPattern = RegExp(r'</?([a-z][a-z0-9]*)\b[^>]*>', caseSensitive: false);
  s = s.replaceAllMapped(tagPattern, (match) {
    final tag = match.group(1)?.toLowerCase() ?? '';
    if (!_allowedTags.contains(tag)) return '';
    return match.group(0)!;
  });

  return s.trim();
}

bool htmlHasRichStructure(String html) {
  return RegExp(r'<(table|h[1-3]|ul|ol|blockquote)\b', caseSensitive: false)
      .hasMatch(html);
}

String convertPasteToNoteHtml(String text, {String? html}) {
  final plain = text.trim();

  if (html != null && html.trim().isNotEmpty) {
    final cleaned = stripUnsafeHtml(html.trim());
    if (cleaned.isNotEmpty && htmlHasRichStructure(cleaned)) {
      return cleaned;
    }
  }

  if (plain.isNotEmpty && looksLikeMarkdown(plain)) {
    return ensureNoteTableClass(markdownToNoteHtml(plain));
  }

  if (plain.isNotEmpty && isNoteHtml(plain)) {
    return ensureNoteTableClass(stripUnsafeHtml(plain));
  }

  return normalizeNoteHtml(plain);
}

String importClipboardToNoteHtml(String raw, {String? html}) {
  return convertPasteToNoteHtml(raw, html: html);
}
