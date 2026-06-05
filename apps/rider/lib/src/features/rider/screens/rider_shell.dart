import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/widgets/widgets.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/partner_repository.dart';
import '../../auth/auth_controller.dart';
import '../location_tracking_service.dart';

class RiderShell extends ConsumerStatefulWidget {
  const RiderShell({super.key});

  @override
  ConsumerState<RiderShell> createState() => _RiderShellState();
}

class _RiderShellState extends ConsumerState<RiderShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(
      () => ref.read(locationTrackingServiceProvider).start(),
    );
  }

  @override
  void dispose() {
    ref.read(locationTrackingServiceProvider).stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = const [
      RiderDashboardScreen(),
      RiderRegistrationScreen(),
      RiderDocumentsScreen(),
      RiderOrdersScreen(),
      RiderEarningsScreen(),
      RiderProfileScreen(),
    ];
    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.badge_outlined),
            label: 'Register',
          ),
          NavigationDestination(
            icon: Icon(Icons.upload_file_outlined),
            label: 'Docs',
          ),
          NavigationDestination(
            icon: Icon(Icons.list_alt_outlined),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.payments_outlined),
            label: 'Earnings',
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

class RiderDashboardScreen extends ConsumerStatefulWidget {
  const RiderDashboardScreen({super.key});

  @override
  ConsumerState<RiderDashboardScreen> createState() =>
      _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends ConsumerState<RiderDashboardScreen> {
  late Future<RiderProfileModel?> _profileFuture;
  bool _availabilityLoading = false;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _profileFuture = _loadProfile();
  }

  Future<RiderProfileModel?> _loadProfile() async {
    try {
      return await ref.read(partnerRepositoryProvider).myRiderProfile();
    } catch (_) {
      return null;
    }
  }

