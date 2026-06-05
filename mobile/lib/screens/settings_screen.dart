import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/app_update_dialog.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.user;

    return SafeArea(
      bottom: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          Text(
            'الإعدادات',
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          if (user != null) _AccountCard(state: state),
          const SizedBox(height: 16),
          _SectionTitle('المظهر'),
          _ThemeCard(state: state),
          const SizedBox(height: 16),
          _SectionTitle('المزامنة'),
          _SyncCard(state: state),
          const SizedBox(height: 16),
          _SectionTitle('تحديث التطبيق'),
          _UpdateCard(state: state),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => _confirmLogout(context, state),
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text('تسجيل الخروج',
                style: TextStyle(color: Colors.red)),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.red.withValues(alpha: 0.4)),
            ),
          ),
          const SizedBox(height: 24),
          Center(
            child: Text(
              state.appVersionLabel.isEmpty
                  ? 'دروسي'
                  : 'دروسي • ${state.appVersionLabel}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.4),
                  ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, AppState state) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('تسجيل الخروج؟'),
        content: const Text('ستحتاج لتسجيل الدخول مجدداً للوصول لدروسك.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('إلغاء'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('خروج'),
          ),
        ],
      ),
    );
    if (ok == true) await state.logout();
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final user = state.user!;
    final initial =
        user.email.isNotEmpty ? user.email.characters.first.toUpperCase() : '?';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.seed, AppTheme.accent],
                ),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                initial,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.email,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    textDirection: TextDirection.ltr,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.isAdmin ? 'حساب مدير' : 'حساب مستخدم',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.6),
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeCard extends StatelessWidget {
  const _ThemeCard({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          _option(context, 'تلقائي (حسب النظام)', Icons.brightness_auto,
              ThemeMode.system),
          const Divider(height: 1),
          _option(context, 'فاتح', Icons.light_mode_outlined, ThemeMode.light),
          const Divider(height: 1),
          _option(context, 'داكن', Icons.dark_mode_outlined, ThemeMode.dark),
        ],
      ),
    );
  }

  Widget _option(
      BuildContext context, String label, IconData icon, ThemeMode mode) {
    final selected = state.themeMode == mode;
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      trailing: selected
          ? Icon(Icons.check_circle,
              color: Theme.of(context).colorScheme.primary)
          : const Icon(Icons.circle_outlined, color: Colors.grey),
      onTap: () => state.setThemeMode(mode),
    );
  }
}

class _SyncCard extends StatelessWidget {
  const _SyncCard({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final syncing = state.syncStatus == SyncStatus.syncing;
    final statusText = !state.online
        ? 'غير متصل'
        : syncing
            ? 'جارٍ المزامنة...'
            : state.pendingCount > 0
                ? '${state.pendingCount} تغيير بانتظار المزامنة'
                : 'كل شيء محدّث';
    final statusColor = !state.online
        ? Colors.blueGrey
        : state.pendingCount > 0
            ? Colors.orange.shade700
            : Colors.green;

    return Card(
      child: Column(
        children: [
          ListTile(
            leading: Icon(
              state.online ? Icons.cloud_done_outlined : Icons.cloud_off,
              color: statusColor,
            ),
            title: const Text('حالة المزامنة'),
            subtitle: Text(statusText),
            trailing: syncing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : TextButton(
                    onPressed: state.online ? () => state.syncNow() : null,
                    child: const Text('مزامنة الآن'),
                  ),
          ),
          if (state.lastSyncedAt != null) ...[
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.schedule),
              title: const Text('آخر مزامنة'),
              subtitle: Text(_formatTime(state.lastSyncedAt!)),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTime(DateTime d) {
    final h = d.hour.toString().padLeft(2, '0');
    final m = d.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _UpdateCard extends StatelessWidget {
  const _UpdateCard({required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    final hasUpdate = state.availableUpdate != null;
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: Icon(
              hasUpdate ? Icons.new_releases : Icons.system_update_alt,
              color: hasUpdate ? Colors.orange : null,
            ),
            title: Text(hasUpdate
                ? 'تحديث متاح: ${state.availableUpdate!.version}'
                : 'الإصدار الحالي'),
            subtitle: Text(
              state.appVersionLabel.isEmpty ? '—' : state.appVersionLabel,
            ),
            trailing: state.checkingUpdate
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : null,
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: FilledButton.icon(
              onPressed: state.checkingUpdate
                  ? null
                  : () => _checkUpdate(context),
              icon: const Icon(Icons.refresh),
              label: const Text('التحقق من التحديثات'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _checkUpdate(BuildContext context) async {
    final messenger = ScaffoldMessenger.of(context);
    final has = await state.checkForAppUpdate(force: true);
    if (!context.mounted) return;
    if (has && state.availableUpdate != null) {
      final action = await AppUpdateDialog.show(
        context,
        update: state.availableUpdate!,
        currentVersion: state.appVersionLabel,
        mandatory: state.availableUpdate!.mandatory,
      );
      if (action == 'later') await state.skipAvailableUpdate();
    } else {
      messenger.showSnackBar(
        const SnackBar(content: Text('أنت على آخر إصدار متاح')),
      );
    }
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
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
