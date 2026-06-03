class UserModel {
  UserModel({required this.id, required this.phone, this.name, this.email});
  final String id;
  final String phone;
  final String? name;
  final String? email;

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id']?.toString() ?? '',
    phone: json['phone']?.toString() ?? '',
    name: json['name']?.toString(),
    email: json['email']?.toString(),
  );
}

class CityModel {
  CityModel({
    required this.id,
    required this.name,
    required this.state,
    this.zones = const [],
  });
  final String id;
  final String name;
  final String state;
  final List<ZoneModel> zones;

  factory CityModel.fromJson(Map<String, dynamic> json) => CityModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    state: json['state']?.toString() ?? '',
    zones: ((json['zones'] as List?) ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ZoneModel.fromJson)
        .toList(),
  );
}

class ZoneModel {
  ZoneModel({required this.id, required this.name, this.cityId});
  final String id;
  final String name;
  final String? cityId;

  factory ZoneModel.fromJson(Map<String, dynamic> json) => ZoneModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    cityId: json['cityId']?.toString(),
  );
}

class CategoryModel {
  CategoryModel({required this.id, required this.name});
  final String id;
  final String name;

  factory CategoryModel.fromJson(Map<String, dynamic> json) => CategoryModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
  );
}

class ShopModel {
  ShopModel({
    required this.id,
    required this.name,
    this.description,
    this.phone,
    this.city,
    this.zone,
  });
  final String id;
  final String name;
  final String? description;
  final String? phone;
  final CityModel? city;
  final ZoneModel? zone;

  factory ShopModel.fromJson(Map<String, dynamic> json) => ShopModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    description: json['description']?.toString(),
    phone: json['phone']?.toString(),
    city: json['city'] is Map<String, dynamic>
        ? CityModel.fromJson(json['city'])
        : null,
    zone: json['zone'] is Map<String, dynamic>
        ? ZoneModel.fromJson(json['zone'])
        : null,
  );
}

class ProductModel {
  ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    this.description,
    this.imageUrl,
    this.unit = 'piece',
    this.shop,
    this.category,
  });
  final String id;
  final String name;
  final double price;
  final int stock;
  final String? description;
  final String? imageUrl;
  final String unit;
  final ShopModel? shop;
  final CategoryModel? category;

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
    stock: int.tryParse(json['stock']?.toString() ?? '') ?? 0,
    description: json['description']?.toString(),
    imageUrl: json['imageUrl']?.toString(),
    unit: json['unit']?.toString() ?? 'piece',
    shop: json['shop'] is Map<String, dynamic>
        ? ShopModel.fromJson(json['shop'])
        : null,
    category: json['category'] is Map<String, dynamic>
        ? CategoryModel.fromJson(json['category'])
        : null,
  );
}

class AddressModel {
  AddressModel({
    required this.id,
    required this.line1,
    required this.pincode,
    this.city,
    this.zone,
    this.landmark,
  });
  final String id;
  final String line1;
  final String pincode;
  final String? landmark;
  final CityModel? city;
  final ZoneModel? zone;

  factory AddressModel.fromJson(Map<String, dynamic> json) => AddressModel(
    id: json['id']?.toString() ?? '',
    line1: json['line1']?.toString() ?? '',
    pincode: json['pincode']?.toString() ?? '',
    landmark: json['landmark']?.toString(),
    city: json['city'] is Map<String, dynamic>
        ? CityModel.fromJson(json['city'])
        : null,
    zone: json['zone'] is Map<String, dynamic>
        ? ZoneModel.fromJson(json['zone'])
        : null,
  );
}

class OrderModel {
  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    this.paymentStatus,
    this.items = const [],
  });
  final String id;
  final String orderNumber;
  final String status;
  final String? paymentStatus;
  final double totalAmount;
  final List<OrderItemModel> items;

  factory OrderModel.fromJson(Map<String, dynamic> json) => OrderModel(
    id: json['id']?.toString() ?? '',
    orderNumber: json['orderNumber']?.toString() ?? '',
    status: json['status']?.toString() ?? '',
    paymentStatus: json['paymentStatus']?.toString(),
    totalAmount: double.tryParse(json['totalAmount']?.toString() ?? '') ?? 0,
    items: ((json['items'] as List?) ?? [])
        .whereType<Map<String, dynamic>>()
        .map(OrderItemModel.fromJson)
        .toList(),
  );
}

class OrderItemModel {
  OrderItemModel({
    required this.name,
    required this.quantity,
    required this.lineTotal,
  });
  final String name;
  final int quantity;
  final double lineTotal;

  factory OrderItemModel.fromJson(Map<String, dynamic> json) => OrderItemModel(
    name: json['name']?.toString() ?? '',
    quantity: int.tryParse(json['quantity']?.toString() ?? '') ?? 0,
    lineTotal: double.tryParse(json['lineTotal']?.toString() ?? '') ?? 0,
  );
}

class ItemRequestModel {
  ItemRequestModel({
    required this.id,
    required this.description,
    required this.status,
    this.quotedAmount,
    this.quotes = const [],
  });
  final String id;
  final String description;
  final String status;
  final double? quotedAmount;
  final List<QuoteModel> quotes;

  factory ItemRequestModel.fromJson(Map<String, dynamic> json) =>
      ItemRequestModel(
        id: json['id']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        quotedAmount: double.tryParse(json['quotedAmount']?.toString() ?? ''),
        quotes: ((json['quotes'] as List?) ?? [])
            .whereType<Map<String, dynamic>>()
            .map(QuoteModel.fromJson)
            .toList(),
      );
}

class QuoteModel {
  QuoteModel({required this.id, required this.status, required this.amount});
  final String id;
  final String status;
  final double amount;

  factory QuoteModel.fromJson(Map<String, dynamic> json) => QuoteModel(
    id: json['id']?.toString() ?? '',
    status: json['status']?.toString() ?? '',
    amount: double.tryParse(json['amount']?.toString() ?? '') ?? 0,
  );
}
