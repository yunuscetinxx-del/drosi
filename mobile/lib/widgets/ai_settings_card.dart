import 'package:flutter/material.dart';

import '../services/ai_settings_service.dart';

class AiSettingsCard extends StatefulWidget {
  const AiSettingsCard({super.key});

  @override
  State<AiSettingsCard> createState() => _AiSettingsCardState();
}

class _AiSettingsCardState extends State<AiSettingsCard> {
  final _service = AiSettingsService();
  final _keyController = TextEditingController();
  AiSettings? _settings;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _keyController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final s = await _service.fetch();
      if (mounted) setState(() => _settings = s);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final key = _keyController.text.trim();
    if (key.length < 20) {
      setState(() => _error = 'المفتاح قصير جداً');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final s = await _service.saveGeminiKey(key);
      _keyController.clear();
      if (mounted) {
        setState(() => _settings = s);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم ربط Gemini بنجاح')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _remove() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final s = await _service.removeGeminiKey();
      if (mounted) {
        setState(() => _settings = s);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم إزالة المفتاح')),
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final s = _settings;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.psychology_outlined, color: scheme.primary),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text('الذكاء الاصطناعي (Gemini)',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                if (_loading)
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'أدخل مفتاح Gemini API من Google AI Studio — يُخزَّن مشفّراً على السيرفر.',
              style: TextStyle(fontSize: 12, color: scheme.onSurface.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 12),
            if (s != null) ...[
              Row(
                children: [
                  Chip(
                    label: Text(
                      s.hasGeminiKey
                          ? 'Gemini • …${s.geminiKeyHint ?? ''}'
                          : s.serverFallbackAvailable
                              ? 'OpenRouter (السيرفر)'
                              : 'غير مضبوط',
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            if (s == null || !s.hasGeminiKey) ...[
              TextField(
                controller: _keyController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'مفتاح Gemini API',
                  border: OutlineInputBorder(),
                  hintText: 'AIza...',
                ),
              ),
              const SizedBox(height: 8),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.key),
                label: const Text('ربط المفتاح'),
              ),
            ] else
              OutlinedButton.icon(
                onPressed: _saving ? null : _remove,
                icon: const Icon(Icons.link_off),
                label: const Text('إزالة المفتاح'),
              ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: scheme.error, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}
