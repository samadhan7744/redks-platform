import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111827),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset(
              'assets/images/redks_logo.png',
              width: 180,
              semanticLabel: 'RedKS logo',
            ),
            const SizedBox(height: 20),
            const Text(
              'RedKS Partner',
              style: TextStyle(
                color: Colors.white,
                fontSize: 34,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Shop & Delivery Network',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: Color(0xFFDC2626)),
          ],
        ),
      ),
    );
  }
}
