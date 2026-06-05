import 'lesson_note_content.dart';

bool looksLikeMarkdown(String text) {
  final t = text.trim();
  if (t.isEmpty) return false;
  return RegExp(r'^#{1,3}\s', multiLine: true).hasMatch(t) ||
      RegExp(r'^\|.+\|', multiLine: true).hasMatch(t) ||
      RegExp(r'^[-*]\s+', multiLine: true).hasMatch(t) ||
      RegExp(r'^\d+\.\s+', multiLine: true).hasMatch(t) ||
      t.contains('**') ||
      t.contains('__');
}

String parseInlineMarkdown(String text) {
  var s = escapeHtml(text);
  s = s.replaceAllMapped(RegExp(r'`([^`]+)`'), (m) => '<code>${m[1]}</code>');
  s = s.replaceAllMapped(RegExp(r'\*\*(.+?)\*\*'), (m) => '<strong>${m[1]}</strong>');
  s = s.replaceAllMapped(RegExp(r'__(.+?)__'), (m) => '<strong>${m[1]}</strong>');
  s = s.replaceAllMapped(RegExp(r'\*(.+?)\*'), (m) => '<em>${m[1]}</em>');
  return s;
}

bool _isTableRow(String line) {
  final t = line.trim();
  return t.startsWith('|') && t.endsWith('|') && t.contains('|');
}

bool _isTableSeparator(String line) {
  return RegExp(r'^\|?[\s|:-]+\|?$').hasMatch(line.trim()) && line.contains('-');
}

List<String> _parseTableRow(String line) {
  return line
      .trim()
      .replaceFirst(RegExp(r'^\|'), '')
      .replaceFirst(RegExp(r'\|$'), '')
      .split('|')
      .map((c) => c.trim())
      .toList();
}

String _renderTable(List<String> lines) {
  final rows = lines.where((l) => l.trim().isNotEmpty && !_isTableSeparator(l)).toList();
  if (rows.isEmpty) return '';
  final parsed = rows.map(_parseTableRow).toList();
  final header = parsed.first;
  final body = parsed.length > 1 ? parsed.sublist(1) : <List<String>>[];
  final thead =
      '<thead><tr>${header.map((c) => '<th>${parseInlineMarkdown(c)}</th>').join()}</tr></thead>';
  final tbody = body.isEmpty
      ? ''
      : '<tbody>${body.map((row) => '<tr>${row.map((c) => '<td>${parseInlineMarkdown(c)}</td>').join()}</tr>').join()}</tbody>';
  return '<table class="note-table">$thead$tbody</table>';
}

String _parseBlock(String block) {
  final lines = block.split('\n').where((l) => l.trim().isNotEmpty).toList();
  if (lines.isEmpty) return '';

  if (lines.every(_isTableRow) ||
      (lines.where(_isTableRow).length >= 2 && lines.any(_isTableSeparator))) {
    return _renderTable(lines);
  }

  final first = lines.first.trim();
  final heading = RegExp(r'^#{1,3}\s+');
  if (heading.hasMatch(first)) {
    final level = RegExp(r'^#+').firstMatch(first)?.group(0)?.length ?? 1;
    final tag = 'h${level.clamp(1, 3)}';
    final text = first.replaceFirst(heading, '');
    return '<$tag>${parseInlineMarkdown(text)}</$tag>';
  }

  if (RegExp(r'^[-*]\s+').hasMatch(first)) {
    final items = lines
        .where((l) => RegExp(r'^[-*]\s+').hasMatch(l.trim()))
        .map((l) => '<li>${parseInlineMarkdown(l.trim().replaceFirst(RegExp(r'^[-*]\s+'), ''))}</li>')
        .join();
    return items.isEmpty ? '' : '<ul>$items</ul>';
  }

  if (RegExp(r'^\d+\.\s+').hasMatch(first)) {
    final items = lines
        .where((l) => RegExp(r'^\d+\.\s+').hasMatch(l.trim()))
        .map((l) => '<li>${parseInlineMarkdown(l.trim().replaceFirst(RegExp(r'^\d+\.\s+'), ''))}</li>')
        .join();
    return items.isEmpty ? '' : '<ol>$items</ol>';
  }

  return '<p>${parseInlineMarkdown(lines.join('\n'))}</p>';
}

String markdownToNoteHtml(String markdown) {
  final blocks = markdown.replaceAll('\r\n', '\n').split(RegExp(r'\n{2,}'));
  final html = blocks.map(_parseBlock).where((b) => b.isNotEmpty).join('');
  return html.isEmpty ? '<p></p>' : html;
}

String extractTitleFromImportedContent(String content) {
  final lines = content.split('\n');
  for (final line in lines) {
    final t = line.trim();
    if (t.startsWith('# ')) return t.substring(2).trim();
    if (t.startsWith('## ')) return t.substring(3).trim();
  }
  final plain = content.trim().split('\n').first.trim();
  if (plain.length > 60) return '${plain.substring(0, 60)}…';
  return plain.isEmpty ? 'ملاحظة مستوردة' : plain;
}

String importClipboardToNoteHtml(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return '<p></p>';
  if (isNoteHtml(trimmed)) return normalizeNoteHtml(trimmed);
  if (looksLikeMarkdown(trimmed)) return markdownToNoteHtml(trimmed);
  return normalizeNoteHtml(trimmed);
}
