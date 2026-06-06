import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/lesson.dart';
import '../models/lesson_image.dart';
import '../models/mind_map.dart';
import '../models/word_page.dart';
import '../providers/app_state.dart';
import '../models/lesson_note.dart';
import '../tabs/lesson_ai_tab.dart';
import '../tabs/lesson_details_tab.dart';
import '../tabs/lesson_images_tab.dart';
import '../tabs/lesson_mind_maps_tab.dart';
import '../tabs/lesson_notes_tab.dart';
import '../tabs/lesson_word_pages_tab.dart';
import '../theme/app_theme.dart';
import '../widgets/app_icons.dart';
import '../widgets/share_lesson_sheet.dart';

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

  Future<bool> _save({String? successMessage}) async {
    if (!_dirty) return true;
    setState(() => _saving = true);
    try {
      await context.read<AppState>().updateLesson(_lesson);
      if (mounted) {
        setState(() => _dirty = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(successMessage ?? 'تم الحفظ والمزامنة'),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            duration: const Duration(seconds: 2),
          ),
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

  /// حفظ فوري للملاحظات ومزامنتها مع الموقع.
  Future<void> _persistNotes(List<LessonNote> notes) async {
    setState(() {
      _lesson = _lesson.copyWith(
        lessonNotes: notes,
        updatedAt: DateTime.now(),
      );
      _dirty = true;
    });
    await _save(successMessage: 'تم حفظ الملاحظات ومزامنتها مع الموقع');
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
    final gradient = SubjectColors.gradientFor(_lesson.subject);

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
        length: 6,
        child: Scaffold(
          appBar: AppBar(
            flexibleSpace: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: gradient,
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
              ),
            ),
            foregroundColor: Colors.white,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _lesson.title.isEmpty ? 'بدون عنوان' : _lesson.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white),
                ),
                if (_lesson.subject.isNotEmpty)
                  Text(
                    _lesson.subject,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.normal,
                      color: Colors.white.withValues(alpha: 0.85),
                    ),
                  ),
              ],
            ),
            actions: [
              IconButton(
                tooltip: 'مشاركة',
                onPressed: () => ShareLessonSheet.show(context, lesson: _lesson),
                icon: AppIcons.share(),
              ),
              if (_saving)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  ),
                ),
            ],
            bottom: TabBar(
              isScrollable: true,
              tabAlignment: TabAlignment.center,
              indicatorColor: Colors.white,
              indicatorWeight: 3,
              indicatorSize: TabBarIndicatorSize.label,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white.withValues(alpha: 0.65),
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
              tabs: [
                Tab(icon: AppIcons.details(), text: 'التفاصيل'),
                Tab(icon: AppIcons.notes(), text: 'ملاحظات'),
                Tab(icon: AppIcons.images(), text: 'الصور'),
                Tab(icon: AppIcons.mindMaps(), text: 'الخرائط'),
                Tab(icon: AppIcons.wordPages(), text: 'صفحات'),
                Tab(icon: AppIcons.ai(), text: 'ذكاء'),
              ],
            ),
          ),
          body: TabBarView(
            children: [
              LessonDetailsTab(
                lesson: _lesson,
                onChanged: _patch,
              ),
              LessonNotesTab(
                lesson: _lesson,
                onNotesChanged: _persistNotes,
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
                onFoldersChanged: (folders) =>
                    _patch(_lesson.copyWith(mindMapFolders: folders)),
              ),
              LessonWordPagesTab(
                lesson: _lesson,
                onWordPagesChanged: (pages) =>
                    _patch(_lesson.copyWith(wordPages: pages)),
              ),
              LessonAiTab(
                lesson: _lesson,
                onChanged: _patch,
                onAddToNotes: _appendToNotes,
                onCreateMindMap: _createMindMapFromAi,
                onAddToActiveMindMap: _addNodesToFirstMindMap,
              ),
            ],
          ),
          floatingActionButton: _dirty && !_saving
              ? AppFab(
                  heroTag: 'lesson_save',
                  onPressed: _save,
                  icon: Icons.cloud_done_rounded,
                  label: 'حفظ التغييرات',
                )
              : null,
        ),
      ),
    );
  }

  void _createMindMapFromAi(String title, List<MindMapNode> nodes) {
    final now = DateTime.now();
    final map = MindMap(
      id: LessonItemFactory._id(),
      title: title,
      nodes: nodes,
      saved: false,
      createdAt: now,
      updatedAt: now,
    );
    _patch(_lesson.copyWith(mindMaps: [..._lesson.mindMaps, map]));
  }

  void _addNodesToFirstMindMap(List<MindMapNode> nodes) {
    if (_lesson.mindMaps.isEmpty) {
      _createMindMapFromAi('خريطة من المصادر', nodes);
      return;
    }
    final first = _lesson.mindMaps.first;
    final merged = MindMap(
      id: first.id,
      title: first.title,
      nodes: [...first.nodes, ...nodes],
      saved: first.saved,
      folderId: first.folderId,
      createdAt: first.createdAt,
      updatedAt: DateTime.now(),
    );
    _patch(_lesson.copyWith(
      mindMaps: _lesson.mindMaps.map((m) => m.id == first.id ? merged : m).toList(),
    ));
  }

  void _appendToNotes(String text) {
    final now = DateTime.now();
    final notes = [..._lesson.lessonNotes];
    if (notes.isEmpty) {
      notes.add(
        LessonNote(
          id: LessonItemFactory._id(),
          title: 'من الصور',
          content: text,
          createdAt: now,
          updatedAt: now,
        ),
      );
    } else {
      final first = notes.first;
      final merged = first.content.trim().isEmpty
          ? text
          : '${first.content.trim()}\n\n$text';
      notes[0] = first.copyWith(content: merged, updatedAt: now);
    }
    _patch(_lesson.copyWith(lessonNotes: notes));
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

  static LessonNote lessonNote({
    String title = 'ملاحظة جديدة',
    String content = '',
  }) {
    final now = DateTime.now();
    return LessonNote(
      id: _id(),
      title: title,
      content: content,
      createdAt: now,
      updatedAt: now,
    );
  }

  static String _id() => DateTime.now().microsecondsSinceEpoch.toRadixString(36);
}
