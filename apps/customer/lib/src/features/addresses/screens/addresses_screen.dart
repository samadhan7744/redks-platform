import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../data/repositories/redks_repository.dart';
import '../../cart/screens/checkout_screen.dart';
import '../../location/location_controller.dart';

class AddressesScreen extends ConsumerStatefulWidget {
  const AddressesScreen({super.key});

  @override
  ConsumerState<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends ConsumerState<AddressesScreen> {
  final line1 = TextEditingController();
  final pincode = TextEditingController();
  final landmark = TextEditingController();
  bool loading = false;

  @override
  void dispose() {
    line1.dispose();
    pincode.dispose();
    landmark.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final addresses = ref.watch(addressesProvider);
    final city = ref.watch(selectedCityProvider);
    final zone = ref.watch(selectedZoneProvider);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Addresses'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          addresses.when(
            data: (items) => Column(
              children: items
                  .map(
                    (address) => Card(
                      child: ListTile(
                        title: Text(address.line1),
                        subtitle: Text(
                          '${address.city?.name ?? ''} ${address.pincode}',
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
            loading: () => const SizedBox(height: 100, child: LoadingView()),
            error: (error, _) => ErrorView(error.toString()),
          ),
          const SizedBox(height: 16),
          const Text(
            'Add address',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: line1,
            decoration: const InputDecoration(labelText: 'Address line'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: landmark,
            decoration: const InputDecoration(labelText: 'Landmark'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: pincode,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Pincode'),
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: city == null ? 'Select city first' : 'Save address',
            loading: loading,
            onPressed: city == null
                ? null
                : () async {
                    setState(() => loading = true);
                    await ref
                        .read(redKsRepositoryProvider)
                        .createAddress(
                          line1: line1.text,
                          pincode: pincode.text,
                          landmark: landmark.text,
                          cityId: city.id,
                          zoneId: zone?.id,
                        );
                    ref.invalidate(addressesProvider);
                    line1.clear();
                    pincode.clear();
                    landmark.clear();
                    setState(() => loading = false);
                  },
          ),
        ],
      ),
    );
  }
}
