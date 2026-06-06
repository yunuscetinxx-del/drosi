import 'lesson_note_content.dart';

/// يحوّل المحتوى المخزّن (نص، Markdown، أو HTML بسيط) إلى HTML للعرض.
String resolveNoteHtmlForDisplay(String content) {
  final t = content.trim();
  if (t.isEmpty) return '<p></p>';
  final plain = isNoteHtml(t) ? htmlToEditableText(t) : t;
  if (looksLikeMarkdown(plain)) {
    return ensureNoteTableClass(markdownToNoteHtml(plain));
  }
  return ensureNoteTableClass(normalizeNoteHtml(content));
}

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
  s = s.replaceAllMapped(
    RegExp(r'\[([^\]]+)\]\(([^)]+)\)'),
    (m) =>
        '<a href="${m[2]}" target="_blank" rel="noopener noreferrer">${m[1]}</a>',
  );
  return s;
}

bool _isTableRow(String line) {
  final t = line.trim();
  if (!t.contains('|')) return false;
  return t.split('|').where((c) => c.trim().isNotEmpty).length >= 2;
}

bool _isTableSeparator(String line) {
  return RegExp(r'^\|?[\s|:-]+\|?$').hasMatch(line.trim()) && line.contains('-');
}

bool _isHeadingLine(String line) => RegExp(r'^#{1,3}\s+').hasMatch(line.trim());

bool _isBulletLine(String line) => RegExp(r'^[-*]\s+').hasMatch(line.trim());

bool _isNumberedLine(String line) => RegExp(r'^\d+\.\s+').hasMatch(line.trim());

bool _isSectionLine(String line) =>
    RegExp(r'^[أ-يa-zA-Z]\)\s+').hasMatch(line.trim());

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
  final rows =
      lines.where((l) => l.trim().isNotEmpty && !_isTableSeparator(l)).toList();
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

bool _isTableBlock(List<String> lines) {
  final meaningful = lines.where((l) => l.trim().isNotEmpty).toList();
  if (meaningful.length < 2) return false;
  return meaningful.every(_isTableRow) ||
      (meaningful.where(_isTableRow).length >= 2 &&
          meaningful.any(_isTableSeparator));
}

String _renderHeading(String line) {
  final trimmed = line.trim();
  final level = RegExp(r'^#+').firstMatch(trimmed)?.group(0)?.length ?? 1;
  final tag = 'h${level.clamp(1, 3)}';
  final text = trimmed.replaceFirst(RegExp(r'^#{1,3}\s+'), '');
  return '<$tag>${parseInlineMarkdown(text)}</$tag>';
}

String _renderBulletList(List<String> lines) {
  final items = lines
      .map((l) =>
          '<li>${parseInlineMarkdown(l.trim().replaceFirst(RegExp(r'^[-*]\s+'), ''))}</li>')
      .join();
  return '<ul>$items</ul>';
}

String _renderNumberedList(List<String> lines) {
  final items = lines
      .map((l) =>
          '<li>${parseInlineMarkdown(l.trim().replaceFirst(RegExp(r'^\d+\.\s+'), ''))}</li>')
      .join();
  return '<ol>$items</ol>';
}

String _renderParagraph(List<String> lines) {
  return '<p>${parseInlineMarkdown(lines.join('\n'))}</p>';
}

String markdownToNoteHtml(String markdown) {
  final text = markdown.replaceAll('\r\n', '\n').trim();
  if (text.isEmpty) return '<p></p>';

  final lines = text.split('\n');
  final html = <String>[];
  var i = 0;

  while (i < lines.length) {
    while (i < lines.length && lines[i].trim().isEmpty) {
      i++;
    }
    if (i >= lines.length) break;

    final line = lines[i];

    if (_isTableRow(line)) {
      final tableLines = <String>[];
      while (i < lines.length) {
        final current = lines[i];
        if (current.trim().isEmpty) {
          if (tableLines.isNotEmpty &&
              i + 1 < lines.length &&
              _isTableRow(lines[i + 1])) {
            i++;
            continue;
          }
          break;
        }
        if (_isTableRow(current) || _isTableSeparator(current)) {
          tableLines.add(current);
          i++;
          continue;
        }
        break;
      }
      if (_isTableBlock(tableLines)) {
        html.add(_renderTable(tableLines));
      } else if (tableLines.isNotEmpty) {
        html.add(_renderParagraph(tableLines));
      }
      continue;
    }

    if (_isHeadingLine(line)) {
      html.add(_renderHeading(line));
      i++;
      continue;
    }

    if (_isSectionLine(line)) {
      html.add('<h3>${parseInlineMarkdown(line.trim())}</h3>');
      i++;
      continue;
    }

    if (_isBulletLine(line)) {
      final listLines = <String>[];
      while (i < lines.length && _isBulletLine(lines[i])) {
        listLines.add(lines[i]);
        i++;
      }
      html.add(_renderBulletList(listLines));
      continue;
    }

    if (_isNumberedLine(line)) {
      final listLines = <String>[];
      while (i < lines.length && _isNumberedLine(lines[i])) {
        listLines.add(lines[i]);
        i++;
      }
      html.add(_renderNumberedList(listLines));
      continue;
    }

    final paraLines = <String>[];
    while (i < lines.length) {
      final current = lines[i];
      if (current.trim().isEmpty) break;
      if (_isTableRow(current) ||
          _isHeadingLine(current) ||
          _isBulletLine(current) ||
          _isNumberedLine(current) ||
          _isSectionLine(current)) {
        break;
      }
      paraLines.add(current);
      i++;
    }
    if (paraLines.isNotEmpty) {
      html.add(_renderParagraph(paraLines));
    }
  }

  final joined = html.where((b) => b.isNotEmpty).join('');
  return joined.isEmpty ? '<p></p>' : joined;
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
