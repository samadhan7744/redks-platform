import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import 'order_tracking_screen.dart';
import 'orders_screen.dart';

final orderDetailProvider = FutureProvider.autoDispose
    .family<OrderModel, String>((ref, id) {
      return ref.watch(redKsRepositoryProvider).order(id);
    });

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});
  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final order = ref.watch(orderDetailProvider(orderId));
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Order Detail'),
      body: order.when(
        data: (item) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.orderNumber,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    StatusBadge(item.status),
                    const SizedBox(height: 12),
                    Text(
                      'Total ₹${item.totalAmount.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...item.items.map(
              (line) => Card(
                child: ListTile(
                  title: Text(line.name),
                  subtitle: Text('Qty ${line.quantity}'),
                  trailing: Text('₹${line.lineTotal.toStringAsFixed(0)}'),
                ),
              ),
            ),
            const SizedBox(height: 12),
            PrimaryButton(
              label: 'Track order',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => OrderTrackingScreen(order: item),
                ),
              ),
            ),
            const SizedBox(height: 8),
            if (['PLACED', 'CONFIRMED', 'ACCEPTED'].contains(item.status))
              OutlinedButton(
                onPressed: () async {
                  await ref.read(redKsRepositoryProvider).cancelOrder(item.id);
                  ref.invalidate(ordersProvider);
                  ref.invalidate(orderDetailProvider(item.id));
                },
                child: const Text('Cancel order'),
              ),
          ],
        ),
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(error.toString()),
      ),
    );
  }
}
