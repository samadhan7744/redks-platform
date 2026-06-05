import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/rider/screens/rider_shell.dart';
import 'features/splash/splash_screen.dart';

class RedKsRiderApp extends ConsumerWidget {
  const RedKsRiderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    return MaterialApp(
      title: 'RedKS Rider',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: auth.when(
        loading: () => const SplashScreen(),
        error: (error, stackTrace) => const LoginScreen(),
        data: (user) => user == null ? const LoginScreen() : const RiderShell(),
      ),
    );
  }
}
