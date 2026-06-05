import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/ai_settings_card.dart';
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
          _SectionTitle('الذكاء الاصطناعي'),
          const AiSettingsCard(),
          const SizedBox(height: 16),
          _SectionTitle('المظهر'),
          _ThemeCard(state: state),
          const SizedBox(height: 16),
          _SectionTitle('السيرفر'),
          _ServerCard(state: state),
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
    final label = user.displayName;
    final initial =
        label.isNotEmpty ? label.characters.first.toUpperCase() : '?';

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
                    user.displayName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  if (user.name != null && user.name!.trim().isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      user.email,
                      style: Theme.of(context).textTheme.bodySmall,
                      textDirection: TextDirection.ltr,
                    ),
                  ],
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

class _ServerCard extends StatefulWidget {
  const _ServerCard({required this.state});
  final AppState state;

  @override
  State<_ServerCard> createState() => _ServerCardState();
}

class _ServerCardState extends State<_ServerCard> {
  late final TextEditingController _url;
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.state.baseUrl);
  }

  @override
  void didUpdateWidget(covariant _ServerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.state.baseUrl != widget.state.baseUrl) {
      _url.text = widget.state.baseUrl;
    }
  }

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = _url.text.trim();
    if (value.isEmpty) return;
    await widget.state.setBaseUrl(value);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('تم حفظ عنوان السيرفر')),
      );
    }
  }

  Future<void> _syncRemote() async {
    setState(() => _syncing = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final synced = await widget.state.syncServerUrlFromRemote();
      if (!mounted) return;
      _url.text = widget.state.baseUrl;
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            synced != null
                ? 'تم تحديث الرابط من الموقع'
                : 'لا يوجد رابط جديد (أو لديك إعداد يدوي)',
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'عنوان السيرفر',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 4),
            Text(
              'غيّره هنا أو من لوحة الأدمن على الموقع — يُزامن تلقائياً عند فتح التطبيق.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.6),
                  ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _url,
              textDirection: TextDirection.ltr,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'https://example.up.railway.app',
                prefixIcon: Icon(Icons.cloud_outlined),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    onPressed: _save,
                    child: const Text('حفظ'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _syncing ? null : () => _syncRemote(),
                    child: _syncing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('من الموقع'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
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
