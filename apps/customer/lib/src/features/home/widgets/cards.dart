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
      backgroundColor: Colors.white,
      side: const BorderSide(color: AppTheme.border),
      labelStyle: TextStyle(
        color: selected ? AppTheme.red : AppTheme.dark,
        fontWeight: FontWeight.w800,
      ),
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
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                height: 54,
                width: 54,
                decoration: BoxDecoration(
                  color: AppTheme.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.storefront, color: AppTheme.red),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      shop.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${shop.city?.name ?? 'City'} / ${shop.zone?.name ?? 'Zone'}',
                      style: const TextStyle(color: AppTheme.muted),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const _MiniBadge(
                          Icons.verified_outlined,
                          'Trusted shop',
                        ),
                        const SizedBox(width: 8),
                        const _MiniBadge(Icons.schedule, 'Quick delivery'),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppTheme.muted),
            ],
          ),
        ),
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge(this.icon, this.label);

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppTheme.green),
          const SizedBox(width: 4),
          Text(
            label.replaceAll('_', ' '),
            style: const TextStyle(
              fontSize: 11,
              color: AppTheme.dark,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
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
                height: 92,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppTheme.red.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(14),
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
              Text(
                '₹${product.price.toStringAsFixed(0)} · ${product.unit}',
                style: const TextStyle(
                  color: AppTheme.dark,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                product.stock > 0 ? 'In stock' : 'Out of stock',
                style: TextStyle(
                  color: product.stock > 0 ? AppTheme.green : Colors.red,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonal(
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
