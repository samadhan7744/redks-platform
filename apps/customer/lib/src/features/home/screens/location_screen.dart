import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../location/location_controller.dart';

class LocationScreen extends ConsumerWidget {
  const LocationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cities = ref.watch(citiesProvider);
    final selectedCity = ref.watch(selectedCityProvider);

    return Scaffold(
      appBar: const RedKsAppBar(title: 'Select location'),
      body: cities.when(
        data: (items) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ...items.map(
              (city) => Card(
                child: ListTile(
                  title: Text(city.name),
                  subtitle: Text(city.state),
                  trailing: selectedCity?.id == city.id
                      ? const Icon(Icons.check_circle)
                      : null,
                  onTap: () {
                    ref.read(selectedCityProvider.notifier).state = city;
                    ref.read(selectedZoneProvider.notifier).state =
                        city.zones.isNotEmpty ? city.zones.first : null;
                  },
                ),
              ),
            ),
            if (selectedCity != null) ...[
              const SizedBox(height: 16),
              const Text(
                'Zones',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              ...selectedCity.zones.map(
                (zone) => Card(
                  child: ListTile(
                    title: Text(zone.name),
                    onTap: () {
                      ref.read(selectedZoneProvider.notifier).state = zone;
                      Navigator.pop(context);
                    },
                  ),
                ),
              ),
            ],
          ],
        ),
        loading: () => const LoadingView(),
        error: (error, _) => ErrorView(error.toString()),
      ),
    );
  }
}
