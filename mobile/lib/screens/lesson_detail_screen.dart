import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/lesson.dart';
import '../models/lesson_image.dart';
import '../models/mind_map.dart';
import '../models/word_page.dart';
import '../providers/app_state.dart';
import '../tabs/lesson_details_tab.dart';
import '../tabs/lesson_images_tab.dart';
import '../tabs/lesson_mind_maps_tab.dart';
import '../tabs/lesson_word_pages_tab.dart';

class LessonDetailScreen extends StatefulWidget {
  const LessonDetailScreen({super.key, required this.lesson});
  final Lesson lesson;

  @override
  State<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends State<LessonDetailScreen> {
  late Lesson _lesson;
  bool _dirty = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _lesson = widget.lesson;
  }

  /// تحديث محلي للدرس مع وضع علامة "غير محفوظ".
  void _patch(Lesson updated) {
    setState(() {
      _lesson = updated.copyWith(updatedAt: DateTime.now());
      _dirty = true;
    });
  }

  Future<bool> _save() async {
    if (!_dirty) return true;
    setState(() => _saving = true);
    try {
      await context.read<AppState>().updateLesson(_lesson);
      if (mounted) {
        setState(() => _dirty = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم الحفظ ومزامنته مع الموقع')),
        );
      }
      return true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
      return false;
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<bool> _onWillPop() async {
    if (!_dirty) return true;
    final action = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تغييرات غير محفوظة'),
        content: const Text('هل تريد حفظ التغييرات قبل الخروج؟'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'cancel'),
            child: const Text('إلغاء'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, 'discard'),
            child: const Text('تجاهل'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, 'save'),
            child: const Text('حفظ'),
          ),
        ],
      ),
    );
    if (action == 'save') return _save();
    if (action == 'discard') return true;
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final navigator = Navigator.of(context);
        if (await _onWillPop()) {
          navigator.pop();
        }
      },
      child: DefaultTabController(
        length: 4,
        child: Scaffold(
          appBar: AppBar(
            title: Text(
              _lesson.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            actions: [
              if (_saving)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              else
                IconButton(
                  tooltip: 'حفظ',
                  onPressed: _dirty ? _save : null,
                  icon: Icon(
                    Icons.save,
                    color: _dirty ? null : Theme.of(context).disabledColor,
                  ),
                ),
            ],
            bottom: const TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.center,
              tabs: [
                Tab(icon: Icon(Icons.description_outlined), text: 'التفاصيل'),
                Tab(icon: Icon(Icons.image_outlined), text: 'الصور'),
                Tab(icon: Icon(Icons.account_tree_outlined), text: 'الخرائط'),
                Tab(icon: Icon(Icons.article_outlined), text: 'صفحات'),
              ],
            ),
          ),
          body: TabBarView(
            children: [
              LessonDetailsTab(
                lesson: _lesson,
                onChanged: _patch,
              ),
              LessonImagesTab(
                lesson: _lesson,
                onImagesChanged: (images) =>
                    _patch(_lesson.copyWith(images: images)),
                onAddToNotes: _appendToNotes,
              ),
              LessonMindMapsTab(
                lesson: _lesson,
                onMindMapsChanged: (maps) =>
                    _patch(_lesson.copyWith(mindMaps: maps)),
              ),
              LessonWordPagesTab(
                lesson: _lesson,
                onWordPagesChanged: (pages) =>
                    _patch(_lesson.copyWith(wordPages: pages)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _appendToNotes(String text) {
    final current = _lesson.notes.trim();
    final next = current.isEmpty ? text : '$current\n\n$text';
    _patch(_lesson.copyWith(notes: next));
  }
}

/// أدوات مشتركة لإنشاء عناصر جديدة بمعرّفات وتواريخ.
class LessonItemFactory {
  static LessonImage image(String url) => LessonImage(
        id: _id(),
        url: url,
        annotations: [],
      );

  static WordPage wordPage({String title = 'صفحة جديدة'}) {
    final now = DateTime.now();
    return WordPage(
      id: _id(),
      title: title,
      content: '',
      createdAt: now,
      updatedAt: now,
    );
  }

  static MindMap mindMap({String title = 'خريطة جديدة'}) {
    final now = DateTime.now();
    return MindMap(
      id: _id(),
      title: title,
      nodes: [],
      saved: false,
      createdAt: now,
      updatedAt: now,
    );
  }

  static String _id() => DateTime.now().microsecondsSinceEpoch.toRadixString(36);
}
