import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/primary_button.dart';
import '../auth_controller.dart';

class OtpLoginScreen extends ConsumerStatefulWidget {
  const OtpLoginScreen({super.key});

  @override
  ConsumerState<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends ConsumerState<OtpLoginScreen> {
  final phoneController = TextEditingController();
  final otpController = TextEditingController();
  bool otpRequested = false;
  bool loading = false;
  String? error;

  @override
  void dispose() {
    phoneController.dispose();
    otpController.dispose();
    super.dispose();
  }

  Future<void> requestOtp() async {
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(phoneController.text.trim())) {
      setState(() => error = 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .requestOtp(phoneController.text.trim());
      setState(() => otpRequested = true);
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> verify() async {
    if (otpController.text.trim().length < 4) {
      setState(() => error = 'Enter the OTP sent to your phone.');
      return;
    }
    setState(() {
      loading = true;
      error = null;
    });
    try {
      await ref
          .read(authControllerProvider.notifier)
          .verifyOtp(phoneController.text.trim(), otpController.text.trim());
    } catch (e) {
      setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final devOtp = ref.read(authControllerProvider.notifier).devOtp;
    return Scaffold(
      backgroundColor: AppTheme.dark,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 48),
            const Icon(Icons.shopping_bag, color: AppTheme.red, size: 56),
            const SizedBox(height: 16),
            const Text(
              'RedKS',
              style: TextStyle(
                color: Colors.white,
                fontSize: 36,
                fontWeight: FontWeight.w900,
              ),
            ),
            const Text(
              'Har Dukaan, Ghar Tak.',
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 36),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Login with OTP',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Mobile number',
                      ),
                    ),
                    if (otpRequested) ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: otpController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'OTP'),
                      ),
                      if (devOtp != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('Development OTP: $devOtp'),
                        ),
                    ],
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    const SizedBox(height: 18),
                    PrimaryButton(
                      label: otpRequested ? 'Verify OTP' : 'Request OTP',
                      loading: loading,
                      onPressed: otpRequested ? verify : requestOtp,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
