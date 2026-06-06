import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/lesson_note.dart';
import '../utils/lesson_note_content.dart';
import '../utils/markdown_to_note_html.dart'
    show extractTitleFromImportedContent, looksLikeMarkdown, markdownToNoteHtml;
import '../widgets/app_icons.dart';

/// محرر ملاحظات — نص/Markdown قابل للتعديل، يُحفظ كـ HTML.
class LessonNoteEditorScreen extends StatefulWidget {
  const LessonNoteEditorScreen({
    super.key,
    required this.note,
    required this.onChanged,
  });

  final LessonNote note;
  final Future<void> Function(LessonNote note) onChanged;

  @override
  State<LessonNoteEditorScreen> createState() => _LessonNoteEditorScreenState();
}

class _LessonNoteEditorScreenState extends State<LessonNoteEditorScreen> {
  late final TextEditingController _title;
  late final TextEditingController _body;
  late final FocusNode _bodyFocus;
  late final ScrollController _scroll;
  bool _saving = false;
  bool _dirty = false;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.note.title);
    _body = TextEditingController(text: noteContentForEditing(widget.note.content));
    _bodyFocus = FocusNode();
    _scroll = ScrollController();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _body.text.isEmpty) _bodyFocus.requestFocus();
    });
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _bodyFocus.dispose();
    _scroll.dispose();
    super.dispose();
  }

  String _buildContent() {
    final text = _body.text.trim();
    if (text.isEmpty) return '<p></p>';
    if (looksLikeMarkdown(text)) {
      return ensureNoteTableClass(markdownToNoteHtml(text));
    }
    return editableTextToNoteHtml(text);
  }

  LessonNote _buildNote() {
    return widget.note.copyWith(
      title: _title.text.trim(),
      content: _buildContent(),
      updatedAt: DateTime.now(),
    );
  }

  void _markDirty() {
    if (!_dirty) setState(() => _dirty = true);
  }

  Future<void> _saveAndClose() async {
    setState(() => _saving = true);
    try {
      await widget.onChanged(_buildNote());
      if (mounted) Navigator.pop(context);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pasteFromClipboard() async {
    final clip = await Clipboard.getData(Clipboard.kTextPlain);
    final pasted = clip?.text ?? '';
    if (pasted.trim().isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الحافظة فارغة')),
      );
      return;
    }

    setState(() {
      final current = _body.text.trim();
      _body.text = current.isEmpty ? pasted.trim() : '$current\n\n${pasted.trim()}';
      _body.selection = TextSelection.collapsed(offset: _body.text.length);
      _dirty = true;
    });

    if (_title.text.trim().isEmpty) {
      _title.text = extractTitleFromImportedContent(pasted);
    }

    _bodyFocus.requestFocus();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('تم اللصق'), duration: Duration(seconds: 1)),
    );
  }

  Future<bool> _onWillPop() async {
    if (!_dirty) return true;
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حفظ التغييرات؟'),
        content: const Text('لديك تعديلات لم تُحفظ بعد.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'discard'),
            child: const Text('تجاهل'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'stay'),
            child: const Text('متابعة'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'save'),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    if (action == 'save') {
      await widget.onChanged(_buildNote());
      return true;
    }
    return action == 'discard';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sheetColor = isDark ? scheme.surface : const Color(0xFFFFFCF5);

    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final leave = await _onWillPop();
        if (leave && context.mounted) Navigator.pop(context);
      },
      child: Scaffold(
        backgroundColor: sheetColor,
        appBar: AppBar(
          backgroundColor: sheetColor,
          title: Text(
            _dirty ? 'غير محفوظ' : 'ملاحظة',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: _dirty
                  ? Colors.orange.shade700
                  : scheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          actions: [
            IconButton(
              tooltip: 'لصق',
              onPressed: _pasteFromClipboard,
              icon: AppIcons.paste(),
            ),
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: TextButton(
                onPressed: _saving ? null : _saveAndClose,
                child: _saving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'تم',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
          ],
        ),
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                child: TextField(
                  controller: _title,
                  onChanged: (_) => _markDirty(),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        fontSize: 24,
                        height: 1.25,
                      ),
                  decoration: InputDecoration(
                    hintText: 'عنوان',
                    hintStyle: TextStyle(
                      color: scheme.onSurface.withValues(alpha: 0.35),
                      fontWeight: FontWeight.bold,
                      fontSize: 24,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                    isDense: true,
                  ),
                  textInputAction: TextInputAction.next,
                  onSubmitted: (_) => _bodyFocus.requestFocus(),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: SingleChildScrollView(
                  controller: _scroll,
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 32),
                  child: TextField(
                    controller: _body,
                    focusNode: _bodyFocus,
                    onChanged: (_) => _markDirty(),
                    maxLines: null,
                    minLines: 24,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontSize: 17,
                          height: 1.55,
                          color: scheme.onSurface.withValues(alpha: 0.92),
                        ),
                    decoration: InputDecoration(
                      hintText: 'ابدأ الكتابة أو الصق محتوى…',
                      hintStyle: TextStyle(
                        color: scheme.onSurface.withValues(alpha: 0.35),
                        fontSize: 17,
                        height: 1.55,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
