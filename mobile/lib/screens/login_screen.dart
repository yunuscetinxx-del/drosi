import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _serverUrl = TextEditingController();
  bool _registerMode = false;
  bool _submitting = false;
  bool _showServer = false;
  bool _serverInit = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_serverInit) {
      _serverUrl.text = context.read<AppState>().baseUrl;
      _serverInit = true;
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _serverUrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final state = context.read<AppState>();
    try {
      if (_registerMode) {
        await state.register(_email.text, _password.text);
      } else {
        await state.login(_email.text, _password.text);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(state.error ?? e.toString())),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Icon(Icons.menu_book_rounded, size: 56, color: theme.colorScheme.primary),
                  const SizedBox(height: 12),
                  Text(
                    'دروسي',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    _registerMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.outline),
                  ),
                  const SizedBox(height: 28),
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textDirection: TextDirection.ltr,
                    decoration: const InputDecoration(
                      labelText: 'البريد الإلكتروني',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: true,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(
                      labelText: 'كلمة المرور',
                      border: const OutlineInputBorder(),
                      helperText: _registerMode ? '6 أحرف على الأقل' : null,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => setState(() => _showServer = !_showServer),
                    child: Text(_showServer ? 'إخفاء إعدادات الخادم' : 'إعدادات الخادم (API)'),
                  ),
                  if (_showServer) ...[
                    TextField(
                      controller: _serverUrl,
                      textDirection: TextDirection.ltr,
                      decoration: const InputDecoration(
                        labelText: 'عنوان الخادم',
                        hintText: 'http://10.0.2.2:3000',
                        border: OutlineInputBorder(),
                        helperText:
                            'Android Emulator: 10.0.2.2 | الهاتف: IP جهازك | Windows: localhost',
                      ),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: () async {
                        await context.read<AppState>().setBaseUrl(_serverUrl.text);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('تم حفظ عنوان الخادم')),
                          );
                        }
                      },
                      child: const Text('حفظ العنوان'),
                    ),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_registerMode ? 'إنشاء الحساب' : 'دخول'),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _registerMode = !_registerMode),
                    child: Text(
                      _registerMode
                          ? 'لديك حساب؟ سجّل الدخول'
                          : 'ليس لديك حساب؟ سجّل الآن',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
