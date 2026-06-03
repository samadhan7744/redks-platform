import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/models/models.dart';
import '../../cart/cart_controller.dart';

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: RedKsAppBar(title: product.name),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            height: 220,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.inventory_2_outlined, size: 80),
          ),
          const SizedBox(height: 16),
          Text(
            product.name,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            '₹${product.price.toStringAsFixed(0)} · ${product.unit}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(product.description ?? 'No description available.'),
          const SizedBox(height: 8),
          Text(
            product.stock > 0 ? '${product.stock} in stock' : 'Out of stock',
          ),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: PrimaryButton(
          label: 'Add to cart',
          onPressed: product.stock > 0
              ? () => ref.read(cartProvider.notifier).add(product)
              : null,
        ),
      ),
    );
  }
}
