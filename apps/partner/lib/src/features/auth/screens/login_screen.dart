import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/widgets/widgets.dart';
import '../auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _otpRequested = false;
  bool _loading = false;
  String? _error;
  String? _devOtp;

  @override
  void dispose() {
    _phone.dispose();
    _otp.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authProvider.notifier).requestOtp(_phone.text.trim());
      setState(() {
        _otpRequested = true;
        _devOtp = ref.read(authProvider.notifier).devOtp;
      });
    } catch (error) {
      setState(() => _error = ref.read(apiClientProvider).message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.text.trim().length < 4) {
      setState(() => _error = 'Enter the OTP sent to your phone.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    await ref
        .read(authProvider.notifier)
        .verifyOtp(_phone.text.trim(), _otp.text.trim());
    final auth = ref.read(authProvider);
    if (auth.hasError && mounted) {
      setState(() {
        _loading = false;
        _error = ref.read(apiClientProvider).message(auth.error!);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'RedKS',
                      style: TextStyle(
                        fontSize: 42,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFB91C1C),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Har Dukaan, Ghar Tak.',
                      style: TextStyle(fontSize: 16, color: Colors.black54),
                    ),
                    const SizedBox(height: 32),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      decoration: const InputDecoration(
                        labelText: 'Mobile number',
                        prefixText: '+91 ',
                      ),
                      validator: (value) => (value ?? '').trim().length == 10
                          ? null
                          : 'Enter a valid 10 digit phone number.',
                      enabled: !_otpRequested,
                    ),
                    if (_otpRequested) ...[
                      const SizedBox(height: 14),
                      TextField(
                        controller: _otp,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(6),
                        ],
                        decoration: const InputDecoration(labelText: 'OTP'),
                      ),
                      if (_devOtp != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text('Development OTP: $_devOtp'),
                        ),
                    ],
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    const SizedBox(height: 24),
                    PrimaryButton(
                      label: _otpRequested ? 'Verify OTP' : 'Request OTP',
                      loading: _loading || ref.watch(authProvider).isLoading,
                      onPressed: _otpRequested ? _verifyOtp : _requestOtp,
                    ),
                    if (_otpRequested)
                      TextButton(
                        onPressed: _loading
                            ? null
                            : () => setState(() {
                                _otpRequested = false;
                                _otp.clear();
                                _error = null;
                              }),
                        child: const Text('Change phone number'),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
