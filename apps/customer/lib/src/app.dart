import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/screens/otp_login_screen.dart';
import 'features/home/screens/home_screen.dart';
import 'features/splash/splash_screen.dart';

class RedKsCustomerApp extends ConsumerWidget {
  const RedKsCustomerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    return MaterialApp(
      title: 'RedKS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      home: auth.when(
        loading: () => const SplashScreen(),
        error: (error, stackTrace) => const OtpLoginScreen(),
        data: (user) =>
            user == null ? const OtpLoginScreen() : const HomeScreen(),
      ),
    );
  }
}
