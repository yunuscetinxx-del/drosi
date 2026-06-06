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
  if (isNoteHtml(t)) return ensureNoteTableClass(content);
  return editableTextToNoteHtml(t);
}

/// يضيف `class="note-table"` لكل جدول — مطابق لعرض الموقع.
String ensureNoteTableClass(String html) {
  if (!RegExp(r'<table\b', caseSensitive: false).hasMatch(html)) return html;
  return html.replaceAllMapped(
    RegExp(r'<table(\s[^>]*)?>', caseSensitive: false),
    (match) {
      final attrs = match.group(1) ?? '';
      if (RegExp(r'class\s*=\s*"[^"]*\bnote-table\b', caseSensitive: false)
          .hasMatch(attrs)) {
        return match.group(0)!;
      }
      final classMatch =
          RegExp(r'class\s*=\s*"([^"]*)"', caseSensitive: false).firstMatch(attrs);
      if (classMatch != null) {
        final merged = attrs.replaceFirst(
          RegExp(r'class\s*=\s*"[^"]*"', caseSensitive: false),
          'class="${classMatch.group(1)} note-table"',
        );
        return '<table$merged>';
      }
      return '<table class="note-table"$attrs>';
    },
  );
}

bool noteHasRichStructure(String content) {
  final t = content.trim();
  if (t.isEmpty) return false;
  return RegExp(r'<(table|h[1-3]|ul|ol|blockquote)\b', caseSensitive: false)
      .hasMatch(t);
}

/// يدمج كتل HTML مع الحفاظ على ترتيب المحتوى.
String mergeNoteHtmlBlocks(String existing, String addition) {
  final left = existing.trim();
  final right = addition.trim();
  if (left.isEmpty) return right;
  if (right.isEmpty) return left;
  return '$left$right';
}

String _decodeHtmlEntities(String s) {
  return s
      .replaceAll('&nbsp;', ' ')
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"');
}

String _stripInnerTags(String html) {
  return _decodeHtmlEntities(html.replaceAll(RegExp(r'<[^>]+>'), '').trim());
}

/// يحوّل HTML المخزّن إلى نص/Markdown قابل للتحرير.
String htmlToEditableText(String content) {
  if (content.trim().isEmpty) return '';
  if (!isNoteHtml(content)) return content.trim();

  var s = content
      .replaceAll(RegExp(r'<style[\s\S]*?</style>', caseSensitive: false), '')
      .replaceAll(RegExp(r'<script[\s\S]*?</script>', caseSensitive: false), '');

  s = s.replaceAllMapped(
    RegExp(r'<h1[^>]*>([\s\S]*?)</h1>', caseSensitive: false),
    (m) => '# ${_stripInnerTags(m.group(1)!)}',
  );
  s = s.replaceAllMapped(
    RegExp(r'<h2[^>]*>([\s\S]*?)</h2>', caseSensitive: false),
    (m) => '## ${_stripInnerTags(m.group(1)!)}',
  );
  s = s.replaceAllMapped(
    RegExp(r'<h3[^>]*>([\s\S]*?)</h3>', caseSensitive: false),
    (m) => '### ${_stripInnerTags(m.group(1)!)}',
  );

  s = s.replaceAllMapped(
    RegExp(r'<ul[^>]*>([\s\S]*?)</ul>', caseSensitive: false),
    (m) {
      final items = RegExp(r'<li[^>]*>([\s\S]*?)</li>', caseSensitive: false)
          .allMatches(m.group(1)!)
          .map((li) => '- ${_stripInnerTags(li.group(1)!)}')
          .join('\n');
      return items;
    },
  );

  s = s.replaceAllMapped(
    RegExp(r'<ol[^>]*>([\s\S]*?)</ol>', caseSensitive: false),
    (m) {
      var n = 0;
      return RegExp(r'<li[^>]*>([\s\S]*?)</li>', caseSensitive: false)
          .allMatches(m.group(1)!)
          .map((li) {
            n++;
            return '$n. ${_stripInnerTags(li.group(1)!)}';
          })
          .join('\n');
    },
  );

  s = s
      .replaceAll(RegExp(r'<br\s*/?>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</tr>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'</p>', caseSensitive: false), '\n\n')
      .replaceAll(RegExp(r'</h[1-6]>', caseSensitive: false), '\n\n')
      .replaceAll(RegExp(r'</li>', caseSensitive: false), '\n')
      .replaceAll(RegExp(r'<li[^>]*>', caseSensitive: false), '- ')
      .replaceAll(RegExp(r'<[^>]+>'), '');

  s = _decodeHtmlEntities(s);
  return s.replaceAll(RegExp(r'\n{3,}'), '\n\n').trim();
}

/// نص جاهز للتحرير — يفضّل Markdown إن وُجد.
String noteContentForEditing(String content) {
  final t = content.trim();
  if (t.isEmpty) return '';
  if (!isNoteHtml(t)) return t;
  return htmlToEditableText(t);
}

/// يحوّل النص المحرَّر إلى HTML متوافق مع الموقع.
String editableTextToNoteHtml(String text) {
  final trimmed = text.trim();
  if (trimmed.isEmpty) return '<p></p>';

  final blocks = trimmed.split(RegExp(r'\n{2,}'));
  return blocks
      .map((block) {
        final lines = block.split('\n').map(escapeHtml).join('<br>');
        return '<p>$lines</p>';
      })
      .join('');
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
