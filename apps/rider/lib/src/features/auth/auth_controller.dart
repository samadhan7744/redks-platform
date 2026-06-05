import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/models.dart';
import '../../data/repositories/partner_repository.dart';

final authProvider =
    StateNotifierProvider<AuthController, AsyncValue<UserModel?>>(
      (ref) => AuthController(ref.watch(partnerRepositoryProvider)),
    );
final modeProvider = StateNotifierProvider<ModeController, String?>(
  (ref) => ModeController(),
);

class AuthController extends StateNotifier<AsyncValue<UserModel?>> {
  AuthController(this.repo) : super(const AsyncValue.loading()) {
    restore();
  }
  final PartnerRepository repo;
  String? devOtp;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString('riderAccessToken') == null) {
      state = const AsyncValue.data(null);
      return;
    }
    state = await AsyncValue.guard(repo.me);
  }

  Future<void> requestOtp(String phone) async =>
      devOtp = await repo.requestOtp(phone);
  Future<void> verifyOtp(String phone, String otp) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => repo.verifyOtp(phone, otp));
  }

  Future<void> logout() async {
    await repo.logout();
    state = const AsyncValue.data(null);
  }
}

class ModeController extends StateNotifier<String?> {
  ModeController() : super('RIDER');

  Future<void> setMode(String mode) async {
    state = mode;
  }
}
