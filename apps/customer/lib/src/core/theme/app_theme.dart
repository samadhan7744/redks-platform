import 'package:flutter/material.dart';

class AppTheme {
  static const red = Color(0xFFC81E2B);
  static const dark = Color(0xFF121212);

  static ThemeData light() {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: red,
        primary: red,
        secondary: dark,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: const Color(0xFFF6F7F9),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: dark,
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE2E5EA)),
        ),
      ),
      useMaterial3: true,
    );
  }
}
