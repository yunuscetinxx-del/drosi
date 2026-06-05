import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/lesson.dart';
import '../models/lesson_analysis.dart';
import '../models/json_utils.dart';
import '../services/ai_service.dart';

class LessonAiTab extends StatefulWidget {
  const LessonAiTab({
    super.key,
    required this.lesson,
    required this.onChanged,
    required this.onAddToNotes,
  });

  final Lesson lesson;
  final ValueChanged<Lesson> onChanged;
  final ValueChanged<String> onAddToNotes;

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
  String? _activeAnalysisId;
  String? _activeThreadId;

  @override
  void initState() {
    super.initState();
    _subjectController.text = widget.lesson.subject;
    if (widget.lesson.lessonAnalyses.isNotEmpty) {
      _activeAnalysisId = widget.lesson.lessonAnalyses.first.id;
      _activeThreadId = widget.lesson.lessonAnalyses.first.chatThreadId;
    }
  }

  @override
  void dispose() {
    _chatController.dispose();
    _instructionsController.dispose();
    _subjectController.dispose();
    _levelController.dispose();
    super.dispose();
  }

  LessonAnalysisEntry? get _activeAnalysis {
    if (_activeAnalysisId == null) return null;
    try {
      return widget.lesson.lessonAnalyses.firstWhere((a) => a.id == _activeAnalysisId);
    } catch (_) {
      return widget.lesson.lessonAnalyses.isNotEmpty ? widget.lesson.lessonAnalyses.first : null;
    }
  }

  LessonChatThread? get _activeThread {
    if (_activeThreadId == null) return null;
    try {
      return widget.lesson.lessonChatThreads.firstWhere((t) => t.id == _activeThreadId);
    } catch (_) {
      return null;
    }
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
      setState(() {
        _activeAnalysisId = analysisId;
        _activeThreadId = threadId;
      });
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      setState(() => _analyzing = false);
    }
  }

  Future<void> _sendChat() async {
    final msg = _chatController.text.trim();
    if (msg.isEmpty) return;

    final analysis = _activeAnalysis;
    var threads = [...widget.lesson.lessonChatThreads];
    LessonChatThread thread = _activeThread ??
        LessonChatThread(
          id: newId(),
          analysisId: analysis?.id,
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
    thread = LessonChatThread(
      id: thread.id,
      analysisId: thread.analysisId,
      title: thread.title,
      messages: [...thread.messages, userMsg],
      createdAt: thread.createdAt,
      updatedAt: DateTime.now(),
    );
    threads = threads.map((t) => t.id == thread.id ? thread : t).toList();
    widget.onChanged(widget.lesson.copyWith(lessonChatThreads: threads));
    _chatController.clear();
    setState(() {
      _chatLoading = true;
      _activeThreadId = thread.id;
    });

    try {
      final reply = await _ai.lessonChat(
        message: msg,
        lessonId: widget.lesson.id,
        lessonTitle: widget.lesson.title,
        lessonSubject: widget.lesson.subject,
        analysisId: analysis?.id,
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
      thread = LessonChatThread(
        id: thread.id,
        analysisId: thread.analysisId,
        title: thread.title,
        messages: [...thread.messages, assistantMsg],
        createdAt: thread.createdAt,
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

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final analyses = widget.lesson.lessonAnalyses;
    final thread = _activeThread;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        Text(
          'تحليل صفحات الكتاب المدرسي',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          'ارفع صورة الدرس — يحلّل التمارين والقواعد ويتعلّم من أسئلتك',
          style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.55)),
        ),
        const SizedBox(height: 12),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('تحديد المادة يدوياً'),
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
                  ? const SizedBox(
                      width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.auto_awesome),
              label: Text(_analyzing ? 'جاري التحليل...' : 'تحليل'),
            ),
          ],
        ),
        if (_resolveImageUrl() != null) ...[
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              _resolveImageUrl()!,
              height: 120,
              fit: BoxFit.contain,
              errorBuilder: (_, _, _) => const SizedBox.shrink(),
            ),
          ),
        ],
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
        Text('سجل التحليلات (${analyses.length})',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        if (analyses.isEmpty)
          Text('لا تحليلات بعد', style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5)))
        else
          ...analyses.map((a) {
            final selected = a.id == _activeAnalysisId;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              color: selected ? scheme.primaryContainer.withValues(alpha: 0.3) : null,
              child: InkWell(
                onTap: () => setState(() {
                  _activeAnalysisId = a.id;
                  _activeThreadId = a.chatThreadId;
                }),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(a.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                          TextButton(
                            onPressed: () => widget.onAddToNotes(a.markdownReport),
                            child: const Text('ملاحظات'),
                          ),
                        ],
                      ),
                      Text(a.summary, maxLines: 2, overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 13, color: scheme.onSurface.withValues(alpha: 0.7))),
                      if (selected && a.markdownReport.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(a.markdownReport,
                            style: const TextStyle(fontSize: 12, height: 1.4)),
                      ],
                    ],
                  ),
                ),
              ),
            );
          }),
        const Divider(height: 32),
        Text('استفسار عن الدرس',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        Container(
          constraints: const BoxConstraints(minHeight: 120, maxHeight: 220),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            border: Border.all(color: scheme.outlineVariant),
            borderRadius: BorderRadius.circular(12),
            color: scheme.surfaceContainerHighest.withValues(alpha: 0.35),
          ),
          child: ListView(
            children: [
              if (thread == null || thread.messages.isEmpty)
                Text('اسأل عن تمرين أو قاعدة محددة',
                    style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5), fontSize: 13))
              else
                ...thread.messages.map((m) => Align(
                      alignment: m.role == 'user' ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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
                  hintText: 'سؤالك...',
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
      ],
    );
  }
}
