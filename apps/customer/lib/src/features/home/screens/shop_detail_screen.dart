import 'package:flutter/material.dart';

import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/models/models.dart';
import 'products_screen.dart';

class ShopDetailScreen extends StatelessWidget {
  const ShopDetailScreen({super.key, required this.shop});
  final ShopModel shop;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: RedKsAppBar(title: shop.name),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            height: 160,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.store, size: 72),
          ),
          const SizedBox(height: 16),
          Text(
            shop.name,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(shop.description ?? 'Local shop on RedKS.'),
          const SizedBox(height: 8),
          Text('${shop.city?.name ?? ''} ${shop.zone?.name ?? ''}'),
          const SizedBox(height: 24),
          PrimaryButton(
            label: 'Browse products',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ProductsScreen(shop: shop)),
            ),
          ),
        ],
      ),
    );
  }
}
