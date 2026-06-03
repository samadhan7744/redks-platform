import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/empty_state_alias.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../cart_controller.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final cart = ref.read(cartProvider.notifier);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Cart'),
      body: items.isEmpty
          ? const EmptyStateAlias('Your cart is empty.')
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ...items.map(
                  (item) => Card(
                    child: ListTile(
                      title: Text(item.product.name),
                      subtitle: Text(
                        '₹${item.product.price.toStringAsFixed(0)} x ${item.quantity}',
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            onPressed: () =>
                                cart.update(item.product.id, item.quantity - 1),
                            icon: const Icon(Icons.remove),
                          ),
                          Text('${item.quantity}'),
                          IconButton(
                            onPressed: () =>
                                cart.update(item.product.id, item.quantity + 1),
                            icon: const Icon(Icons.add),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Total: ₹${cart.total.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
      bottomNavigationBar: items.isEmpty
          ? null
          : Padding(
              padding: const EdgeInsets.all(16),
              child: PrimaryButton(
                label: 'Checkout',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                ),
              ),
            ),
    );
  }
}
