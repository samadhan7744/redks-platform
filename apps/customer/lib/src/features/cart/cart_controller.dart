import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/models/models.dart';

final cartProvider = StateNotifierProvider<CartController, List<CartItem>>((
  ref,
) {
  return CartController()..restore();
});

class CartItem {
  CartItem({required this.product, required this.quantity});
  final ProductModel product;
  final int quantity;

  double get lineTotal => product.price * quantity;

  Map<String, dynamic> toJson() => {
    'product': {
      'id': product.id,
      'name': product.name,
      'price': product.price,
      'stock': product.stock,
      'description': product.description,
      'unit': product.unit,
      'shop': product.shop == null
          ? null
          : {'id': product.shop!.id, 'name': product.shop!.name},
    },
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    product: ProductModel.fromJson(json['product'] as Map<String, dynamic>),
    quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 1,
  );
}

class CartController extends StateNotifier<List<CartItem>> {
  CartController() : super(const []);

  double get total => state.fold(0, (sum, item) => sum + item.lineTotal);
  String? get shopId => state.isEmpty ? null : state.first.product.shop?.id;

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('cart');
    if (raw == null) return;
    final decoded = jsonDecode(raw) as List;
    state = decoded
        .whereType<Map<String, dynamic>>()
        .map(CartItem.fromJson)
        .toList();
  }

  Future<void> add(ProductModel product) async {
    if (state.isNotEmpty && state.first.product.shop?.id != product.shop?.id) {
      state = [];
    }
    final existing = state
        .where((item) => item.product.id == product.id)
        .firstOrNull;
    if (existing == null) {
      state = [...state, CartItem(product: product, quantity: 1)];
    } else {
      state = [
        for (final item in state)
          item.product.id == product.id
              ? CartItem(product: product, quantity: item.quantity + 1)
              : item,
      ];
    }
    await persist();
  }

  Future<void> update(String productId, int quantity) async {
    state = [
      for (final item in state)
        if (item.product.id == productId && quantity > 0)
          CartItem(product: item.product, quantity: quantity),
    ];
    await persist();
  }

  Future<void> clear() async {
    state = [];
    await persist();
  }

  Future<void> persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'cart',
      jsonEncode(state.map((item) => item.toJson()).toList()),
    );
  }
}
