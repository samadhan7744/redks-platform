import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/models.dart';
import '../../data/repositories/redks_repository.dart';

final authControllerProvider =
    StateNotifierProvider<AuthController, AsyncValue<UserModel?>>((ref) {
      return AuthController(ref.watch(redKsRepositoryProvider));
    });

class AuthController extends StateNotifier<AsyncValue<UserModel?>> {
  AuthController(this.repository) : super(const AsyncValue.loading()) {
    restore();
  }

  final RedKsRepository repository;
  String? devOtp;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    if (token == null) {
      state = const AsyncValue.data(null);
      return;
    }
    try {
      state = AsyncValue.data(await repository.me());
    } catch (_) {
      await repository.logout();
      state = const AsyncValue.data(null);
    }
  }

  Future<void> requestOtp(String phone) async {
    devOtp = await repository.requestOtp(phone);
  }

  Future<void> verifyOtp(String phone, String otp) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => repository.verifyOtp(phone, otp));
  }

  Future<void> logout() async {
    await repository.logout();
    state = const AsyncValue.data(null);
  }
}
