import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import '../../cart/cart_controller.dart';
import '../../cart/screens/checkout_screen.dart';
import '../../cart/screens/cart_screen.dart';
import '../../item_requests/screens/item_requests_screen.dart';
import '../../location/location_controller.dart';
import '../../orders/screens/orders_screen.dart';
import '../../profile/screens/profile_screen.dart';
import '../widgets/cards.dart';
import 'location_screen.dart';
import 'products_screen.dart';
import 'shop_detail_screen.dart';

final shopsProvider = FutureProvider.autoDispose<List<ShopModel>>((ref) {
  final repo = ref.watch(redKsRepositoryProvider);
  final city = ref.watch(selectedCityProvider);
  final zone = ref.watch(selectedZoneProvider);
  final addresses = ref.watch(addressesProvider).valueOrNull;
  AddressModel? selectedAddress;
  for (final address in addresses ?? const <AddressModel>[]) {
    if (address.isDefault) {
      selectedAddress = address;
      break;
    }
  }
  if (selectedAddress?.latitude != null && selectedAddress?.longitude != null) {
    return repo.nearbyShops(
      latitude: selectedAddress!.latitude!,
      longitude: selectedAddress.longitude!,
    );
  }
  return repo.shops(cityId: city?.id, zoneId: zone?.id);
});

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const BrowseHome(),
      const CartScreen(),
      const OrdersScreen(),
      const ItemRequestsScreen(),
      const ProfileScreen(),
    ];
    return Scaffold(
      body: screens[index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined),
            label: 'Cart',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_box_outlined),
            label: 'Request',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

class BrowseHome extends ConsumerWidget {
  const BrowseHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final city = ref.watch(selectedCityProvider);
    final zone = ref.watch(selectedZoneProvider);
    final categories = ref.watch(categoriesProvider);
    final shops = ref.watch(shopsProvider);
    final cartCount = ref
        .watch(cartProvider)
        .fold<int>(0, (sum, item) => sum + item.quantity);

    return Scaffold(
      appBar: RedKsAppBar(
        title: 'RedKS',
        actions: [
          IconButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProductsScreen()),
            ),
            icon: const Icon(Icons.search),
          ),
          Badge(
            label: Text('$cartCount'),
            isLabelVisible: cartCount > 0,
            child: IconButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const CartScreen()),
              ),
              icon: const Icon(Icons.shopping_cart_outlined),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(shopsProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Daily needs from nearby shops',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Groceries, medicines, essentials and custom requests delivered locally.',
                    style: TextStyle(color: Colors.white70),
                  ),
                  const SizedBox(height: 14),
                  InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LocationScreen()),
                    ),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.location_on_outlined),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              city == null
                                  ? 'Select your city and zone'
                                  : '${city.name}${zone == null ? '' : ' / ${zone.name}'}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          const Icon(Icons.chevron_right),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8E1),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFFFECB3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.flash_on, color: AppTheme.yellow),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Request any item your nearby shops can source.',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Categories',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            categories.when(
              data: (items) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: items.map((category) {
                  return CategoryChip(
                    category: category,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ProductsScreen(category: category),
                      ),
                    ),
                  );
                }).toList(),
              ),
              loading: () => const SizedBox(height: 80, child: LoadingView()),
              error: (error, _) => ErrorView(error.toString()),
            ),
            const SizedBox(height: 20),
            const Text(
              'Nearby shops',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            shops.when(
              data: (items) => items.isEmpty
                  ? const SizedBox(
                      height: 160,
                      child: EmptyView('No shops found nearby.'),
                    )
                  : Column(
                      children: items.map((shop) {
                        return ShopCard(
                          shop: shop,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ShopDetailScreen(shop: shop),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
              loading: () => const SizedBox(height: 180, child: LoadingView()),
              error: (error, _) => ErrorView(
                error.toString(),
                onRetry: () => ref.invalidate(shopsProvider),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
