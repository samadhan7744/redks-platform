import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/redks_app_bar.dart';
import '../../addresses/screens/addresses_screen.dart';
import '../../auth/auth_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).valueOrNull;
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Profile'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: Text(user?.name ?? 'RedKS Customer'),
              subtitle: Text(user?.phone ?? ''),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.location_on_outlined),
              title: const Text('Addresses'),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AddressesScreen()),
              ),
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Logout'),
              onTap: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ),
        ],
      ),
    );
  }
}
