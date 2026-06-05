import 'package:flutter/material.dart';

import '../models/word_page.dart';

class WordPageEditorScreen extends StatefulWidget {
  const WordPageEditorScreen({
    super.key,
    required this.page,
    required this.onChanged,
  });

  final WordPage page;
  final ValueChanged<WordPage> onChanged;

  @override
  State<WordPageEditorScreen> createState() => _WordPageEditorScreenState();
}

class _WordPageEditorScreenState extends State<WordPageEditorScreen> {
  late final TextEditingController _title;
  late final TextEditingController _content;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.page.title);
    _content = TextEditingController(text: widget.page.content);
    _content.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  void _emit() {
    widget.onChanged(
      WordPage(
        id: widget.page.id,
        title: _title.text,
        content: _content.text,
        createdAt: widget.page.createdAt,
        updatedAt: DateTime.now(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final chars = _content.text.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('تحرير الصفحة'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _title,
            onChanged: (_) => _emit(),
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'عنوان الصفحة',
              prefixIcon: Icon(Icons.title),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'المحتوى',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: scheme.onSurface.withValues(alpha: 0.6),
                ),
          ),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _content,
                onChanged: (_) => _emit(),
                maxLines: null,
                minLines: 16,
                textAlignVertical: TextAlignVertical.top,
                decoration: const InputDecoration(
                  hintText: 'اكتب محتوى الصفحة هنا...',
                  border: InputBorder.none,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              '$chars حرف',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurface.withValues(alpha: 0.45),
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
