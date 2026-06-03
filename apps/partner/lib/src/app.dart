import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/common/mode_selection_screen.dart';
import 'features/rider/screens/rider_shell.dart';
import 'features/shop/screens/shop_shell.dart';
import 'features/splash/splash_screen.dart';

class RedKsPartnerApp extends ConsumerWidget {
  const RedKsPartnerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final mode = ref.watch(modeProvider);
    return MaterialApp(
      title: 'RedKS Partner',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: auth.when(
        loading: () => const SplashScreen(),
        error: (error, stackTrace) => const LoginScreen(),
        data: (user) {
          if (user == null) return const LoginScreen();
          if (mode == 'SHOP') return const ShopShell();
          if (mode == 'RIDER') return const RiderShell();
          return const ModeSelectionScreen();
        },
      ),
    );
  }
}
