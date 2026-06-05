String escapeHtml(String text) {
  return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
}

bool isNoteHtml(String content) {
  final t = content.trim();
  return t.startsWith('<') && RegExp(r'<[a-z][\s\S]*>', caseSensitive: false).hasMatch(t);
}

String normalizeNoteHtml(String content) {
  final t = content.trim();
  if (t.isEmpty) return '<p></p>';
  if (isNoteHtml(t)) return content;
  return '<p>${escapeHtml(t).replaceAll('\n', '<br>')}</p>';
}

String notePreviewText(String content, {int max = 140}) {
  final plain = isNoteHtml(content)
      ? content
          .replaceAll(RegExp(r'<style[\s\S]*?</style>', caseSensitive: false), ' ')
          .replaceAll(RegExp(r'<script[\s\S]*?</script>', caseSensitive: false), ' ')
          .replaceAll(RegExp(r'<[^>]+>'), ' ')
          .replaceAll('&nbsp;', ' ')
          .replaceAll(RegExp(r'\s+'), ' ')
          .trim()
      : content.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (plain.isEmpty) return '';
  return plain.length > max ? '${plain.substring(0, max)}…' : plain;
}
