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
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _title,
          onChanged: (_) => _emit(),
          decoration: const InputDecoration(
            hintText: 'عنوان الصفحة',
            border: InputBorder.none,
          ),
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: TextField(
          controller: _content,
          onChanged: (_) => _emit(),
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          decoration: const InputDecoration(
            hintText: 'اكتب محتوى الصفحة هنا...',
            border: OutlineInputBorder(),
          ),
        ),
      ),
    );
  }
}
