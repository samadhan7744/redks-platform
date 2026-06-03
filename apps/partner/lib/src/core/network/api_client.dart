import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/app_config.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

class ApiClient {
  ApiClient()
    : dio = Dio(
        BaseOptions(
          baseUrl: AppConfig.apiBaseUrl,
          connectTimeout: const Duration(seconds: 20),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Content-Type': 'application/json'},
        ),
      ) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('partnerAccessToken');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio dio;

  dynamic unwrap(Response<dynamic> response) {
    final body = response.data;
    if (body is Map<String, dynamic> && body.containsKey('data')) {
      return body['data'];
    }
    return body;
  }

  List<Map<String, dynamic>> list(Response<dynamic> response) {
    final data = unwrap(response);
    if (data is List) return data.whereType<Map<String, dynamic>>().toList();
    if (data is Map<String, dynamic>) {
      final items = data['items'] ?? data['data'] ?? data['results'];
      if (items is List) {
        return items.whereType<Map<String, dynamic>>().toList();
      }
    }
    return const [];
  }

  String message(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      if (data is Map && data['message'] != null) {
        final msg = data['message'];
        return msg is List ? msg.join(', ') : msg.toString();
      }
      return error.message ?? 'Network error';
    }
    return error.toString();
  }
}