  Future<void> _setAvailability(String status) async {
    setState(() => _availabilityLoading = true);
    try {
      await ref.read(partnerRepositoryProvider).updateAvailability(status);
      if (mounted) setState(_reload);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(apiClientProvider).message(error))),
        );
      }
    } finally {
      if (mounted) setState(() => _availabilityLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Rider Dashboard'),
      body: FutureBuilder<RiderProfileModel?>(
        future: _profileFuture,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingView();
          }
          final profile = snap.data;
          if (profile == null) {
            return const _RegistrationPrompt();
          }
          final approved = profile.status == 'APPROVED';
          final online = profile.availabilityStatus == 'AVAILABLE';
          return RefreshIndicator(
            onRefresh: () async => setState(_reload),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _HeroStatus(profile: profile),
                const SizedBox(height: 12),
                MetricCard(
                  label: 'Approval status',
                  value: profile.status.replaceAll('_', ' '),
                  icon: Icons.verified_user_outlined,
                ),
                MetricCard(
                  label: 'Availability',
                  value: profile.availabilityStatus.replaceAll('_', ' '),
                  icon: Icons.toggle_on_outlined,
                ),
                MetricCard(
                  label: 'Service zone',
                  value:
                      '${profile.city?.name ?? '-'} / ${profile.zone?.name ?? '-'}',
                  icon: Icons.location_on_outlined,
                ),
                const MetricCard(
                  label: 'Live tracking',
                  value: 'Auto while assigned',
                  icon: Icons.my_location_outlined,
                ),
                const SizedBox(height: 8),
                PrimaryButton(
                  label: online ? 'Go Offline' : 'Go Online',
                  loading: _availabilityLoading,
                  onPressed: approved
                      ? () => _setAvailability(online ? 'OFFLINE' : 'AVAILABLE')
                      : null,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class RiderRegistrationScreen extends ConsumerStatefulWidget {
  const RiderRegistrationScreen({super.key});

  @override
  ConsumerState<RiderRegistrationScreen> createState() =>
      _RiderRegistrationScreenState();
}

class _RiderRegistrationScreenState
    extends ConsumerState<RiderRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _vehicleType = TextEditingController(text: 'Bike');
  final _vehicleNumber = TextEditingController();
  final _upi = TextEditingController();
  final _bank = TextEditingController();
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _cityId;
  String? _zoneId;
  List<CityModel> _cities = [];
  List<ZoneModel> _zones = [];

  @override
  void initState() {
    super.initState();
    _loadMeta();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _vehicleType.dispose();
    _vehicleNumber.dispose();
    _upi.dispose();
    _bank.dispose();
    _emergencyName.dispose();
    _emergencyPhone.dispose();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    final repo = ref.read(partnerRepositoryProvider);
    final cities = await repo.cities();
    if (mounted) setState(() => _cities = cities);
  }

  Future<void> _loadZones(String cityId) async {
    final zones = await ref.read(partnerRepositoryProvider).zones(cityId);
    if (mounted) {
      setState(() {
        _cityId = cityId;
        _zoneId = null;
        _zones = zones;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref
          .read(partnerRepositoryProvider)
          .registerRider(
            {
              'fullName': _name.text.trim(),
              'phone': _phone.text.trim(),
              'email': _email.text.trim().isEmpty ? null : _email.text.trim(),
              'cityId': _cityId,
              'zoneId': _zoneId,
              'vehicleType': _vehicleType.text.trim(),
              'vehicleNumber': _vehicleNumber.text.trim(),
              'upiId': _upi.text.trim().isEmpty ? null : _upi.text.trim(),
              'bankAccount': _bank.text.trim().isEmpty
                  ? null
                  : _bank.text.trim(),
              'emergencyName': _emergencyName.text.trim(),
              'emergencyPhone': _emergencyPhone.text.trim(),
            }..removeWhere((key, value) => value == null || value == ''),
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Rider profile submitted for review')),
        );
      }
    } catch (error) {
      setState(() => _error = ref.read(apiClientProvider).message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Rider Registration'),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const _SectionIntro(
              title: 'Become a RedKS delivery partner',
              subtitle:
                  'Complete personal, vehicle, bank and emergency details for admin verification.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              decoration: const InputDecoration(labelText: 'Phone'),
              keyboardType: TextInputType.phone,
              validator: _phoneValidator,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email optional'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _cityId,
              decoration: const InputDecoration(labelText: 'City'),
              items: _cities
                  .map(
                    (city) => DropdownMenuItem(
                      value: city.id,
                      child: Text(city.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                if (value != null) _loadZones(value);
              },
              validator: (value) => value == null ? 'Select city.' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _zoneId,
              decoration: const InputDecoration(labelText: 'Zone'),
              items: _zones
                  .map(
                    (zone) => DropdownMenuItem(
                      value: zone.id,
                      child: Text(zone.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _zoneId = value),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _vehicleType,
              decoration: const InputDecoration(labelText: 'Vehicle type'),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _vehicleNumber,
              decoration: const InputDecoration(labelText: 'Vehicle number'),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _upi,
              decoration: const InputDecoration(labelText: 'UPI ID optional'),
              validator: _optionalUpi,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _bank,
              decoration: const InputDecoration(
                labelText: 'Bank account placeholder',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emergencyName,
              decoration: const InputDecoration(
                labelText: 'Emergency contact name',
              ),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _emergencyPhone,
              decoration: const InputDecoration(
                labelText: 'Emergency contact phone',
              ),
              keyboardType: TextInputType.phone,
              validator: _phoneValidator,
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Submit for verification',
              loading: _loading,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

class RiderDocumentsScreen extends ConsumerStatefulWidget {
  const RiderDocumentsScreen({super.key});

  @override
  ConsumerState<RiderDocumentsScreen> createState() =>
      _RiderDocumentsScreenState();
}

class _RiderDocumentsScreenState extends ConsumerState<RiderDocumentsScreen> {
  final _url = TextEditingController();
  String _type = 'AADHAAR';
  late Future<List<RiderDocumentModel>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = ref.read(partnerRepositoryProvider).riderDocuments();
  }

  Future<void> _add() async {
    if (_url.text.trim().isEmpty) return;
    await ref.read(partnerRepositoryProvider).createRiderDocument({
      'type': _type,
      'fileUrl': _url.text.trim(),
    });
    _url.clear();
    if (mounted) setState(_reload);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Documents'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _SectionIntro(
            title: 'Upload verification documents',
            subtitle:
                'Photo upload API is ready. Paste local upload URLs here until the in-app file picker is enabled.',
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Document type'),
            items:
                const [
                      'AADHAAR',
                      'PAN',
                      'DRIVING_LICENSE',
                      'VEHICLE_RC',
                      'INSURANCE',
                      'SELFIE',
                      'PROFILE_PHOTO',
                    ]
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.replaceAll('_', ' ')),
                      ),
                    )
                    .toList(),
            onChanged: (value) => setState(() => _type = value ?? 'AADHAAR'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _url,
            decoration: const InputDecoration(labelText: 'Uploaded file URL'),
          ),
          const SizedBox(height: 12),
          PrimaryButton(label: 'Add document', onPressed: _add),
          const SizedBox(height: 18),
          FutureBuilder<List<RiderDocumentModel>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const SizedBox(height: 120, child: LoadingView());
              }
              final docs = snap.data ?? const <RiderDocumentModel>[];
              if (docs.isEmpty) {
                return const EmptyView('No rider documents uploaded yet.');
              }
              return Column(
                children: docs
                    .map(
                      (doc) => Card(
                        child: ListTile(
                          title: Text(doc.type.replaceAll('_', ' ')),
                          subtitle: Text(doc.fileUrl),
                          trailing: StatusBadge(doc.status),
                        ),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}

class RiderOrdersScreen extends ConsumerStatefulWidget {
  const RiderOrdersScreen({super.key});

  @override
  ConsumerState<RiderOrdersScreen> createState() => _RiderOrdersScreenState();
}

class _RiderOrdersScreenState extends ConsumerState<RiderOrdersScreen> {
  late Future<List<OrderModel>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = ref.read(partnerRepositoryProvider).availableOrders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Orders'),
      body: FutureBuilder<List<OrderModel>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const LoadingView();
          }
          final orders = snap.data ?? const <OrderModel>[];
          if (orders.isEmpty) {
            return const EmptyView('No available orders in your zone.');
          }
          return RefreshIndicator(
            onRefresh: () async => setState(_reload),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (context, index) => Card(
                child: ListTile(
                  title: Text(
                    orders[index].orderNumber.isEmpty
                        ? orders[index].id
                        : orders[index].orderNumber,
                  ),
                  subtitle: Text(
                    'Amount Rs ${orders[index].totalAmount.toStringAsFixed(0)}',
                  ),
                  trailing: StatusBadge(orders[index].status),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class RiderEarningsScreen extends StatelessWidget {
  const RiderEarningsScreen({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(
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

class RiderProfileScreen extends ConsumerWidget {
  const RiderProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).valueOrNull;
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Profile'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.person)),
              title: Text(user?.name ?? 'RedKS Rider'),
              subtitle: Text('+91 ${user?.phone ?? ''}'),
            ),
          ),
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

class _RegistrationPrompt extends StatelessWidget {
  const _RegistrationPrompt();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(16),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        EmptyView(
          'Complete rider registration to start taking RedKS deliveries.',
        ),
      ],
    ),
  );
}

class _HeroStatus extends StatelessWidget {
  const _HeroStatus({required this.profile});
  final RiderProfileModel profile;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  profile.fullName ?? 'Rider',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  profile.reviewNotes ??
                      profile.rejectionReason ??
                      'Keep your profile and documents updated.',
                ),
              ],
            ),
          ),
          StatusBadge(profile.status),
        ],
      ),
    ),
  );
}

class _SectionIntro extends StatelessWidget {
  const _SectionIntro({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(18),
    decoration: BoxDecoration(
      color: const Color(0xFF111827),
      borderRadius: BorderRadius.circular(22),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 6),
        Text(subtitle, style: const TextStyle(color: Colors.white70)),
      ],
    ),
  );
}

String? _required(String? value) =>
    (value ?? '').trim().isEmpty ? 'Required.' : null;
String? _phoneValidator(String? value) {
  final text = (value ?? '').trim();
  return RegExp(r'^[6-9]\d{9}$').hasMatch(text)
      ? null
      : 'Enter a valid Indian mobile number.';
}

String? _optionalUpi(String? value) {
  final text = (value ?? '').trim();
  if (text.isEmpty) return null;
  return RegExp(r'^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$').hasMatch(text)
      ? null
      : 'Enter a valid UPI ID.';
}
