import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/app_state.dart';
import 'home_screen.dart';
import 'login_screen.dart';
import 'splash_screen.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final Widget screen;
        if (state.loading && state.user == null) {
          screen = const SplashScreen();
        } else if (state.user == null) {
          screen = const LoginScreen();
        } else {
          screen = const HomeScreen();
        }

        return AnimatedSwitcher(
          duration: const Duration(milliseconds: 350),
          switchInCurve: Curves.easeOut,
          transitionBuilder: (child, animation) => FadeTransition(
            opacity: animation,
            child: child,
          ),
          child: KeyedSubtree(
            key: ValueKey(screen.runtimeType),
            child: screen,
          ),
        );
      },
    );
  }
}
