import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/async_state_view.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/redks_app_bar.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/redks_repository.dart';
import '../../location/location_controller.dart';

final itemRequestsProvider = FutureProvider.autoDispose<List<ItemRequestModel>>(
  (ref) {
    return ref.watch(redKsRepositoryProvider).itemRequests();
  },
);

class ItemRequestsScreen extends ConsumerStatefulWidget {
  const ItemRequestsScreen({super.key});

  @override
  ConsumerState<ItemRequestsScreen> createState() => _ItemRequestsScreenState();
}

class _ItemRequestsScreenState extends ConsumerState<ItemRequestsScreen> {
  final description = TextEditingController();
  bool loading = false;
  String? error;

  @override
  void dispose() {
    description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final requests = ref.watch(itemRequestsProvider);
    final city = ref.watch(selectedCityProvider);
    final zone = ref.watch(selectedZoneProvider);
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Request Any Item'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'What do you need?',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: description,
                    minLines: 3,
                    maxLines: 5,
                    decoration: const InputDecoration(
                      hintText: 'Example: Need a 2kg chocolate cake by 7 PM',
                    ),
                  ),
                  if (error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  const SizedBox(height: 12),
                  PrimaryButton(
                    label: city == null
                        ? 'Select city first'
                        : 'Submit request',
                    loading: loading,
                    onPressed: city == null
                        ? null
                        : () async {
                            if (description.text.trim().length < 5) {
                              setState(
                                () => error = 'Describe the item you need.',
                              );
                              return;
                            }
                            setState(() {
                              loading = true;
                              error = null;
                            });
                            try {
                              await ref
                                  .read(redKsRepositoryProvider)
                                  .createItemRequest(
                                    cityId: city.id,
                                    zoneId: zone?.id,
                                    description: description.text.trim(),
                                  );
                              description.clear();
                              ref.invalidate(itemRequestsProvider);
                            } catch (e) {
                              setState(() => error = e.toString());
                            } finally {
                              setState(() => loading = false);
                            }
                          },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'My requests',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          requests.when(
            data: (items) => items.isEmpty
                ? const SizedBox(
                    height: 160,
                    child: EmptyView('No requests yet.'),
                  )
                : Column(
                    children: items.map((request) {
                      final acceptedQuote = request.quotes
                          .where((quote) => quote.status == 'SENT')
                          .firstOrNull;
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                request.description,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              StatusBadge(request.status),
                              if (request.quotedAmount != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                    'Quote: ₹${request.quotedAmount!.toStringAsFixed(0)}',
                                  ),
                                ),
                              if (acceptedQuote != null)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton(
                                    onPressed: () async {
                                      await ref
                                          .read(redKsRepositoryProvider)
                                          .acceptQuote(acceptedQuote.id);
                                      ref.invalidate(itemRequestsProvider);
                                    },
                                    child: Text(
                                      'Accept quote ₹${acceptedQuote.amount.toStringAsFixed(0)}',
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
            loading: () => const SizedBox(height: 160, child: LoadingView()),
            error: (error, _) => ErrorView(error.toString()),
          ),
        ],
      ),
    );
  }
}
