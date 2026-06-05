import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/lesson.dart';
import '../services/share_service.dart';

class ShareLessonSheet {
  static Future<void> show(BuildContext context, {required Lesson lesson}) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _ShareLessonSheetBody(lesson: lesson),
    );
  }
}

class _ShareLessonSheetBody extends StatefulWidget {
  const _ShareLessonSheetBody({required this.lesson});
  final Lesson lesson;

  @override
  State<_ShareLessonSheetBody> createState() => _ShareLessonSheetBodyState();
}

class _ShareLessonSheetBodyState extends State<_ShareLessonSheetBody> {
  final _share = ShareService();
  List<LessonShareInfo> _shares = [];
  bool _loading = true;
  bool _creating = false;
  String? _error;
  String _permission = 'read';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final shares = await _share.listShares(widget.lesson.id);
      if (mounted) setState(() => _shares = shares);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    setState(() => _creating = true);
    try {
      await _share.createShare(
        lessonId: widget.lesson.id,
        permission: _permission,
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إنشاء رابط المشاركة')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  Future<void> _revoke(LessonShareInfo info) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إلغاء الرابط؟'),
        content: const Text('لن يتمكن أحد من فتح الدرس عبر هذا الرابط.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حذف')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _share.revokeShare(info.id);
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 0, 16, MediaQuery.paddingOf(context).bottom + 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('مشاركة الدرس', style: Theme.of(context).textTheme.titleLarge),
          Text(
            widget.lesson.title.isEmpty ? 'بدون عنوان' : widget.lesson.title,
            style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.6)),
          ),
          const SizedBox(height: 16),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'read', label: Text('قراءة'), icon: Icon(Icons.visibility_outlined)),
              ButtonSegment(value: 'edit', label: Text('تعديل'), icon: Icon(Icons.edit_outlined)),
            ],
            selected: {_permission},
            onSelectionChanged: (s) => setState(() => _permission = s.first),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _creating ? null : _create,
            icon: _creating
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.link),
            label: const Text('إنشاء رابط مشاركة'),
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
          else if (_error != null)
            Text(_error!, style: TextStyle(color: scheme.error))
          else if (_shares.isEmpty)
            Text('لا روابط بعد', style: TextStyle(color: scheme.onSurface.withValues(alpha: 0.5)))
          else
            ..._shares.where((s) => s.active).map((s) => Card(
                  child: ListTile(
                    title: Text(s.permission == 'edit' ? 'تعديل' : 'قراءة فقط'),
                    subtitle: Text(s.shareUrl, maxLines: 2, overflow: TextOverflow.ellipsis),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _revoke(s),
                    ),
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: s.shareUrl));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('تم نسخ الرابط')),
                      );
                    },
                  ),
                )),
        ],
      ),
    );
  }
}
