import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import 'order_detail_screen.dart';

final ordersProvider = FutureProvider.autoDispose<List<OrderModel>>((ref) {
  return ref.watch(redKsRepositoryProvider).orders();
});

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersProvider);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'My Orders'),
      body: orders.when(
        data: (items) => items.isEmpty
            ? const EmptyView('No orders yet.')
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final order = items[index];
                  return Card(
                    child: ListTile(
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => OrderDetailScreen(orderId: order.id),
                        ),
                      ),
                      title: Text(order.orderNumber),
                      subtitle: Text(
                        '₹${order.totalAmount.toStringAsFixed(0)}',
                      ),
                      trailing: StatusBadge(order.status),
                    ),
                  );
                },
              ),
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(
          error.toString(),
          onRetry: () => ref.invalidate(ordersProvider),
        ),
      ),
    );
  }
}
