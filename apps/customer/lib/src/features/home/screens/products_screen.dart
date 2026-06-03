import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import '../../cart/cart_controller.dart';
import '../widgets/cards.dart';
import 'product_detail_screen.dart';

final productSearchProvider = StateProvider.autoDispose<String>((ref) => '');

class ProductsScreen extends ConsumerWidget {
  const ProductsScreen({super.key, this.shop, this.category});
  final ShopModel? shop;
  final CategoryModel? category;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final search = ref.watch(productSearchProvider);
    final products = ref.watch(
      FutureProvider.autoDispose<List<ProductModel>>((ref) {
        return ref
            .watch(redKsRepositoryProvider)
            .products(
              shopId: shop?.id,
              categoryId: category?.id,
              search: search,
            );
      }),
    );

    return Scaffold(
      appBar: RedKsAppBar(title: shop?.name ?? category?.name ?? 'Products'),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search products',
              ),
              onChanged: (value) =>
                  ref.read(productSearchProvider.notifier).state = value,
            ),
          ),
          Expanded(
            child: products.when(
              data: (items) => items.isEmpty
                  ? const EmptyView('No products found.')
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.68,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final product = items[index];
                        return ProductCard(
                          product: product,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) =>
                                  ProductDetailScreen(product: product),
                            ),
                          ),
                          onAdd: () =>
                              ref.read(cartProvider.notifier).add(product),
                        );
                      },
                    ),
              loading: () => const LoadingView(),
              error: (error, _) => ErrorView(error.toString()),
            ),
          ),
        ],
      ),
    );
  }
}
