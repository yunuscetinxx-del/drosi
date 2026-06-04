import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../services/ai_service.dart';

class LessonDetailsTab extends StatefulWidget {
  const LessonDetailsTab({
    super.key,
    required this.lesson,
    required this.onChanged,
  });

  final Lesson lesson;
  final ValueChanged<Lesson> onChanged;

  @override
  State<LessonDetailsTab> createState() => _LessonDetailsTabState();
}

class _LessonDetailsTabState extends State<LessonDetailsTab> {
  late final TextEditingController _title;
  late final TextEditingController _subject;
  late final TextEditingController _description;
  late final TextEditingController _summary;
  late final TextEditingController _notes;
  final _ai = AiService();

  bool _analyzing = false;
  LessonAnalysis? _analysis;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.lesson.title);
    _subject = TextEditingController(text: widget.lesson.subject);
    _description = TextEditingController(text: widget.lesson.description);
    _summary = TextEditingController(text: widget.lesson.summary);
    _notes = TextEditingController(text: widget.lesson.notes);
  }

  @override
  void dispose() {
    _title.dispose();
    _subject.dispose();
    _description.dispose();
    _summary.dispose();
    _notes.dispose();
    super.dispose();
  }

  void _emit() {
    widget.onChanged(
      widget.lesson.copyWith(
        title: _title.text,
        subject: _subject.text,
        description: _description.text,
        summary: _summary.text,
        notes: _notes.text,
      ),
    );
  }

  Future<void> _addKeyPoint() async {
    final controller = TextEditingController();
    final value = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('نقطة رئيسية'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'اكتب النقطة'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('إضافة'),
          ),
        ],
      ),
    );
    if (value != null && value.isNotEmpty) {
      widget.onChanged(
        widget.lesson.copyWith(keyPoints: [...widget.lesson.keyPoints, value]),
      );
    }
  }

  void _removeKeyPoint(int index) {
    final next = [...widget.lesson.keyPoints]..removeAt(index);
    widget.onChanged(widget.lesson.copyWith(keyPoints: next));
  }

  Future<void> _runAnalysis() async {
    setState(() => _analyzing = true);
    try {
      final result = await _ai.analyzeLesson(widget.lesson);
      if (mounted) setState(() => _analysis = result);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _analyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _field(_title, 'عنوان الدرس'),
        const SizedBox(height: 12),
        _field(_subject, 'المادة'),
        const SizedBox(height: 12),
        _field(_description, 'الوصف', maxLines: 3),
        const SizedBox(height: 20),
        Row(
          children: [
            Text('النقاط الرئيسية', style: theme.textTheme.titleMedium),
            const Spacer(),
            TextButton.icon(
              onPressed: _addKeyPoint,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('إضافة'),
            ),
          ],
        ),
        if (widget.lesson.keyPoints.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('لا توجد نقاط بعد',
                style: theme.textTheme.bodySmall),
          )
        else
          ...widget.lesson.keyPoints.asMap().entries.map(
                (e) => Card(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 12,
                      child: Text('${e.key + 1}',
                          style: const TextStyle(fontSize: 12)),
                    ),
                    title: Text(e.value),
                    trailing: IconButton(
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () => _removeKeyPoint(e.key),
                    ),
                  ),
                ),
              ),
        const SizedBox(height: 16),
        _field(_summary, 'الملخص', maxLines: 4),
        const SizedBox(height: 12),
        _field(_notes, 'الملاحظات', maxLines: 6),
        const SizedBox(height: 20),
        FilledButton.tonalIcon(
          onPressed: _analyzing ? null : _runAnalysis,
          icon: _analyzing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.auto_awesome),
          label: Text(_analyzing ? 'جارٍ التحليل...' : 'تحليل الدرس بالذكاء الاصطناعي'),
        ),
        if (_analysis != null) ...[
          const SizedBox(height: 16),
          _AnalysisCard(analysis: _analysis!),
        ],
      ],
    );
  }

  Widget _field(TextEditingController c, String label, {int maxLines = 1}) {
    return TextField(
      controller: c,
      maxLines: maxLines,
      onChanged: (_) => _emit(),
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
    );
  }
}

class _AnalysisCard extends StatelessWidget {
  const _AnalysisCard({required this.analysis});
  final LessonAnalysis analysis;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.primaryContainer.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, size: 20),
                const SizedBox(width: 8),
                Text('تحليل الذكاء الاصطناعي',
                    style: theme.textTheme.titleMedium),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text('الصعوبة: ${analysis.difficulty}')),
                Chip(label: Text('الاكتمال: ${analysis.completeness}%')),
                Chip(label: Text('الوقت: ${analysis.estimatedStudyTime}')),
              ],
            ),
            if (analysis.summary.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(analysis.summary),
            ],
            _section('نقاط القوة', analysis.strengths, Icons.check_circle,
                Colors.green),
            _section('تحسينات مقترحة', analysis.improvements,
                Icons.lightbulb_outline, Colors.orange),
            _section('نصائح دراسية', analysis.studyTips, Icons.school,
                Colors.blue),
            _section('مواضيع مرتبطة', analysis.relatedTopics, Icons.link,
                Colors.purple),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<String> items, IconData icon, Color color) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, size: 16, color: color),
                  const SizedBox(width: 6),
                  Expanded(child: Text(item)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
