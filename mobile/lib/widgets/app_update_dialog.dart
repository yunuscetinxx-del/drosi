import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../models/app_update_info.dart';
import '../services/ota_install.dart';

/// حوار إشعار التحديث مع سجل التغييرات وتقدّم التنزيل.
class AppUpdateDialog extends StatefulWidget {
  const AppUpdateDialog({
    super.key,
    required this.update,
    required this.currentVersion,
    this.mandatory = false,
  });

  final AppUpdateInfo update;
  final String currentVersion;
  final bool mandatory;

  /// يُرجع `later` إذا اختار المستخدم التأجيل.
  static Future<String?> show(
    BuildContext context, {
    required AppUpdateInfo update,
    required String currentVersion,
    bool mandatory = false,
  }) {
    return showDialog<String?>(
      context: context,
      barrierDismissible: !mandatory,
      builder: (ctx) => AppUpdateDialog(
        update: update,
        currentVersion: currentVersion,
        mandatory: mandatory,
      ),
    );
  }

  @override
  State<AppUpdateDialog> createState() => _AppUpdateDialogState();
}

class _AppUpdateDialogState extends State<AppUpdateDialog> {
  bool _installing = false;
  double? _progress;
  String? _statusText;
  String? _error;

  Future<void> _startInstall() async {
    if (kIsWeb) {
      setState(() => _error = 'التثبيت من المتصفح غير متاح — استخدم نسخة الموقع');
      return;
    }

    setState(() {
      _installing = true;
      _error = null;
      _progress = 0;
      _statusText = 'جارٍ التنزيل...';
    });

    try {
      await for (final event in installApkUpdate(widget.update)) {
        if (!mounted) return;
        setState(() {
          _statusText = _labelForStatus(event.status);
          if (event.status == 'DOWNLOADING' && event.value != null) {
            final pct = double.tryParse(event.value!);
            if (pct != null) _progress = (pct / 100).clamp(0.0, 1.0);
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _installing = false;
        });
      }
    }
  }

  String _labelForStatus(String status) {
    return switch (status) {
      'DOWNLOADING' => 'جارٍ التنزيل...',
      'INSTALLING' => 'جارٍ التثبيت...',
      'ALREADY_RUNNING_ERROR' => 'التثبيت قيد التشغيل مسبقاً',
      'PERMISSION_NOT_GRANTED_ERROR' =>
        'يُرجى السماح بتثبيت التطبيقات من هذا المصدر',
      'INTERNAL_ERROR' => 'خطأ داخلي',
      'DOWNLOAD_ERROR' => 'فشل التنزيل',
      _ => 'جارٍ المعالجة...',
    };
  }

  @override
  Widget build(BuildContext context) {
    final u = widget.update;
    return PopScope(
      canPop: !widget.mandatory && !_installing,
      child: AlertDialog(
        icon: const Icon(Icons.system_update, size: 36),
        title: Text('تحديث جديد — ${u.version}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'إصدارك الحالي: ${widget.currentVersion}',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (u.releasedAt != null) ...[
                const SizedBox(height: 4),
                Text(
                  'تاريخ الإصدار: ${u.releasedAt}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 12),
              Text(
                'ما الجديد:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 6),
              Text(u.changelog.trim().isEmpty ? '—' : u.changelog),
              if (_installing) ...[
                const SizedBox(height: 16),
                if (_progress != null) ...[
                  LinearProgressIndicator(value: _progress),
                  const SizedBox(height: 8),
                ] else
                  const LinearProgressIndicator(),
                if (_statusText != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _statusText!,
                      style: Theme.of(context).textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (!widget.mandatory && !_installing)
            TextButton(
              onPressed: () => Navigator.pop(context, 'later'),
              child: const Text('لاحقاً'),
            ),
          if (!kIsWeb)
            FilledButton.icon(
              onPressed: _installing ? null : _startInstall,
              icon: const Icon(Icons.download),
              label: Text(_installing ? 'جارٍ التحديث...' : 'تثبيت التحديث'),
            ),
        ],
      ),
    );
  }
}
