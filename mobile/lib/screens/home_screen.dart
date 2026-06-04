import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/lesson.dart';
import '../providers/app_state.dart';
import 'add_lesson_screen.dart';
import 'lesson_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AppState>().syncNow();
    });
  }

  List<Lesson> _filtered(List<Lesson> lessons) {
    if (_query.trim().isEmpty) return lessons;
    final q = _query.toLowerCase();
    return lessons.where((l) {
      return l.title.toLowerCase().contains(q) ||
          l.subject.toLowerCase().contains(q) ||
          l.description.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user!;
    final items = _filtered(state.lessons);

    return Scaffold(
      appBar: AppBar(
        title: const Text('دروسي'),
        actions: [
          if (user.isAdmin)
            const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Chip(label: Text('مدير', style: TextStyle(fontSize: 12))),
            ),
          _SyncButton(state: state),
          IconButton(
            tooltip: 'خروج',
            onPressed: () => state.logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          _SyncBanner(state: state),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'ابحث عن درس...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                isDense: true,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${items.length} درس • ${user.email}',
                style: Theme.of(context).textTheme.bodySmall,
                textDirection: TextDirection.ltr,
              ),
            ),
          ),
          Expanded(
            child: items.isEmpty
                ? Center(
                    child: Text(
                      state.lessons.isEmpty ? 'لا توجد دروس بعد' : 'لا توجد نتائج',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: state.syncNow,
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: items.length,
                      separatorBuilder: (_, index) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final lesson = items[i];
                        return Card(
                          child: ListTile(
                            title: Text(lesson.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${lesson.subject} • ${lesson.description}',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                _LessonMeta(lesson: lesson),
                              ],
                            ),
                            isThreeLine: true,
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, color: Colors.red),
                              onPressed: () async {
                                final ok = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('حذف الدرس؟'),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
                                      FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('حذف')),
                                    ],
                                  ),
                                );
                                if (ok == true) await state.deleteLesson(lesson.id);
                              },
                            ),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => LessonDetailScreen(lesson: lesson),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AddLessonScreen()),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('درس جديد'),
      ),
    );
  }
}

/// شارات صغيرة تُظهر عدد الصور والخرائط وصفحات Word في الدرس.
class _LessonMeta extends StatelessWidget {
  const _LessonMeta({required this.lesson});
  final Lesson lesson;

  @override
  Widget build(BuildContext context) {
    final chips = <Widget>[];
    void add(IconData icon, int count) {
      if (count <= 0) return;
      chips.add(Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 2),
          Text('$count', style: Theme.of(context).textTheme.bodySmall),
        ],
      ));
    }

    add(Icons.image_outlined, lesson.images.length);
    add(Icons.account_tree_outlined, lesson.mindMaps.length);
    add(Icons.article_outlined, lesson.wordPages.length);

    if (chips.isEmpty) return const SizedBox.shrink();
    return Wrap(spacing: 12, children: chips);
  }
}

/// زر المزامنة في شريط العنوان مع مؤشر دوران وعدد التغييرات المعلّقة.
class _SyncButton extends StatelessWidget {
  const _SyncButton({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final syncing = state.syncStatus == SyncStatus.syncing;
    final icon = !state.online
        ? Icons.cloud_off
        : (state.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done);

    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          tooltip: state.online ? 'مزامنة' : 'بدون اتصال',
          onPressed: syncing ? null : () => state.syncNow(),
          icon: syncing
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(icon),
        ),
        if (state.pendingCount > 0 && !syncing)
          Positioned(
            top: 8,
            right: 6,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Colors.orange,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                '${state.pendingCount}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ),
          ),
      ],
    );
  }
}

/// شريط حالة يوضّح وضع عدم الاتصال أو وجود تغييرات بانتظار المزامنة أو خطأ.
class _SyncBanner extends StatelessWidget {
  const _SyncBanner({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (!state.online) {
      return _bar(
        theme,
        color: Colors.blueGrey,
        icon: Icons.cloud_off,
        text: state.pendingCount > 0
            ? 'بدون اتصال — ${state.pendingCount} تغيير سيُزامن لاحقاً'
            : 'وضع عدم الاتصال — التعديلات محفوظة محلياً',
      );
    }

    if (state.syncStatus == SyncStatus.error) {
      return _bar(
        theme,
        color: Colors.red.shade600,
        icon: Icons.error_outline,
        text: 'تعذّرت المزامنة: ${state.syncError ?? ''}',
        action: TextButton(
          onPressed: () => state.syncNow(),
          child: const Text('إعادة', style: TextStyle(color: Colors.white)),
        ),
      );
    }

    if (state.pendingCount > 0) {
      return _bar(
        theme,
        color: Colors.orange.shade700,
        icon: Icons.cloud_upload,
        text: '${state.pendingCount} تغيير بانتظار المزامنة',
      );
    }

    return const SizedBox.shrink();
  }

  Widget _bar(
    ThemeData theme, {
    required Color color,
    required IconData icon,
    required String text,
    Widget? action,
  }) {
    return Container(
      width: double.infinity,
      color: color,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
