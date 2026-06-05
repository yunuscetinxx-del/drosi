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
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
      children: [
        _SectionLabel('المعلومات الأساسية'),
        _card([
          _field(_title, 'عنوان الدرس', icon: Icons.title),
          const SizedBox(height: 12),
          _field(_subject, 'المادة', icon: Icons.category_outlined),
          const SizedBox(height: 12),
          _field(_description, 'الوصف', maxLines: 3, icon: Icons.notes),
        ]),
        const SizedBox(height: 20),
        Row(
          children: [
            _SectionLabel('النقاط الرئيسية'),
            const Spacer(),
            TextButton.icon(
              onPressed: _addKeyPoint,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('إضافة'),
            ),
          ],
        ),
        if (widget.lesson.keyPoints.isEmpty)
          _card([
            Row(
              children: [
                Icon(Icons.lightbulb_outline,
                    color: Theme.of(context).colorScheme.outline),
                const SizedBox(width: 8),
                Text('لا توجد نقاط بعد',
                    style: Theme.of(context).textTheme.bodyMedium),
              ],
            ),
          ])
        else
          ...widget.lesson.keyPoints.asMap().entries.map(
                (e) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 13,
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
        const SizedBox(height: 20),
        _SectionLabel('الملخص والملاحظات'),
        _card([
          _field(_summary, 'الملخص', maxLines: 4, icon: Icons.summarize),
          const SizedBox(height: 12),
          _field(_notes, 'الملاحظات', maxLines: 6, icon: Icons.sticky_note_2_outlined),
        ]),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: _analyzing ? null : _runAnalysis,
          icon: _analyzing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Icon(Icons.auto_awesome),
          label: Text(_analyzing
              ? 'جارٍ التحليل...'
              : 'تحليل الدرس بالذكاء الاصطناعي'),
        ),
        if (_analysis != null) ...[
          const SizedBox(height: 16),
          _AnalysisCard(analysis: _analysis!),
        ],
      ],
    );
  }

  Widget _card(List<Widget> children) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: children,
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {int maxLines = 1, IconData? icon}) {
    return TextField(
      controller: c,
      maxLines: maxLines,
      onChanged: (_) => _emit(),
      decoration: InputDecoration(
        labelText: label,
        alignLabelWithHint: maxLines > 1,
        prefixIcon: icon != null
            ? Padding(
                padding: EdgeInsets.only(bottom: maxLines > 1 ? (maxLines - 1) * 22.0 : 0),
                child: Icon(icon),
              )
            : null,
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
      child: Text(
        text,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color:
                  Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
            ),
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
