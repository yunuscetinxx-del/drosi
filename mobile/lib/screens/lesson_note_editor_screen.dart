import 'package:flutter/material.dart';
import 'package:html_editor_enhanced/html_editor.dart';

import '../models/lesson_note.dart';
import '../utils/lesson_note_content.dart';

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
  late final HtmlEditorController _htmlController;
  int _charCount = 0;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.note.title);
    _htmlController = HtmlEditorController();
    _charCount = notePreviewText(widget.note.content, max: 100000).length;
  }

  @override
  void dispose() {
    _flushSave();
    _title.dispose();
    super.dispose();
  }

  Future<void> _flushSave() async {
    final html = await _htmlController.getText();
    widget.onChanged(
      widget.note.copyWith(
        title: _title.text,
        content: html,
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> _emit({String? html}) async {
    final content = html ?? await _htmlController.getText();
    if (!mounted) return;
    setState(() {
      _charCount = notePreviewText(content, max: 100000).length;
    });
    widget.onChanged(
      widget.note.copyWith(
        title: _title.text,
        content: content,
        updatedAt: DateTime.now(),
      ),
    );
  }

  String _formatDate(DateTime d) {
    final local = d.toLocal();
    return '${local.year}/${local.month.toString().padLeft(2, '0')}/${local.day.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final editorHeight = MediaQuery.of(context).size.height - 220;

    return Scaffold(
      appBar: AppBar(
        title: const Text('تحرير الملاحظة'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
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
                const SizedBox(height: 8),
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
                const SizedBox(height: 4),
                Text(
                  'ألوان، عناوين، قوائم — يُزامن مع الموقع',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurface.withValues(alpha: 0.45),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: HtmlEditor(
                controller: _htmlController,
                htmlEditorOptions: HtmlEditorOptions(
                  hint: 'اكتب أو الصق نصاً طويلاً هنا...\n\nيمكنك تنسيق النص: لون، تمييز، عناوين، قوائم.',
                  initialText: normalizeNoteHtml(widget.note.content),
                  shouldEnsureVisible: true,
                  adjustHeightForKeyboard: true,
                  autoAdjustHeight: false,
                ),
                htmlToolbarOptions: HtmlToolbarOptions(
                  toolbarPosition: ToolbarPosition.belowEditor,
                  toolbarType: ToolbarType.nativeScrollable,
                  defaultToolbarButtons: [
                    const StyleButtons(),
                    const FontSettingButtons(fontSizeUnit: false),
                    const FontButtons(clearAll: false),
                    const ColorButtons(),
                    const ListButtons(listStyles: false),
                    const ParagraphButtons(
                      textDirection: false,
                      lineHeight: false,
                      caseConverter: false,
                    ),
                    const InsertButtons(
                      video: false,
                      audio: false,
                      table: false,
                      hr: true,
                      otherFile: false,
                    ),
                    const OtherButtons(
                      fullscreen: false,
                      help: false,
                      copy: true,
                      paste: true,
                      undo: true,
                      redo: true,
                    ),
                  ],
                ),
                otherOptions: OtherOptions(height: editorHeight.clamp(280, 900)),
                callbacks: Callbacks(
                  onChangeContent: (String? changed) {
                    if (changed != null) _emit(html: changed);
                  },
                ),
              ),
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
                    Text(
                      '$_charCount حرف',
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
