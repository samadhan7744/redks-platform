import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/network/api_client.dart';
import '../../../core/widgets/widgets.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/partner_repository.dart';
import '../../common/mode_selection_screen.dart';
import '../../shop/screens/shop_shell.dart';

class RiderShell extends StatefulWidget {
  const RiderShell({super.key});

  @override
  State<RiderShell> createState() => _RiderShellState();
}

class _RiderShellState extends State<RiderShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = const [
      RiderAvailabilityScreen(),
      AvailableOrdersScreen(),
      ActiveOrderScreen(),
      EarningsScreen(),
      ProfileScreen(),
    ];
    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.toggle_off_outlined),
            selectedIcon: Icon(Icons.toggle_on),
            label: 'Online',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            selectedIcon: Icon(Icons.list_alt),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.route_outlined),
            selectedIcon: Icon(Icons.route),
            label: 'Active',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Earnings',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class RiderAvailabilityScreen extends ConsumerStatefulWidget {
  const RiderAvailabilityScreen({super.key});

  @override
  ConsumerState<RiderAvailabilityScreen> createState() =>
      _RiderAvailabilityScreenState();
}

class _RiderAvailabilityScreenState
    extends ConsumerState<RiderAvailabilityScreen> {
  String _status = 'UNAVAILABLE';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(
        () => _status = prefs.getString('riderAvailability') ?? 'UNAVAILABLE',
      );
    }
  }

  Future<void> _setAvailability(String status) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(partnerRepositoryProvider).updateAvailability(status);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('riderAvailability', status);
      if (mounted) setState(() => _status = status);
    } catch (error) {
      setState(() => _error = ref.read(apiClientProvider).message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final online = _status == 'AVAILABLE';
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Rider Availability'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          online ? 'You are online' : 'You are offline',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      StatusBadge(_status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Available orders are matched by your zone on the backend.',
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  const SizedBox(height: 18),
                  PrimaryButton(
                    label: online ? 'Go Offline' : 'Go Online',
                    loading: _loading,
                    onPressed: () =>
                        _setAvailability(online ? 'UNAVAILABLE' : 'AVAILABLE'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class AvailableOrdersScreen extends ConsumerStatefulWidget {
  const AvailableOrdersScreen({super.key});

  @override
  ConsumerState<AvailableOrdersScreen> createState() =>
      _AvailableOrdersScreenState();
}

class _AvailableOrdersScreenState extends ConsumerState<AvailableOrdersScreen> {
  late Future<List<OrderModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(partnerRepositoryProvider).availableOrders();
  }

  void _reload() => setState(
    () => _future = ref.read(partnerRepositoryProvider).availableOrders(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Available Orders'),
      body: FutureBuilder<List<OrderModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingView();
          }
          if (snap.hasError) {
            return ErrorView(
              ref.read(apiClientProvider).message(snap.error!),
              onRetry: _reload,
            );
          }
          final orders = snap.data ?? const <OrderModel>[];
          if (orders.isEmpty) {
            return const EmptyView('No available deliveries in your zone.');
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) =>
                  _RiderOrderTile(order: orders[index], onChanged: _reload),
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemCount: orders.length,
            ),
          );
        },
      ),
    );
  }
}

class ActiveOrderScreen extends StatefulWidget {
  const ActiveOrderScreen({super.key});

  @override
  State<ActiveOrderScreen> createState() => _ActiveOrderScreenState();
}

class _ActiveOrderScreenState extends State<ActiveOrderScreen> {
  String? _orderNumber;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() => _orderNumber = prefs.getString('activeRiderOrder'));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'My Active Order'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_orderNumber == null)
            const EmptyView('Accept an available order to see it here.')
          else
            Card(
              child: ListTile(
                leading: const CircleAvatar(child: Icon(Icons.route)),
                title: Text(
                  _orderNumber!,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                subtitle: const Text(
                  'Use Available Orders or order detail actions to update pickup and delivery.',
                ),
                trailing: const StatusBadge('ACTIVE'),
              ),
            ),
        ],
      ),
    );
  }
}

class EarningsScreen extends StatelessWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      appBar: RedKsAppBar(title: 'Earnings'),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            MetricCard(
              label: 'Today earnings',
              value: 'Rs 0',
              icon: Icons.payments,
            ),
            MetricCard(
              label: 'Completed deliveries',
              value: '0',
              icon: Icons.check_circle,
            ),
            EmptyView('Detailed payout and incentive APIs are planned.'),
          ],
        ),
      ),
    );
  }
}

class _RiderOrderTile extends ConsumerWidget {
  const _RiderOrderTile({required this.order, required this.onChanged});

  final OrderModel order;
  final VoidCallback onChanged;

  Future<void> _rememberActiveOrder() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'activeRiderOrder',
      order.orderNumber.isEmpty ? order.id : order.orderNumber,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        title: Text(
          order.orderNumber.isEmpty ? order.id : order.orderNumber,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          'COD/online amount Rs ${order.totalAmount.toStringAsFixed(0)}',
        ),
        trailing: StatusBadge(order.status),
        onTap: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) =>
                  OrderDetailScreen(order: order, role: OrderRole.rider),
            ),
          );
          if (changed == true) {
            await _rememberActiveOrder();
            onChanged();
          }
        },
      ),
    );
  }
}
