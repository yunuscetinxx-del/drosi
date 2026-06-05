import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';
import '../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _registerMode = false;
  bool _submitting = false;
  bool _obscure = true;
  bool _showServer = false;
  bool _serverInitialized = false;
  final _serverUrl = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_serverInitialized) {
      _serverUrl.text = context.read<AppState>().baseUrl;
      _serverInitialized = true;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _serverUrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();
    setState(() => _submitting = true);
    final state = context.read<AppState>();
    final messenger = ScaffoldMessenger.of(context);
    try {
      if (_registerMode) {
        await state.register(
          _name.text.trim(),
          _email.text.trim(),
          _password.text,
        );
      } else {
        await state.login(_email.text.trim(), _password.text);
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
            content: Text(state.error ?? e.toString()),
            backgroundColor: Colors.red.shade600,
          ),
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
        child: SingleChildScrollView(
          child: Column(
            children: [
              _Header(registerMode: _registerMode),
              Padding(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_registerMode) ...[
                          TextFormField(
                            controller: _name,
                            textInputAction: TextInputAction.next,
                            decoration: const InputDecoration(
                              labelText: 'Full name',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (v) {
                              final value = v?.trim() ?? '';
                              if (value.isEmpty) return 'Enter your name';
                              if (value.length < 2) {
                                return 'At least 2 characters';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                        ],
                        TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textDirection: TextDirection.ltr,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Email',
                            prefixIcon: Icon(Icons.email_outlined),
                          ),
                          validator: (v) {
                            final value = v?.trim() ?? '';
                            if (value.isEmpty) return 'Enter your email';
                            if (!value.contains('@') || !value.contains('.')) {
                              return 'Invalid email';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _password,
                          obscureText: _obscure,
                          textDirection: TextDirection.ltr,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined),
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                            ),
                            helperText: _registerMode ? 'At least 6 characters' : null,
                          ),
                          validator: (v) {
                            final value = v ?? '';
                            if (value.isEmpty) return 'Enter your password';
                            if (_registerMode && value.length < 6) {
                              return 'At least 6 characters';
                            }
                            return null;
                          },
                        ),
                        const SizedBox(height: 28),
                        FilledButton(
                          onPressed: _submitting ? null : _submit,
                          child: _submitting
                              ? const SizedBox(
                                  height: 22,
                                  width: 22,
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2.5, color: Colors.white),
                                )
                              : Text(
                                  _registerMode ? 'Create account' : 'Sign in',
                                ),
                        ),
                        const SizedBox(height: 8),
                        TextButton.icon(
                          onPressed: _submitting
                              ? null
                              : () => setState(() => _showServer = !_showServer),
                          icon: Icon(
                            _showServer
                                ? Icons.expand_less
                                : Icons.settings_outlined,
                            size: 18,
                          ),
                          label: Text(_showServer ? 'Hide server' : 'Server URL'),
                        ),
                        if (_showServer) ...[
                          TextFormField(
                            controller: _serverUrl,
                            textDirection: TextDirection.ltr,
                            decoration: const InputDecoration(
                              labelText: 'Server URL',
                              hintText: 'https://example.up.railway.app',
                            ),
                          ),
                          const SizedBox(height: 8),
                          OutlinedButton(
                            onPressed: _submitting
                                ? null
                                : () async {
                                    await context
                                        .read<AppState>()
                                        .setBaseUrl(_serverUrl.text.trim());
                                    if (mounted) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        const SnackBar(
                                          content: Text('Server URL saved'),
                                        ),
                                      );
                                    }
                                  },
                            child: const Text('Save server URL'),
                          ),
                          const SizedBox(height: 8),
                        ],
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _registerMode ? 'Have an account?' : 'No account yet?',
                              style: theme.textTheme.bodyMedium,
                            ),
                            TextButton(
                              onPressed: _submitting
                                  ? null
                                  : () => setState(
                                      () => _registerMode = !_registerMode),
                              child: Text(
                                _registerMode ? 'Sign in' : 'Sign up',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.registerMode});
  final bool registerMode;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 40),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.seed, AppTheme.accent],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(36)),
      ),
      child: Column(
        children: [
          Container(
            width: 84,
            height: 84,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(Icons.auto_stories_rounded,
                size: 44, color: Colors.white),
          ),
          const SizedBox(height: 18),
          const Text(
            'Drosi',
            style: TextStyle(
              color: Colors.white,
              fontSize: 30,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            registerMode
                ? 'Create your free workspace'
                : 'Sign in to your workspace',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.9),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
