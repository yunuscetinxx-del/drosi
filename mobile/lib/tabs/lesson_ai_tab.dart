import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/chat_source_scope.dart';
import '../models/json_utils.dart';
import '../models/lesson.dart';
import '../models/lesson_analysis.dart';
import '../models/mind_map.dart';
import '../services/ai_service.dart';
import '../utils/lesson_ai_mindmap.dart';
import '../utils/lesson_chat_context.dart';

class LessonAiTab extends StatefulWidget {
  const LessonAiTab({
    super.key,
    required this.lesson,
    required this.onChanged,
    required this.onAddToNotes,
    this.onCreateMindMap,
    this.onAddToActiveMindMap,
  });

  final Lesson lesson;
  final ValueChanged<Lesson> onChanged;
  final ValueChanged<String> onAddToNotes;
  final void Function(String title, List<MindMapNode> nodes)? onCreateMindMap;
  final void Function(List<MindMapNode> nodes)? onAddToActiveMindMap;

  @override
  State<LessonAiTab> createState() => _LessonAiTabState();
}

class _LessonAiTabState extends State<LessonAiTab> {
  final _ai = AiService();
  final _chatController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _subjectController = TextEditingController();
  final _levelController = TextEditingController();

  bool _manualSubject = false;
  bool _analyzing = false;
  bool _chatLoading = false;
  String? _error;
  String? _uploadedImageUrl;
  String? _activeThreadId;

  @override
  void initState() {
    super.initState();
    _subjectController.text = widget.lesson.subject;
    final threads = widget.lesson.lessonChatThreads;
    if (threads.isNotEmpty) _activeThreadId = threads.first.id;
  }

  @override
  void dispose() {
    _chatController.dispose();
    _instructionsController.dispose();
    _subjectController.dispose();
    _levelController.dispose();
    super.dispose();
  }

  List<LessonChatThread> get _threads => widget.lesson.lessonChatThreads;

  LessonChatThread? get _activeThread {
    if (_activeThreadId == null) return _threads.isNotEmpty ? _threads.first : null;
    for (final t in _threads) {
      if (t.id == _activeThreadId) return t;
    }
    return _threads.isNotEmpty ? _threads.first : null;
  }

  ChatSourceScope get _scope => _activeThread?.sourceScope ?? ChatSourceScope.empty;

  void _persistThreads(List<LessonChatThread> threads) {
    widget.onChanged(widget.lesson.copyWith(lessonChatThreads: threads));
  }

  void _updateScope(ChatSourceScope scope) {
    final thread = _activeThread;
    if (thread == null) return;
    final updated = thread.copyWith(sourceScope: scope, updatedAt: DateTime.now());
    _persistThreads(_threads.map((t) => t.id == updated.id ? updated : t).toList());
  }

  void _toggleSource(String kind, String id, bool on) {
    final s = _scope;
    ChatSourceScope next;
    switch (kind) {
      case 'analysis':
        next = s.copyWith(
          analysisIds: on ? [...s.analysisIds, id] : s.analysisIds.where((x) => x != id).toList(),
        );
      case 'image':
        next = s.copyWith(
          imageIds: on ? [...s.imageIds, id] : s.imageIds.where((x) => x != id).toList(),
        );
      case 'note':
        next = s.copyWith(
          noteIds: on ? [...s.noteIds, id] : s.noteIds.where((x) => x != id).toList(),
        );
      case 'word':
        next = s.copyWith(
          wordPageIds: on ? [...s.wordPageIds, id] : s.wordPageIds.where((x) => x != id).toList(),
        );
      default:
        return;
    }
    _updateScope(next);
  }

