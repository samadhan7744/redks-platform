import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.dark,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppTheme.dark, Color(0xFF7F1D1D)],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Image.asset('assets/images/redks_logo.png', width: 148),
              const SizedBox(height: 22),
              const Text(
                'RedKS Rider',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Delivery Partner Network',
                style: TextStyle(color: Colors.white70),
              ),
              const SizedBox(height: 24),
              const CircularProgressIndicator(color: AppTheme.yellow),
            ],
          ),
        ),
      ),
    );
  }
}
