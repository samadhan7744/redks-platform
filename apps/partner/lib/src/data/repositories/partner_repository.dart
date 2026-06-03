import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/network/api_client.dart';
import '../models/models.dart';

final partnerRepositoryProvider = Provider<PartnerRepository>(
  (ref) => PartnerRepository(ref.watch(apiClientProvider)),
);

class PartnerRepository {
  PartnerRepository(this.client);
  final ApiClient client;

  Future<String?> requestOtp(String phone) async {
    final res = await client.dio.post(
      '/auth/request-otp',
      data: {'phone': phone},
    );
    return (res.data as Map<String, dynamic>)['devOtp']?.toString();
  }

  Future<UserModel> verifyOtp(String phone, String otp) async {
    final res = await client.dio.post(
      '/auth/verify-otp',
      data: {'phone': phone, 'otp': otp},
    );
    final data = client.unwrap(res) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('partnerAccessToken', data['accessToken'].toString());
    if (data['refreshToken'] != null) {
      await prefs.setString(
        'partnerRefreshToken',
        data['refreshToken'].toString(),
      );
    }
    return UserModel.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<UserModel> me() async => UserModel.fromJson(
    client.unwrap(await client.dio.get('/auth/me')) as Map<String, dynamic>,
  );

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('partnerAccessToken');
    await prefs.remove('partnerRefreshToken');
  }

  Future<List<CityModel>> cities() async => client
      .list(await client.dio.get('/cities'))
      .map(CityModel.fromJson)
      .toList();
  Future<List<ZoneModel>> zones(String cityId) async => client
      .list(await client.dio.get('/cities/$cityId/zones'))
      .map(ZoneModel.fromJson)
      .toList();
  Future<List<CategoryModel>> categories() async => client
      .list(await client.dio.get('/categories'))
      .map(CategoryModel.fromJson)
      .toList();

  Future<ShopModel> registerShop(Map<String, dynamic> data) async =>
      ShopModel.fromJson(
        client.unwrap(await client.dio.post('/shops/register', data: data))
            as Map<String, dynamic>,
      );
  Future<ShopModel> myShop() async => ShopModel.fromJson(
    client.unwrap(await client.dio.get('/shops/my-shop'))
        as Map<String, dynamic>,
  );
  Future<ShopModel> updateMyShop(Map<String, dynamic> data) async =>
      ShopModel.fromJson(
        client.unwrap(await client.dio.patch('/shops/my-shop', data: data))
            as Map<String, dynamic>,
      );

  Future<List<ProductModel>> myProducts() async => client
      .list(await client.dio.get('/products/my-products'))
      .map(ProductModel.fromJson)
      .toList();
  Future<ProductModel> createProduct(Map<String, dynamic> data) async =>
      ProductModel.fromJson(
        client.unwrap(await client.dio.post('/products', data: data))
            as Map<String, dynamic>,
      );
  Future<ProductModel> updateProduct(
    String id,
    Map<String, dynamic> data,
  ) async => ProductModel.fromJson(
    client.unwrap(await client.dio.patch('/products/$id', data: data))
        as Map<String, dynamic>,
  );
  Future<void> deleteProduct(String id) async =>
      client.dio.delete('/products/$id');
  Future<void> updateStock(String id, int stock) async =>
      client.dio.patch('/products/$id/stock', data: {'stock': stock});

  Future<List<OrderModel>> shopOrders() async => client
      .list(await client.dio.get('/shop/orders'))
      .map(OrderModel.fromJson)
      .toList();
  Future<OrderModel> order(String id) async => OrderModel.fromJson(
    client.unwrap(await client.dio.get('/orders/$id')) as Map<String, dynamic>,
  );
  Future<void> acceptOrder(String id) async =>
      client.dio.patch('/shop/orders/$id/accept');
  Future<void> rejectOrder(String id, String reason) async =>
      client.dio.patch('/shop/orders/$id/reject', data: {'reason': reason});
  Future<void> readyOrder(String id) async =>
      client.dio.patch('/shop/orders/$id/ready');

  Future<List<ItemRequestModel>> nearbyItemRequests() async => client
      .list(await client.dio.get('/shop/item-requests/nearby'))
      .map(ItemRequestModel.fromJson)
      .toList();
  Future<QuoteModel> sendQuote(String id, double amount, String note) async =>
      QuoteModel.fromJson(
        client.unwrap(
              await client.dio.post(
                '/shop/item-requests/$id/quotes',
                data: {'amount': amount, 'note': note},
              ),
            )
            as Map<String, dynamic>,
      );
  Future<QuoteModel> updateQuote(
    String quoteId,
    double amount,
    String status,
  ) async => QuoteModel.fromJson(
    client.unwrap(
          await client.dio.patch(
            '/shop/item-requests/quotes/$quoteId',
            data: {'amount': amount, 'status': status},
          ),
        )
        as Map<String, dynamic>,
  );

  Future<void> updateAvailability(String status) async => client.dio.patch(
    '/delivery/rider/availability',
    data: {'availabilityStatus': status},
  );
  Future<List<OrderModel>> availableOrders() async => client
      .list(await client.dio.get('/rider/orders/available'))
      .map(OrderModel.fromJson)
      .toList();
  Future<void> acceptDelivery(String id) async =>
      client.dio.patch('/rider/orders/$id/accept');
  Future<void> pickupOrder(String id) async =>
      client.dio.patch('/rider/orders/$id/pickup');
  Future<void> deliverOrder(String id) async =>
      client.dio.patch('/rider/orders/$id/deliver');
}
