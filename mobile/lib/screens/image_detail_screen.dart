import 'package:flutter/material.dart';

import '../models/json_utils.dart';
import '../models/lesson_image.dart';
import '../services/ai_service.dart';
import '../widgets/lesson_image_view.dart';

class ImageDetailScreen extends StatefulWidget {
  const ImageDetailScreen({
    super.key,
    required this.image,
    required this.onChanged,
    required this.onAddToNotes,
  });

  final LessonImage image;
  final ValueChanged<LessonImage> onChanged;
  final ValueChanged<String> onAddToNotes;

  @override
  State<ImageDetailScreen> createState() => _ImageDetailScreenState();
}

class _ImageDetailScreenState extends State<ImageDetailScreen> {
  final _ai = AiService();
  late LessonImage _image;
  bool _analyzing = false;

  @override
  void initState() {
    super.initState();
    _image = widget.image;
  }

  void _update(LessonImage next) {
    setState(() => _image = next);
    widget.onChanged(next);
  }

  Future<void> _analyze() async {
    final instructions = await _askInstructions();
    if (instructions == null) return; // أُلغي
    setState(() => _analyzing = true);
    try {
      final analysis = await _ai.analyzeImage(
        _image.url,
        instructions: instructions.isEmpty ? null : instructions,
      );
      _update(LessonImage(
        id: _image.id,
        url: _image.url,
        annotations: _image.annotations,
        aiAnalysis: analysis,
      ));
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

  Future<String?> _askInstructions() {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تحليل الصورة'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('تعليمات اختيارية للذكاء الاصطناعي:'),
            const SizedBox(height: 8),
            TextField(
              controller: controller,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'مثال: ركّز على الرموز الكيميائية',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, controller.text.trim()),
            child: const Text('تحليل'),
          ),
        ],
      ),
    );
  }

  Future<void> _addAnnotation() async {
    final controller = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تعليق / تمييز'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 2,
          decoration: const InputDecoration(
            hintText: 'اكتب الملاحظة',
            border: OutlineInputBorder(),
          ),
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
    if (note == null || note.isEmpty) return;
    final annotation = ImageAnnotation(
      id: newId(),
      x: 10,
      y: 10,
      width: 30,
      height: 20,
      color: '#f59e0b',
      note: note,
      createdAt: DateTime.now(),
    );
    _update(LessonImage(
      id: _image.id,
      url: _image.url,
      annotations: [..._image.annotations, annotation],
      aiAnalysis: _image.aiAnalysis,
    ));
  }

  void _removeAnnotation(String id) {
    _update(LessonImage(
      id: _image.id,
      url: _image.url,
      annotations: _image.annotations.where((a) => a.id != id).toList(),
      aiAnalysis: _image.aiAnalysis,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final analysis = _image.aiAnalysis;
    return Scaffold(
      appBar: AppBar(
        title: const Text('الصورة'),
        actions: [
          IconButton(
            tooltip: 'تعليق',
            onPressed: _addAnnotation,
            icon: const Icon(Icons.add_comment_outlined),
          ),
        ],
      ),
      body: ListView(
        children: [
          InteractiveViewer(
            maxScale: 5,
            child: LessonImageView(
              url: _image.url,
              fit: BoxFit.contain,
              height: 300,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: FilledButton.tonalIcon(
              onPressed: _analyzing ? null : _analyze,
              icon: _analyzing
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome),
              label: Text(
                _analyzing ? 'جارٍ التحليل...' : 'تحليل الصورة بالذكاء الاصطناعي',
              ),
            ),
          ),
          if (_image.annotations.isNotEmpty) ...[
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerRight,
                child: Text('التعليقات',
                    style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            ..._image.annotations.map(
              (a) => ListTile(
                leading: const Icon(Icons.label_important_outline,
                    color: Colors.amber),
                title: Text(a.note),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _removeAnnotation(a.id),
                ),
              ),
            ),
          ],
          if (analysis != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: _ImageAnalysisCard(
                analysis: analysis,
                onAddToNotes: widget.onAddToNotes,
              ),
            ),
        ],
      ),
    );
  }
}

class _ImageAnalysisCard extends StatelessWidget {
  const _ImageAnalysisCard({
    required this.analysis,
    required this.onAddToNotes,
  });

  final ImageAIAnalysis analysis;
  final ValueChanged<String> onAddToNotes;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      color: theme.colorScheme.secondaryContainer.withValues(alpha: 0.4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, size: 20),
                const SizedBox(width: 8),
                Text('تحليل الصورة', style: theme.textTheme.titleMedium),
                const Spacer(),
                IconButton(
                  tooltip: 'إضافة للملاحظات',
                  icon: const Icon(Icons.note_add_outlined),
                  onPressed: () => onAddToNotes(_asText()),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(analysis.description),
            _section('عناصر رئيسية', analysis.keyElements),
            _section('ملاحظات دراسية', analysis.studyNotes),
            _section('مفاهيم مرتبطة', analysis.relatedConcepts),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, List<String> items) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          ...items.map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('•  '),
                    Expanded(child: Text(e)),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  String _asText() {
    final buf = StringBuffer(analysis.description);
    if (analysis.studyNotes.isNotEmpty) {
      buf.write('\n\nملاحظات دراسية:\n');
      buf.writeAll(analysis.studyNotes.map((e) => '• $e'), '\n');
    }
    return buf.toString();
  }
}
