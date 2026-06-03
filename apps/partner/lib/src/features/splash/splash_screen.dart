import 'package:flutter/material.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'RedKS',
              style: TextStyle(
                fontSize: 38,
                fontWeight: FontWeight.w800,
                color: Color(0xFFB91C1C),
              ),
            ),
            SizedBox(height: 8),
            Text('Har Dukaan, Ghar Tak.'),
            SizedBox(height: 24),
            CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
