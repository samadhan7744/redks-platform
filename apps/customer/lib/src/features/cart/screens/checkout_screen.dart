import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import '../../addresses/screens/addresses_screen.dart';
import '../../orders/screens/order_detail_screen.dart';
import '../cart_controller.dart';

final addressesProvider = FutureProvider.autoDispose<List<AddressModel>>((ref) {
  return ref.watch(redKsRepositoryProvider).addresses();
});

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String? addressId;
  String paymentMethod = 'COD';
  bool loading = false;
  String? error;

  @override
  Widget build(BuildContext context) {
    final addresses = ref.watch(addressesProvider);
    final cartItems = ref.watch(cartProvider);
    final cart = ref.read(cartProvider.notifier);

    return Scaffold(
      appBar: const RedKsAppBar(title: 'Checkout'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Delivery address',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          addresses.when(
            data: (items) {
              if (items.isEmpty) {
                return OutlinedButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AddressesScreen()),
                  ),
                  child: const Text('Add address'),
                );
              }
              addressId ??= items.first.id;
              return Column(
                children: items.map((address) {
                  final selected = addressId == address.id;
                  return Card(
                    child: ListTile(
                      onTap: () => setState(() => addressId = address.id),
                      leading: Icon(
                        selected
                            ? Icons.check_circle
                            : Icons.radio_button_unchecked,
                      ),
                      title: Text(address.line1),
                      subtitle: Text(
                        '${address.city?.name ?? ''} ${address.pincode}',
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const SizedBox(height: 100, child: LoadingView()),
            error: (error, _) => ErrorView(error.toString()),
          ),
          const SizedBox(height: 16),
          const Text(
            'Payment',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          Wrap(
            spacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Cash on Delivery'),
                selected: paymentMethod == 'COD',
                onSelected: (_) => setState(() => paymentMethod = 'COD'),
              ),
              ChoiceChip(
                label: const Text('Online payment placeholder'),
                selected: paymentMethod == 'ONLINE',
                onSelected: (_) => setState(() => paymentMethod = 'ONLINE'),
              ),
            ],
          ),
          if (error != null)
            Text(error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 16),
          Text(
            'Total: ₹${cart.total.toStringAsFixed(0)}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16),
        child: PrimaryButton(
          label: 'Place order',
          loading: loading,
          onPressed: addressId == null || cartItems.isEmpty
              ? null
              : () async {
                  setState(() {
                    loading = true;
                    error = null;
                  });
                  try {
                    final order = await ref
                        .read(redKsRepositoryProvider)
                        .createOrder(
                          shopId: cart.shopId!,
                          addressId: addressId!,
                          paymentMethod: paymentMethod,
                          items: cartItems
                              .map(
                                (item) => {
                                  'productId': item.product.id,
                                  'quantity': item.quantity,
                                },
                              )
                              .toList(),
                        );
                    await cart.clear();
                    if (context.mounted) {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (_) => OrderDetailScreen(orderId: order.id),
                        ),
                      );
                    }
                  } catch (e) {
                    setState(() => error = e.toString());
                  } finally {
                    if (mounted) setState(() => loading = false);
                  }
                },
        ),
      ),
    );
  }
}
