class UserModel {
  UserModel({
    required this.id,
    required this.phone,
    this.name,
    this.roles = const [],
  });
  final String id;
  final String phone;
  final String? name;
  final List<String> roles;
  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id: json['id']?.toString() ?? '',
    phone: json['phone']?.toString() ?? '',
    name: json['name']?.toString(),
    roles: ((json['roles'] as List?) ?? []).map((e) => e.toString()).toList(),
  );
}

class CityModel {
  CityModel({required this.id, required this.name});
  final String id;
  final String name;
  factory CityModel.fromJson(Map<String, dynamic> json) => CityModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
  );
}

class ZoneModel {
  ZoneModel({required this.id, required this.name});
  final String id;
  final String name;
  factory ZoneModel.fromJson(Map<String, dynamic> json) => ZoneModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
  );
}

class ShopModel {
  ShopModel({
    required this.id,
    required this.name,
    required this.status,
    this.phone,
    this.ownerName,
    this.ownerPhone,
    this.category,
    this.city,
    this.zone,
    this.rejectionReason,
    this.verificationStatus,
    this.documents = const [],
  });
  final String id;
  final String name;
  final String status;
  final String? phone;
  final String? ownerName;
  final String? ownerPhone;
  final CategoryModel? category;
  final CityModel? city;
  final ZoneModel? zone;
  final String? rejectionReason;
  final String? verificationStatus;
  final List<ShopDocumentModel> documents;
  factory ShopModel.fromJson(Map<String, dynamic> json) => ShopModel(
    id: json['id']?.toString() ?? '',
    name: json['shopName']?.toString() ?? json['name']?.toString() ?? '',
    status: json['status']?.toString() ?? '',
    phone: json['ownerPhone']?.toString() ?? json['phone']?.toString(),
    ownerName: json['ownerName']?.toString(),
    ownerPhone: json['ownerPhone']?.toString(),
    category: json['category'] is Map<String, dynamic>
        ? CategoryModel.fromJson(json['category'])
        : null,
    city: json['city'] is Map<String, dynamic>
        ? CityModel.fromJson(json['city'])
        : null,
    zone: json['zone'] is Map<String, dynamic>
        ? ZoneModel.fromJson(json['zone'])
        : null,
    rejectionReason: json['rejectionReason']?.toString(),
    verificationStatus: json['verificationStatus']?.toString(),
    documents: ((json['documents'] as List?) ?? [])
        .whereType<Map<String, dynamic>>()
        .map(ShopDocumentModel.fromJson)
        .toList(),
  );
}

class ShopDocumentModel {
  ShopDocumentModel({
    required this.id,
    required this.type,
    required this.fileUrl,
    required this.status,
    this.rejectionReason,
  });
  final String id;
  final String type;
  final String fileUrl;
  final String status;
  final String? rejectionReason;
  factory ShopDocumentModel.fromJson(Map<String, dynamic> json) =>
      ShopDocumentModel(
        id: json['id']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        fileUrl: json['fileUrl']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        rejectionReason: json['rejectionReason']?.toString(),
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

class ProductModel {
  ProductModel({
    required this.id,
    required this.name,
    required this.price,
    required this.stock,
    required this.status,
    this.category,
  });
  final String id;
  final String name;
  final double price;
  final int stock;
  final String status;
  final CategoryModel? category;
  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
    id: json['id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    price: double.tryParse(json['price']?.toString() ?? '') ?? 0,
    stock: int.tryParse(json['stock']?.toString() ?? '') ?? 0,
    status: json['status']?.toString() ?? '',
    category: json['category'] is Map<String, dynamic>
        ? CategoryModel.fromJson(json['category'])
        : null,
  );
}

class OrderModel {
  OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.totalAmount,
    this.items = const [],
  });
  final String id;
  final String orderNumber;
  final String status;
  final double totalAmount;
  final List<OrderItemModel> items;
  factory OrderModel.fromJson(Map<String, dynamic> json) => OrderModel(
    id: json['id']?.toString() ?? '',
    orderNumber: json['orderNumber']?.toString() ?? '',
    status: json['status']?.toString() ?? '',
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
  });
  final String id;
  final String description;
  final String status;
  final double? quotedAmount;
  factory ItemRequestModel.fromJson(Map<String, dynamic> json) =>
      ItemRequestModel(
        id: json['id']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        status: json['status']?.toString() ?? '',
        quotedAmount: double.tryParse(json['quotedAmount']?.toString() ?? ''),
      );
}

class QuoteModel {
  QuoteModel({required this.id, required this.amount, required this.status});
  final String id;
  final double amount;
  final String status;
  factory QuoteModel.fromJson(Map<String, dynamic> json) => QuoteModel(
    id: json['id']?.toString() ?? '',
    amount: double.tryParse(json['amount']?.toString() ?? '') ?? 0,
    status: json['status']?.toString() ?? '',
  );
}
