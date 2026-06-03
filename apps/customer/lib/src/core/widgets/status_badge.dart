import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.value, {super.key});

  final String value;

  @override
  Widget build(BuildContext context) {
    final normalized = value.replaceAll('_', ' ');
    final color = switch (value) {
      'APPROVED' || 'ACTIVE' || 'DELIVERED' || 'PAID' => Colors.green,
      'PENDING' || 'PLACED' || 'PENDING_APPROVAL' || 'QUOTED' => Colors.orange,
      'REJECTED' || 'CANCELLED' || 'FAILED' => Colors.red,
      _ => Colors.blueGrey,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        normalized,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
