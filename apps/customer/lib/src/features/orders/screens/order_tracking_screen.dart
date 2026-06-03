import 'package:flutter/material.dart';

import '../../../core/widgets/redks_app_bar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/models.dart';

class OrderTrackingScreen extends StatelessWidget {
  const OrderTrackingScreen({super.key, required this.order});
  final OrderModel order;

  @override
  Widget build(BuildContext context) {
    final steps = [
      'PLACED',
      'ACCEPTED',
      'READY_FOR_PICKUP',
      'ASSIGNED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    final current = steps.indexOf(order.status);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Order Tracking'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          StatusBadge(order.status),
          const SizedBox(height: 16),
          ...steps.asMap().entries.map((entry) {
            final done = current >= entry.key || order.status == 'DELIVERED';
            return ListTile(
              leading: Icon(
                done ? Icons.check_circle : Icons.radio_button_unchecked,
              ),
              title: Text(entry.value.replaceAll('_', ' ')),
              subtitle: entry.value == order.status
                  ? const Text('Current status')
                  : null,
            );
          }),
          const SizedBox(height: 16),
          const Text('Live rider map and ETA will be added in a later phase.'),
        ],
      ),
    );
  }
}
