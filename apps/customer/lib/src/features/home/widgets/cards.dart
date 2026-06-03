import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../data/models/models.dart';

class CategoryChip extends StatelessWidget {
  const CategoryChip({
    super.key,
    required this.category,
    this.selected = false,
    required this.onTap,
  });
  final CategoryModel category;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(category.name),
      selected: selected,
      selectedColor: AppTheme.red.withValues(alpha: 0.15),
      onSelected: (_) => onTap(),
    );
  }
}

class ShopCard extends StatelessWidget {
  const ShopCard({super.key, required this.shop, required this.onTap});
  final ShopModel shop;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: const CircleAvatar(
          backgroundColor: AppTheme.red,
          child: Icon(Icons.store, color: Colors.white),
        ),
        title: Text(
          shop.name,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          '${shop.city?.name ?? 'City'} · ${shop.zone?.name ?? 'Zone'}',
        ),
        trailing: const Icon(Icons.chevron_right),
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onAdd,
  });
  final ProductModel product;
  final VoidCallback onTap;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                height: 86,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F2F4),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.inventory_2_outlined,
                  color: AppTheme.red,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                product.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text('₹${product.price.toStringAsFixed(0)} · ${product.unit}'),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: product.stock > 0 ? onAdd : null,
                  child: const Text('Add'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
