import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../models/models.dart';

final redKsRepositoryProvider = Provider<RedKsRepository>((ref) {
  return RedKsRepository(ref.watch(apiClientProvider));
});

class RedKsRepository {
  RedKsRepository(this.client);
  final ApiClient client;

  Future<String?> requestOtp(String phone) async {
    final response = await client.dio.post(
      '/auth/request-otp',
      data: {'phone': phone},
    );
    final data = response.data as Map<String, dynamic>;
    return data['devOtp']?.toString();
  }

  Future<UserModel> verifyOtp(String phone, String otp) async {
    final response = await client.dio.post(
      '/auth/verify-otp',
      data: {'phone': phone, 'otp': otp},
    );
    final data = client.unwrap(response) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', data['accessToken'].toString());
    if (data['refreshToken'] != null) {
      await prefs.setString('refreshToken', data['refreshToken'].toString());
    }
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<UserModel> me() async {
    final response = await client.dio.get('/auth/me');
    return UserModel.fromJson(client.unwrap(response) as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
  }

  Future<List<CityModel>> cities() async {
    final response = await client.dio.get('/cities');
    return _list(response).map(CityModel.fromJson).toList();
  }

  Future<List<ZoneModel>> zones(String cityId) async {
    final response = await client.dio.get('/cities/$cityId/zones');
    return _list(response).map(ZoneModel.fromJson).toList();
  }

  Future<List<CategoryModel>> categories() async {
    final response = await client.dio.get('/categories');
    return _list(response).map(CategoryModel.fromJson).toList();
  }

  Future<List<ShopModel>> shops({
    String? cityId,
    String? zoneId,
    String? categoryId,
    String? search,
  }) async {
    final response = await client.dio.get(
      '/shops',
      queryParameters: {
        'cityId': cityId,
        'zoneId': zoneId,
        'categoryId': categoryId,
        'search': search,
        'limit': 50,
      }..removeWhere((_, value) => value == null || value == ''),
    );
    return _list(response).map(ShopModel.fromJson).toList();
  }

  Future<List<ShopModel>> nearbyShops({
    required double latitude,
    required double longitude,
    double radiusKm = 5,
  }) async {
    final response = await client.dio.get(
      '/shops/nearby',
      queryParameters: {
        'lat': latitude,
        'lng': longitude,
        'radiusKm': radiusKm,
      },
    );
    return _list(response).map(ShopModel.fromJson).toList();
  }

  Future<List<ProductModel>> products({
    String? shopId,
    String? categoryId,
    String? search,
  }) async {
    final response = await client.dio.get(
      '/products',
      queryParameters: {
        'shopId': shopId,
        'categoryId': categoryId,
        'search': search,
        'limit': 50,
      }..removeWhere((_, value) => value == null || value == ''),
    );
    return _list(response).map(ProductModel.fromJson).toList();
  }

  Future<List<AddressModel>> addresses() async {
    final response = await client.dio.get('/me/addresses');
    return _list(response).map(AddressModel.fromJson).toList();
  }

  Future<AddressModel> createAddress({
    required String line1,
    required String pincode,
    required String cityId,
    String? zoneId,
    String? landmark,
    double? latitude,
    double? longitude,
    bool isDefault = false,
  }) async {
    final response = await client.dio.post(
      '/me/addresses',
      data: {
        'addressLine1': line1,
        'pincode': pincode,
        'cityId': cityId,
        'zoneId': zoneId,
        'landmark': landmark,
        'latitude': latitude,
        'longitude': longitude,
        'isDefault': isDefault,
      }..removeWhere((_, value) => value == null || value == ''),
    );
    return AddressModel.fromJson(
      client.unwrap(response) as Map<String, dynamic>,
    );
  }

  Future<void> setDefaultAddress(String id) async {
    await client.dio.patch('/me/addresses/$id/default');
  }

  Future<OrderModel> createOrder({
    required String shopId,
    required String addressId,
    required List<Map<String, dynamic>> items,
    String paymentMethod = 'COD',
  }) async {
    final response = await client.dio.post(
      '/orders',
      data: {
        'shopId': shopId,
        'addressId': addressId,
        'paymentMethod': paymentMethod,
        'items': items,
      },
    );
    return OrderModel.fromJson(client.unwrap(response) as Map<String, dynamic>);
  }

  Future<List<OrderModel>> orders() async {
    final response = await client.dio.get('/orders/my-orders');
    return _list(response).map(OrderModel.fromJson).toList();
  }

  Future<OrderModel> order(String id) async {
    final response = await client.dio.get('/orders/$id');
    return OrderModel.fromJson(client.unwrap(response) as Map<String, dynamic>);
  }

  Future<void> cancelOrder(String id) async {
    await client.dio.patch(
      '/orders/$id/cancel',
      data: {'reason': 'Cancelled from customer app'},
    );
  }

  Future<ItemRequestModel> createItemRequest({
    required String cityId,
    String? zoneId,
    required String description,
  }) async {
    final response = await client.dio.post(
      '/item-requests',
      data: {'cityId': cityId, 'zoneId': zoneId, 'description': description}
        ..removeWhere((_, value) => value == null || value == ''),
    );
    return ItemRequestModel.fromJson(
      client.unwrap(response) as Map<String, dynamic>,
    );
  }

  Future<List<ItemRequestModel>> itemRequests() async {
    final response = await client.dio.get('/item-requests/my-requests');
    return _list(response).map(ItemRequestModel.fromJson).toList();
  }

  Future<void> acceptQuote(String quoteId) async {
    await client.dio.patch('/item-requests/quotes/$quoteId/accept');
  }

  List<Map<String, dynamic>> _list(dynamic response) {
    final data = client.unwrap(response);
    if (data is List) return data.whereType<Map<String, dynamic>>().toList();
    return const [];
  }
}
