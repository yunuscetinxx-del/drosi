import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/lesson_note.dart';

class LessonNoteEditorScreen extends StatefulWidget {
  const LessonNoteEditorScreen({
    super.key,
    required this.note,
    required this.onChanged,
  });

  final LessonNote note;
  final ValueChanged<LessonNote> onChanged;

  @override
  State<LessonNoteEditorScreen> createState() => _LessonNoteEditorScreenState();
}

class _LessonNoteEditorScreenState extends State<LessonNoteEditorScreen> {
  late final TextEditingController _title;
  late final TextEditingController _content;
  final _contentFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.note.title);
    _content = TextEditingController(text: widget.note.content);
    _content.addListener(_onContentChanged);
  }

  @override
  void dispose() {
    _title.dispose();
    _content.removeListener(_onContentChanged);
    _content.dispose();
    _contentFocus.dispose();
    super.dispose();
  }

  void _onContentChanged() => setState(() {});

  void _emit() {
    widget.onChanged(
      widget.note.copyWith(
        title: _title.text,
        content: _content.text,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    final text = data?.text;
    if (text == null || text.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لا يوجد نص في الحافظة')),
      );
      return;
    }

    final selection = _content.selection;
    final value = _content.value;
    final newText = value.text.replaceRange(
      selection.start,
      selection.end,
      text,
    );
    final offset = selection.start + text.length;
    _content.value = value.copyWith(
      text: newText,
      selection: TextSelection.collapsed(offset: offset),
      composing: TextRange.empty,
    );
    _emit();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تم لصق ${text.length} حرف'),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _copyAll() async {
    if (_content.text.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: _content.text));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('تم نسخ النص')),
    );
  }

  Future<void> _selectAll() async {
    _content.selection = TextSelection(
      baseOffset: 0,
      extentOffset: _content.text.length,
    );
    _contentFocus.requestFocus();
  }

  String _formatDate(DateTime d) {
    final local = d.toLocal();
    return '${local.year}/${local.month.toString().padLeft(2, '0')}/${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final chars = _content.text.length;
    final lines = _content.text.isEmpty
        ? 0
        : '\n'.allMatches(_content.text).length + 1;

    return Scaffold(
      appBar: AppBar(
        title: const Text('ملاحظة'),
        actions: [
          IconButton(
            tooltip: 'لصق من الحافظة',
            icon: const Icon(Icons.content_paste),
            onPressed: _pasteFromClipboard,
          ),
          IconButton(
            tooltip: 'نسخ الكل',
            icon: const Icon(Icons.copy_all),
            onPressed: _content.text.isEmpty ? null : _copyAll,
          ),
          IconButton(
            tooltip: 'تحديد الكل',
            icon: const Icon(Icons.select_all),
            onPressed: _content.text.isEmpty ? null : _selectAll,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              children: [
                TextField(
                  controller: _title,
                  onChanged: (_) => _emit(),
                  textInputAction: TextInputAction.next,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                  decoration: const InputDecoration(
                    labelText: 'عنوان الملاحظة',
                    prefixIcon: Icon(Icons.title),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.schedule,
                        size: 16,
                        color: scheme.onSurface.withValues(alpha: 0.5)),
                    const SizedBox(width: 6),
                    Text(
                      'آخر تعديل: ${_formatDate(widget.note.updatedAt)}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurface.withValues(alpha: 0.55),
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'المحتوى',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: scheme.onSurface.withValues(alpha: 0.65),
                      ),
                ),
                const SizedBox(height: 8),
                Card(
                  elevation: 0,
                  color: scheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  child: Padding(
                    padding: const EdgeInsets.all(4),
                    child: TextField(
                      controller: _content,
                      focusNode: _contentFocus,
                      onChanged: (_) => _emit(),
                      maxLines: null,
                      minLines: 20,
                      keyboardType: TextInputType.multiline,
                      textAlignVertical: TextAlignVertical.top,
                      style: const TextStyle(height: 1.45, fontSize: 15),
                      decoration: InputDecoration(
                        hintText:
                            'اكتب أو الصق نصاً طويلاً هنا...\n\nيمكنك لصق فقرات كاملة من أي تطبيق.',
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.all(12),
                        hintStyle: TextStyle(
                          color: scheme.onSurface.withValues(alpha: 0.35),
                          height: 1.45,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Material(
            elevation: 8,
            child: SafeArea(
              top: false,
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                child: Row(
                  children: [
                    FilledButton.tonalIcon(
                      onPressed: _pasteFromClipboard,
                      icon: const Icon(Icons.content_paste, size: 18),
                      label: const Text('لصق'),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$chars حرف • $lines سطر',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurface.withValues(alpha: 0.5),
                          ),
                    ),
                    const Spacer(),
                    Icon(Icons.cloud_done_outlined,
                        size: 18,
                        color: scheme.primary.withValues(alpha: 0.7)),
                    const SizedBox(width: 4),
                    Text(
                      'يُحفظ مع الدرس',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: scheme.primary,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
