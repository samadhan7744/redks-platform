import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets/widgets.dart';
import '../auth/auth_controller.dart';

class ModeSelectionScreen extends ConsumerWidget {
  const ModeSelectionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: RedKsAppBar(
        title: 'Choose mode',
        actions: [
          IconButton(
            tooltip: 'Logout',
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ModeCard(
            title: 'Shop Mode',
            subtitle:
                'Manage shop profile, products, orders, and item request quotes.',
            icon: Icons.storefront,
            onTap: () => ref.read(modeProvider.notifier).setMode('SHOP'),
          ),
          const SizedBox(height: 12),
          _ModeCard(
            title: 'Rider Mode',
            subtitle:
                'Go online, accept delivery orders, and update pickup or delivery status.',
            icon: Icons.delivery_dining,
            onTap: () => ref.read(modeProvider.notifier).setMode('RIDER'),
          ),
        ],
      ),
    );
  }
}

class _ModeCard extends StatelessWidget {
  const _ModeCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        minVerticalPadding: 20,
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primary,
          child: Icon(icon, color: Colors.white),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    final mode = ref.watch(modeProvider);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Profile'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user?.name ?? 'Partner',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('+91 ${user?.phone ?? ''}'),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      StatusBadge(mode ?? 'NO MODE'),
                      ...?user?.roles.map(StatusBadge.new),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => ref
                .read(modeProvider.notifier)
                .setMode(mode == 'SHOP' ? 'RIDER' : 'SHOP'),
            icon: const Icon(Icons.swap_horiz),
            label: const Text('Switch mode'),
          ),
          const SizedBox(height: 8),
          FilledButton.icon(
            onPressed: () => ref.read(authProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
