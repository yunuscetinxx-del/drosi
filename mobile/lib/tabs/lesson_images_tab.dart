import 'package:flutter/material.dart';

import '../models/lesson.dart';
import '../models/lesson_image.dart';
import '../screens/image_detail_screen.dart';
import '../screens/lesson_detail_screen.dart' show LessonItemFactory;
import '../services/image_service.dart';
import '../widgets/lesson_image_view.dart';

class LessonImagesTab extends StatefulWidget {
  const LessonImagesTab({
    super.key,
    required this.lesson,
    required this.onImagesChanged,
    required this.onAddToNotes,
  });

  final Lesson lesson;
  final ValueChanged<List<LessonImage>> onImagesChanged;
  final ValueChanged<String> onAddToNotes;

  @override
  State<LessonImagesTab> createState() => _LessonImagesTabState();
}

class _LessonImagesTabState extends State<LessonImagesTab> {
  final _imageService = ImageService();
  bool _busy = false;

  List<LessonImage> get _images => widget.lesson.images;

  Future<void> _addImages(List<String> urls) async {
    if (urls.isEmpty) return;
    final next = [
      ..._images,
      ...urls.map(LessonItemFactory.image),
    ];
    widget.onImagesChanged(next);
  }

  Future<void> _pickFromCamera() async {
    setState(() => _busy = true);
    try {
      final url = await _imageService.captureFromCamera();
      if (url != null) await _addImages([url]);
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pickFromGallery() async {
    setState(() => _busy = true);
    try {
      final urls = await _imageService.pickMultipleFromGallery();
      await _addImages(urls);
    } catch (e) {
      _showError(e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(Object e) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
    );
  }

  void _replaceImage(LessonImage updated) {
    widget.onImagesChanged(
      _images.map((img) => img.id == updated.id ? updated : img).toList(),
    );
  }

  void _removeImage(String id) {
    widget.onImagesChanged(_images.where((img) => img.id != id).toList());
  }

  Future<void> _openImage(LessonImage image) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ImageDetailScreen(
          image: image,
          onChanged: _replaceImage,
          onAddToNotes: widget.onAddToNotes,
        ),
      ),
    );
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        if (_images.isEmpty)
          _EmptyImages()
        else
          GridView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: _images.length,
            itemBuilder: (context, i) {
              final image = _images[i];
              return _ImageTile(
                image: image,
                onTap: () => _openImage(image),
                onDelete: () => _confirmDelete(image),
              );
            },
          ),
        if (_busy)
          const Positioned.fill(
            child: ColoredBox(
              color: Colors.black26,
              child: Center(child: CircularProgressIndicator()),
            ),
          ),
        Positioned(
          right: 16,
          bottom: 16,
          child: Row(
            children: [
              FloatingActionButton.small(
                heroTag: 'cam',
                onPressed: _busy ? null : _pickFromCamera,
                child: const Icon(Icons.camera_alt),
              ),
              const SizedBox(width: 12),
              FloatingActionButton.extended(
                heroTag: 'gallery',
                onPressed: _busy ? null : _pickFromGallery,
                icon: const Icon(Icons.photo_library),
                label: const Text('من المعرض'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _confirmDelete(LessonImage image) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف الصورة؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok == true) _removeImage(image.id);
  }
}

class _ImageTile extends StatelessWidget {
  const _ImageTile({
    required this.image,
    required this.onTap,
    required this.onDelete,
  });

  final LessonImage image;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            LessonImageView(url: image.url),
            Positioned(
              top: 4,
              left: 4,
              child: Row(
                children: [
                  if (image.annotations.isNotEmpty)
                    _badge(Icons.comment, '${image.annotations.length}',
                        Colors.amber),
                  if (image.aiAnalysis != null)
                    _badge(Icons.auto_awesome, null, Colors.deepPurple),
                ],
              ),
            ),
            Positioned(
              top: 4,
              right: 4,
              child: InkWell(
                onTap: onDelete,
                child: const CircleAvatar(
                  radius: 14,
                  backgroundColor: Colors.black54,
                  child: Icon(Icons.close, size: 16, color: Colors.white),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badge(IconData icon, String? label, Color color) {
    return Container(
      margin: const EdgeInsets.only(right: 4),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.white),
          if (label != null) ...[
            const SizedBox(width: 2),
            Text(label,
                style: const TextStyle(color: Colors.white, fontSize: 11)),
          ],
        ],
      ),
    );
  }
}

class _EmptyImages extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.add_photo_alternate_outlined,
              size: 64, color: Theme.of(context).disabledColor),
          const SizedBox(height: 12),
          const Text('أضف صوراً من الكاميرا أو المعرض'),
          const SizedBox(height: 4),
          Text(
            'تُرفع للموقع تلقائياً عند الحفظ',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
