import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/lesson.dart';
import '../providers/app_state.dart';
import '../widgets/app_update_dialog.dart';
import '../widgets/empty_state.dart';
import '../widgets/lesson_card.dart';
import '../widgets/shimmer.dart';
import 'add_lesson_screen.dart';
import 'lesson_detail_screen.dart';
import 'calendar_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _onReady());
  }

  Future<void> _onReady() async {
    if (!mounted) return;
    final state = context.read<AppState>();
    await state.syncNow();
    if (!mounted) return;
    if (await state.checkForAppUpdate()) {
      await _showUpdateDialogIfNeeded();
    }
  }

  Future<void> _showUpdateDialogIfNeeded() async {
    if (!mounted) return;
    final state = context.read<AppState>();
    final update = state.availableUpdate;
    if (update == null) return;
    final action = await AppUpdateDialog.show(
      context,
      update: update,
      currentVersion: state.appVersionLabel,
      mandatory: update.mandatory,
    );
    if (action == 'later' && mounted) {
      await state.skipAvailableUpdate();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();

    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: const [
          _LessonsTab(),
          CalendarScreen(),
          SettingsScreen(),
        ],
      ),
      floatingActionButton: _tab == 0
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddLessonScreen()),
              ),
              icon: const Icon(Icons.add),
              label: const Text('درس جديد'),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'دروسي',
          ),
          const NavigationDestination(
            icon: Icon(Icons.calendar_month_outlined),
            selectedIcon: Icon(Icons.calendar_month),
            label: 'التقويم',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: state.pendingCount > 0,
              label: Text('${state.pendingCount}'),
              child: const Icon(Icons.settings_outlined),
            ),
            selectedIcon: const Icon(Icons.settings),
            label: 'الإعدادات',
          ),
        ],
      ),
    );
  }
}

class _LessonsTab extends StatefulWidget {
  const _LessonsTab();

  @override
  State<_LessonsTab> createState() => _LessonsTabState();
}

class _LessonsTabState extends State<_LessonsTab> {
  String _query = '';
  String? _subjectFilter;

  List<Lesson> _filtered(List<Lesson> lessons) {
    var items = lessons;
    if (_subjectFilter != null) {
      items = items.where((l) => l.subject == _subjectFilter).toList();
    }
    if (_query.trim().isNotEmpty) {
      final q = _query.toLowerCase();
      items = items.where((l) {
        return l.title.toLowerCase().contains(q) ||
            l.subject.toLowerCase().contains(q) ||
            l.description.toLowerCase().contains(q);
      }).toList();
    }
    return items;
  }

  List<String> _subjects(List<Lesson> lessons) {
    final set = <String>{};
    for (final l in lessons) {
      if (l.subject.trim().isNotEmpty) set.add(l.subject.trim());
    }
    return set.toList()..sort();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final subjects = _subjects(state.lessons);
    final items = _filtered(state.lessons);
    final loadingFirst = state.loading && state.lessons.isEmpty;

    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _GreetingHeader(state: state),
          _SyncBanner(state: state),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'ابحث عن درس أو مادة...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _query.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => setState(() => _query = ''),
                      )
                    : null,
                isDense: true,
              ),
            ),
          ),
          if (subjects.isNotEmpty)
            _SubjectFilter(
              subjects: subjects,
              selected: _subjectFilter,
              onSelected: (s) => setState(() => _subjectFilter = s),
            ),
          Expanded(
            child: loadingFirst
                ? ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: 5,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (_, _) => const LessonCardSkeleton(),
                  )
                : items.isEmpty
                    ? _emptyState(context, state)
                    : RefreshIndicator(
                        onRefresh: state.syncNow,
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 96),
                          itemCount: items.length,
                          separatorBuilder: (_, _) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final lesson = items[i];
                            return LessonCard(
                              lesson: lesson,
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      LessonDetailScreen(lesson: lesson),
                                ),
                              ),
                              onDelete: () => _confirmDelete(
                                  context, state, lesson),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _emptyState(BuildContext context, AppState state) {
    if (state.lessons.isEmpty) {
      return EmptyState(
        icon: Icons.menu_book_outlined,
        title: 'لا توجد دروس بعد',
        message: 'ابدأ بإضافة درسك الأول وستظهر هنا.',
        actionLabel: 'إضافة درس',
        onAction: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const AddLessonScreen()),
        ),
      );
    }
    return const EmptyState(
      icon: Icons.search_off,
      title: 'لا توجد نتائج',
      message: 'جرّب كلمة بحث أخرى أو غيّر الفلتر.',
    );
  }

  Future<void> _confirmDelete(
      BuildContext context, AppState state, Lesson lesson) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 32),
        title: const Text('حذف الدرس؟'),
        content: Text('سيُحذف «${lesson.title}» نهائياً.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok == true) await state.deleteLesson(lesson.id);
  }
}

class _GreetingHeader extends StatelessWidget {
  const _GreetingHeader({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final user = state.user!;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'صباح الخير'
        : hour < 18
            ? 'مساء الخير'
            : 'مساء الخير';
    final name = user.email.split('@').first;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.5),
                      ),
                ),
                Text(
                  name,
                  style: Theme.of(context)
                      .textTheme
                      .titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (user.isAdmin)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.shield_outlined,
                      size: 14, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 4),
                  Text(
                    'مدير',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(width: 8),
          _SyncButton(state: state),
        ],
      ),
    );
  }
}

class _SubjectFilter extends StatelessWidget {
  const _SubjectFilter({
    required this.subjects,
    required this.selected,
    required this.onSelected,
  });

  final List<String> subjects;
  final String? selected;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 8),
            child: ChoiceChip(
              label: const Text('الكل'),
              selected: selected == null,
              onSelected: (_) => onSelected(null),
            ),
          ),
          for (final s in subjects)
            Padding(
              padding: const EdgeInsets.only(left: 8),
              child: ChoiceChip(
                label: Text(s),
                selected: selected == s,
                onSelected: (_) => onSelected(s),
              ),
            ),
        ],
      ),
    );
  }
}

/// زر المزامنة مع مؤشر دوران وعدد التغييرات المعلّقة.
class _SyncButton extends StatelessWidget {
  const _SyncButton({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final syncing = state.syncStatus == SyncStatus.syncing;
    final icon = !state.online
        ? Icons.cloud_off
        : (state.pendingCount > 0 ? Icons.cloud_upload : Icons.cloud_done);

    return IconButton.filledTonal(
      tooltip: state.online ? 'مزامنة' : 'بدون اتصال',
      onPressed: syncing ? null : () => state.syncNow(),
      icon: syncing
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(icon),
    );
  }
}

/// شريط حالة يوضّح وضع عدم الاتصال أو وجود تغييرات بانتظار المزامنة أو خطأ.
class _SyncBanner extends StatelessWidget {
  const _SyncBanner({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    if (!state.online) {
      return _bar(
        color: Colors.blueGrey,
        icon: Icons.cloud_off,
        text: state.pendingCount > 0
            ? 'بدون اتصال — ${state.pendingCount} تغيير سيُزامن لاحقاً'
            : 'وضع عدم الاتصال — التعديلات محفوظة محلياً',
      );
    }

    if (state.syncStatus == SyncStatus.error) {
      return _bar(
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
        color: Colors.orange.shade700,
        icon: Icons.cloud_upload,
        text: '${state.pendingCount} تغيير بانتظار المزامنة',
      );
    }

    return const SizedBox.shrink();
  }

  Widget _bar({
    required Color color,
    required IconData icon,
    required String text,
    Widget? action,
  }) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
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