  void _newThread() {
    final now = DateTime.now();
    final thread = LessonChatThread(
      id: newId(),
      title: 'جلسة جديدة',
      messages: [],
      createdAt: now,
      updatedAt: now,
    );
    _persistThreads([thread, ..._threads]);
    setState(() => _activeThreadId = thread.id);
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 85);
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final b64 = base64Encode(bytes);
    final mime = file.mimeType ?? 'image/jpeg';
    setState(() {
      _uploadedImageUrl = 'data:$mime;base64,$b64';
      _error = null;
    });
  }

  String? _resolveImageUrl() {
    if (_uploadedImageUrl != null) return _uploadedImageUrl;
    if (widget.lesson.images.isNotEmpty) return widget.lesson.images.first.url;
    return null;
  }

  Future<void> _analyze() async {
    final url = _resolveImageUrl();
    if (url == null) {
      setState(() => _error = 'اختر صورة من المعرض أو أضف صوراً للدرس');
      return;
    }
    setState(() {
      _analyzing = true;
      _error = null;
    });
    try {
      final result = await _ai.analyzeSchoolPage(
        url,
        instructions: _instructionsController.text,
        subject: _manualSubject ? _subjectController.text : null,
        level: _manualSubject ? _levelController.text : null,
        subjectMode: _manualSubject ? 'manual' : 'auto',
        lessonTitle: widget.lesson.title,
        lessonSubject: widget.lesson.subject,
      );

      final now = DateTime.now();
      final threadId = newId();
      final analysisId = newId();
      final title = result['title'] as String? ??
          '${result['detectedSubject'] ?? widget.lesson.subject} — تحليل صفحة';

      final entry = LessonAnalysisEntry(
        id: analysisId,
        type: 'school_page',
        title: title,
        subject: result['subject'] as String? ?? widget.lesson.subject,
        level: result['level'] as String?,
        summary: result['summary'] as String? ?? '',
        content: result['content'] as Map<String, dynamic>? ?? {},
        markdownReport: result['markdown'] as String? ?? '',
        chatThreadId: threadId,
        imageUrl: url,
        createdAt: now,
        updatedAt: now,
      );

      final thread = LessonChatThread(
        id: threadId,
        analysisId: analysisId,
        title: 'دردشة: $title',
        sourceScope: ChatSourceScope(analysisIds: [analysisId]),
        messages: [],
        createdAt: now,
        updatedAt: now,
      );

      widget.onChanged(
        widget.lesson.copyWith(
          lessonAnalyses: [entry, ...widget.lesson.lessonAnalyses],
          lessonChatThreads: [thread, ...widget.lesson.lessonChatThreads],
        ),
      );
      setState(() => _activeThreadId = threadId);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => _analyzing = false);
    }
  }

  Future<void> _sendChat() async {
    final msg = _chatController.text.trim();
    if (msg.isEmpty) return;

    var threads = [..._threads];
    LessonChatThread thread = _activeThread ??
        LessonChatThread(
          id: newId(),
          title: 'دردشة عامة',
          messages: [],
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

    if (!threads.any((t) => t.id == thread.id)) {
      threads = [thread, ...threads];
    }

    final userMsg = LessonChatMessage(
      id: newId(),
      role: 'user',
      content: msg,
      createdAt: DateTime.now(),
    );
    thread = thread.copyWith(
      messages: [...thread.messages, userMsg],
      updatedAt: DateTime.now(),
    );
    threads = threads.map((t) => t.id == thread.id ? thread : t).toList();
    widget.onChanged(widget.lesson.copyWith(lessonChatThreads: threads));
    _chatController.clear();
    setState(() {
      _chatLoading = true;
      _activeThreadId = thread.id;
    });

    final contextText = buildChatContextFromLesson(
      widget.lesson,
      thread.sourceScope,
      widget.lesson.lessonAnalyses,
    );

    try {
      final reply = await _ai.lessonChat(
        message: msg,
        lessonId: widget.lesson.id,
        lessonTitle: widget.lesson.title,
        lessonSubject: widget.lesson.subject,
        analysisId: thread.analysisId,
        contextText: contextText,
        analyses: widget.lesson.lessonAnalyses,
        previousMessages: thread.messages
            .where((m) => m.id != userMsg.id)
            .map((m) => {'role': m.role, 'content': m.content})
            .toList(),
      );

      final assistantMsg = LessonChatMessage(
        id: newId(),
        role: 'assistant',
        content: reply,
        createdAt: DateTime.now(),
      );
      thread = thread.copyWith(
        messages: [...thread.messages, assistantMsg],
        updatedAt: DateTime.now(),
      );
      threads = threads.map((t) => t.id == thread.id ? thread : t).toList();
      widget.onChanged(widget.lesson.copyWith(lessonChatThreads: threads));
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => _chatLoading = false);
    }
  }

  Future<void> _createMindMapFromSources() async {
    final scope = _scope;
    if (scope.count == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('اختر مصادراً أولاً')),
      );
      return;
    }
    final nodes = buildMindMapNodesFromSources(
      widget.lesson.title,
      widget.lesson,
      scope,
      widget.lesson.lessonAnalyses,
    );
    if (nodes.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('لا توجد عقد كافية من المصادر')),
      );
      return;
    }

    if (widget.lesson.mindMaps.isEmpty) {
      widget.onCreateMindMap?.call('خريطة من المصادر', nodes);
      return;
    }

    final choice = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('خريطة ذهنية'),
        content: const Text('إنشاء خريطة جديدة أم إضافة للخريطة النشطة؟'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, 'new'), child: const Text('جديدة')),
          TextButton(onPressed: () => Navigator.pop(ctx, 'add'), child: const Text('إضافة')),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
        ],
      ),
    );
    if (choice == 'new') {
      widget.onCreateMindMap?.call('خريطة من المصادر', nodes);
    } else if (choice == 'add') {
      widget.onAddToActiveMindMap?.call(nodes);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final analyses = widget.lesson.lessonAnalyses;
    final thread = _activeThread;
    final scope = _scope;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Row(
          children: [
            Icon(Icons.auto_awesome, color: scheme.primary, size: 22),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'مساحة الذكاء',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            if (scope.count > 0)
              Chip(
                label: Text('${scope.count} مصدر'),
                visualDensity: VisualDensity.compact,
              ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'حلّل صفحات الكتاب، اختر المصادر، واسأل — مثل NotebookLM',
          style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.55)),
        ),
        const SizedBox(height: 16),
        _sectionTitle(context, 'المصادر'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (analyses.isEmpty && widget.lesson.images.isEmpty &&
                    widget.lesson.lessonNotes.isEmpty && widget.lesson.wordPages.isEmpty)
                  Text('لا مصادر — أضف صوراً أو ملاحظات أو حلّل صفحة',
                      style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13))
                else ...[
                  if (analyses.isNotEmpty) ...[
                    Text('تحليلات', style: TextStyle(fontSize: 12, color: scheme.primary, fontWeight: FontWeight.bold)),
                    ...analyses.map((a) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: scope.analysisIds.contains(a.id),
                          onChanged: (v) => _toggleSource('analysis', a.id, v == true),
                          title: Text(a.title, style: const TextStyle(fontSize: 13)),
                          subtitle: Text(a.summary, maxLines: 1, overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 11)),
                        )),
                  ],
                  if (widget.lesson.images.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('صور', style: TextStyle(fontSize: 12, color: scheme.primary, fontWeight: FontWeight.bold)),
                    ...widget.lesson.images.map((img) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: scope.imageIds.contains(img.id),
                          onChanged: (v) => _toggleSource('image', img.id, v == true),
                          title: Text('صورة ${img.id.substring(0, 6)}…', style: const TextStyle(fontSize: 13)),
                        )),
                  ],
                  if (widget.lesson.lessonNotes.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('ملاحظات', style: TextStyle(fontSize: 12, color: scheme.primary, fontWeight: FontWeight.bold)),
                    ...widget.lesson.lessonNotes.map((n) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: scope.noteIds.contains(n.id),
                          onChanged: (v) => _toggleSource('note', n.id, v == true),
                          title: Text(n.title, style: const TextStyle(fontSize: 13)),
                        )),
                  ],
                  if (widget.lesson.wordPages.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text('صفحات Word', style: TextStyle(fontSize: 12, color: scheme.primary, fontWeight: FontWeight.bold)),
                    ...widget.lesson.wordPages.map((p) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: scope.wordPageIds.contains(p.id),
                          onChanged: (v) => _toggleSource('word', p.id, v == true),
                          title: Text(p.title, style: const TextStyle(fontSize: 13)),
                        )),
                  ],
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _sectionTitle(context, 'الجلسات')),
            TextButton.icon(
              onPressed: _newThread,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('جلسة'),
            ),
          ],
        ),
        if (_threads.isEmpty)
          Text('لا جلسات — أنشئ جلسة أو حلّل صفحة', style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5)))
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _threads.map((t) {
                final selected = t.id == _activeThreadId;
                return Padding(
                  padding: const EdgeInsets.only(left: 6),
                  child: FilterChip(
                    label: Text(t.title, style: const TextStyle(fontSize: 12)),
                    selected: selected,
                    onSelected: (_) => setState(() => _activeThreadId = t.id),
                  ),
                );
              }).toList(),
            ),
          ),
        const Divider(height: 32),
        _sectionTitle(context, 'تحليل صفحة مدرسية'),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('تحديد المادة يدوياً', style: TextStyle(fontSize: 14)),
          value: _manualSubject,
          onChanged: (v) => setState(() => _manualSubject = v),
        ),
        if (_manualSubject) ...[
          TextField(
            controller: _subjectController,
            decoration: const InputDecoration(labelText: 'المادة', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _levelController,
            decoration: const InputDecoration(labelText: 'المستوى', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 8),
        ],
        Row(
          children: [
            FilledButton.tonalIcon(
              onPressed: _pickImage,
              icon: const Icon(Icons.photo_library_outlined),
              label: const Text('صورة'),
            ),
            const SizedBox(width: 8),
            FilledButton.icon(
              onPressed: _analyzing ? null : _analyze,
              icon: _analyzing
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.document_scanner_outlined),
              label: Text(_analyzing ? 'جاري...' : 'تحليل'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _instructionsController,
          decoration: const InputDecoration(
            labelText: 'تعليمات إضافية',
            hintText: 'ركّز على التمرين 11...',
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: TextStyle(color: scheme.error, fontSize: 13)),
        ],
        const Divider(height: 32),
        _sectionTitle(context, 'الدردشة'),
        Container(
          constraints: const BoxConstraints(minHeight: 140, maxHeight: 260),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: scheme.outlineVariant),
            borderRadius: BorderRadius.circular(12),
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.35),
          ),
          child: ListView(
            children: [
              if (thread == null || thread.messages.isEmpty)
                Text('اسأل عن تمرين أو قاعدة من المصادر المحددة',
                    style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13))
              else
                ...thread.messages.map((m) => Align(
                      alignment: m.role == 'user' ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        constraints: const BoxConstraints(maxWidth: 300),
                        decoration: BoxDecoration(
                          color: m.role == 'user' ? scheme.primary : scheme.surface,
                          borderRadius: BorderRadius.circular(10),
                          border: m.role == 'assistant' ? Border.all(color: scheme.outlineVariant) : null,
                        ),
                        child: Text(
                          m.content,
                          style: TextStyle(
                            fontSize: 13,
                            color: m.role == 'user' ? scheme.onPrimary : scheme.onSurface,
                          ),
                        ),
                      ),
                    )),
              if (_chatLoading)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Row(children: [
                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                    SizedBox(width: 8),
                    Text('يفكّر...', style: TextStyle(fontSize: 12)),
                  ]),
                ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _chatController,
                decoration: const InputDecoration(
                  hintText: 'سؤالك عن المصادر...',
                  border: OutlineInputBorder(),
                ),
                onSubmitted: (_) => _sendChat(),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: _chatLoading ? null : _sendChat,
              icon: const Icon(Icons.send),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            if (analyses.isNotEmpty)
              OutlinedButton.icon(
                onPressed: () {
                  final a = analyses.firstWhere(
                    (x) => scope.analysisIds.contains(x.id),
                    orElse: () => analyses.first,
                  );
                  widget.onAddToNotes(a.markdownReport);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('أُضيف إلى الملاحظات')),
                  );
                },
                icon: const Icon(Icons.sticky_note_2_outlined, size: 18),
                label: const Text('إلى ملاحظات'),
              ),
            OutlinedButton.icon(
              onPressed: scope.count > 0 ? _createMindMapFromSources : null,
              icon: const Icon(Icons.account_tree_outlined, size: 18),
              label: const Text('خريطة ذهنية'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _sectionTitle(BuildContext context, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
      ),
    );
  }
}
