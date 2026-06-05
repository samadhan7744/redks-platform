import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/widgets/widgets.dart';
import '../../../data/models/models.dart';
import '../../../data/repositories/partner_repository.dart';
import '../../common/mode_selection_screen.dart';

class ShopShell extends StatefulWidget {
  const ShopShell({super.key});

  @override
  State<ShopShell> createState() => _ShopShellState();
}

class _ShopShellState extends State<ShopShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = const [
      ShopDashboardScreen(),
      ProductListScreen(),
      ShopOrdersScreen(),
      ItemRequestsScreen(),
      ProfileScreen(),
    ];
    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Products',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search),
            label: 'Requests',
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

class ShopDashboardScreen extends ConsumerStatefulWidget {
  const ShopDashboardScreen({super.key});

  @override
  ConsumerState<ShopDashboardScreen> createState() =>
      _ShopDashboardScreenState();
}

class _ShopDashboardScreenState extends ConsumerState<ShopDashboardScreen> {
  late Future<ShopModel> _shopFuture;
  late Future<List<OrderModel>> _ordersFuture;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    final repo = ref.read(partnerRepositoryProvider);
    _shopFuture = repo.myShop();
    _ordersFuture = repo.shopOrders();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Shop Dashboard'),
      body: RefreshIndicator(
        onRefresh: () async => setState(_load),
        child: FutureBuilder<ShopModel>(
          future: _shopFuture,
          builder: (context, shopSnap) {
            if (shopSnap.connectionState == ConnectionState.waiting) {
              return const LoadingView();
            }
            if (shopSnap.hasError) return const ShopRegistrationScreen();
            final shop = shopSnap.data!;
            return FutureBuilder<List<OrderModel>>(
              future: _ordersFuture,
              builder: (context, orderSnap) {
                final orders = orderSnap.data ?? const <OrderModel>[];
                final pending = orders
                    .where(
                      (order) =>
                          order.status == 'PLACED' || order.status == 'PENDING',
                    )
                    .length;
                final ready = orders
                    .where((order) => order.status == 'READY_FOR_PICKUP')
                    .length;
                final revenue = orders.fold<double>(
                  0,
                  (sum, order) => sum + order.totalAmount,
                );
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _ShopHeader(
                      shop: shop,
                      onEdit: () => _openShopForm(context, shop),
                    ),
                    const SizedBox(height: 12),
                    MetricCard(
                      label: 'Today orders',
                      value: orders.length.toString(),
                      icon: Icons.shopping_bag,
                    ),
                    MetricCard(
                      label: 'Pending action',
                      value: pending.toString(),
                      icon: Icons.pending_actions,
                    ),
                    MetricCard(
                      label: 'Ready pickup',
                      value: ready.toString(),
                      icon: Icons.delivery_dining,
                    ),
                    MetricCard(
                      label: 'Order value',
                      value: 'Rs ${revenue.toStringAsFixed(0)}',
                      icon: Icons.payments,
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }

  Future<void> _openShopForm(BuildContext context, ShopModel shop) async {
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => ShopFormScreen(existing: shop)),
    );
    if (updated == true && mounted) setState(_load);
  }
}

class ShopRegistrationScreen extends StatelessWidget {
  const ShopRegistrationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Register Shop'),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const EmptyView('Register your shop to start selling on RedKS.'),
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'Create shop profile',
            onPressed: () => Navigator.of(
              context,
            ).push(MaterialPageRoute(builder: (_) => const ShopFormScreen())),
          ),
        ],
      ),
    );
  }
}

class ShopFormScreen extends ConsumerStatefulWidget {
  const ShopFormScreen({super.key, this.existing});

  final ShopModel? existing;

  @override
  ConsumerState<ShopFormScreen> createState() => _ShopFormScreenState();
}

class _ShopFormScreenState extends ConsumerState<ShopFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _ownerName = TextEditingController();
  final _ownerPhone = TextEditingController();
  final _shopName = TextEditingController();
  final _address1 = TextEditingController();
  final _address2 = TextEditingController();
  final _pincode = TextEditingController();
  final _latitude = TextEditingController();
  final _longitude = TextEditingController();
  final _upiId = TextEditingController();
  final _gst = TextEditingController();
  final _fssai = TextEditingController();
  final _pan = TextEditingController();
  final _photoUrl = TextEditingController();
  final _radius = TextEditingController(text: '5');
  final _minOrder = TextEditingController(text: '0');
  final _opening = TextEditingController(text: '09:00');
  final _closing = TextEditingController(text: '21:00');
  final _gstUrl = TextEditingController();
  final _fssaiUrl = TextEditingController();
  final _panUrl = TextEditingController();
  int _step = 0;
  bool _loading = false;
  String? _error;
  String? _cityId;
  String? _zoneId;
  String? _categoryId;
  String _deliveryMode = 'REDKS';
  String _weeklyOff = 'Sunday';
  List<CityModel> _cities = [];
  List<ZoneModel> _zones = [];
  List<CategoryModel> _categories = [];

  @override
  void initState() {
    super.initState();
    _ownerName.text = widget.existing?.ownerName ?? '';
    _ownerPhone.text =
        widget.existing?.ownerPhone ?? widget.existing?.phone ?? '';
    _shopName.text = widget.existing?.name ?? '';
    _latitude.text = widget.existing?.latitude?.toString() ?? '';
    _longitude.text = widget.existing?.longitude?.toString() ?? '';
    _radius.text = widget.existing?.serviceRadiusKm?.toString() ?? '5';
    _pincode.text = '560001';
    _cityId = widget.existing?.city?.id;
    _zoneId = widget.existing?.zone?.id;
    _categoryId = widget.existing?.category?.id;
    _loadMeta();
  }

  @override
  void dispose() {
    _ownerName.dispose();
    _ownerPhone.dispose();
    _shopName.dispose();
    _address1.dispose();
    _address2.dispose();
    _pincode.dispose();
    _latitude.dispose();
    _longitude.dispose();
    _upiId.dispose();
    _gst.dispose();
    _fssai.dispose();
    _pan.dispose();
    _photoUrl.dispose();
    _radius.dispose();
    _minOrder.dispose();
    _opening.dispose();
    _closing.dispose();
    _gstUrl.dispose();
    _fssaiUrl.dispose();
    _panUrl.dispose();
    super.dispose();
  }

  Future<void> _loadMeta() async {
    final repo = ref.read(partnerRepositoryProvider);
    try {
      final cities = await repo.cities();
      final categories = await repo.categories();
      final zones = _cityId == null
          ? <ZoneModel>[]
          : await repo.zones(_cityId!);
      if (mounted) {
        setState(() {
          _cities = cities;
          _categories = categories;
          _zones = zones;
        });
      }
    } catch (_) {}
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

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    final data = {
      'ownerName': _ownerName.text.trim(),
      'ownerPhone': _ownerPhone.text.trim(),
      'shopName': _shopName.text.trim(),
      'name': _shopName.text.trim(),
      'phone': _ownerPhone.text.trim(),
      'addressLine1': _address1.text.trim(),
      'addressLine2': _address2.text.trim(),
      'pincode': _pincode.text.trim(),
      'latitude': double.tryParse(_latitude.text.trim()),
      'longitude': double.tryParse(_longitude.text.trim()),
      'upiId': _upiId.text.trim(),
      'gstNumber': _blankToNull(_gst.text),
      'fssaiNumber': _blankToNull(_fssai.text),
      'panNumber': _blankToNull(_pan.text),
      'shopPhotoUrl': _blankToNull(_photoUrl.text),
      'deliveryMode': _deliveryMode,
      'deliveryRadiusKm': double.tryParse(_radius.text.trim()) ?? 0,
      'serviceRadiusKm': double.tryParse(_radius.text.trim()) ?? 0,
      'minOrderValue': double.tryParse(_minOrder.text.trim()) ?? 0,
      'openingTime': _opening.text.trim(),
      'closingTime': _closing.text.trim(),
      'weeklyOffDay': _weeklyOff,
      if (_categoryId != null) 'categoryId': _categoryId,
      if (_cityId != null) 'cityId': _cityId,
      if (_zoneId != null) 'zoneId': _zoneId,
    }..removeWhere((key, value) => value == null || value == '');
    try {
      final repo = ref.read(partnerRepositoryProvider);
      if (widget.existing == null) {
        await repo.registerShop(data);
      } else {
        await repo.updateMyShop(data);
      }
      await _uploadDocumentPlaceholders(repo);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      setState(() {
        _loading = false;
        _error = ref.read(apiClientProvider).message(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final titles = [
      'Basic',
      'Address',
      'Business',
      'Delivery',
      'Documents',
      'Review',
    ];
    return Scaffold(
      appBar: RedKsAppBar(
        title: widget.existing == null
            ? 'Shop Registration'
            : 'My Shop Profile',
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF111827),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.existing == null
                        ? 'Create your RedKS storefront'
                        : 'Update your storefront',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Step ${_step + 1} of 6: ${titles[_step]}',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            LinearProgressIndicator(value: (_step + 1) / 6),
            const SizedBox(height: 16),
            if (_step == 0) _basicStep(),
            if (_step == 1) _addressStep(),
            if (_step == 2) _businessStep(),
            if (_step == 3) _deliveryStep(),
            if (_step == 4) _documentsStep(),
            if (_step == 5) _reviewStep(),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 20),
            Row(
              children: [
                if (_step > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading
                          ? null
                          : () => setState(() => _step--),
                      child: const Text('Back'),
                    ),
                  ),
                if (_step > 0) const SizedBox(width: 12),
                Expanded(
                  child: PrimaryButton(
                    label: _step == 5 ? 'Submit for approval' : 'Next',
                    loading: _loading,
                    onPressed: _step == 5
                        ? _save
                        : () {
                            if (_formKey.currentState!.validate()) {
                              setState(() => _step++);
                            }
                          },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _basicStep() => Column(
    children: [
      TextFormField(
        controller: _shopName,
        decoration: const InputDecoration(labelText: 'Shop name'),
        validator: _required,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _ownerName,
        decoration: const InputDecoration(labelText: 'Owner name'),
        validator: _required,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _ownerPhone,
        decoration: const InputDecoration(labelText: 'Owner phone'),
        keyboardType: TextInputType.phone,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(10),
        ],
        validator: _phoneValidator,
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(
        initialValue: _categoryId,
        decoration: const InputDecoration(labelText: 'Primary category'),
        items: _categories
            .map(
              (category) => DropdownMenuItem(
                value: category.id,
                child: Text(category.name),
              ),
            )
            .toList(),
        onChanged: (value) => setState(() => _categoryId = value),
        validator: (value) => value == null ? 'Select category.' : null,
      ),
    ],
  );

  Widget _addressStep() => Column(
    children: [
      TextFormField(
        controller: _address1,
        decoration: const InputDecoration(labelText: 'Address line 1'),
        validator: _required,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _address2,
        decoration: const InputDecoration(labelText: 'Address line 2'),
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(
        initialValue: _cityId,
        decoration: const InputDecoration(labelText: 'City'),
        items: _cities
            .map(
              (city) =>
                  DropdownMenuItem(value: city.id, child: Text(city.name)),
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
              (zone) =>
                  DropdownMenuItem(value: zone.id, child: Text(zone.name)),
            )
            .toList(),
        onChanged: (value) => setState(() => _zoneId = value),
        validator: (value) => value == null ? 'Select zone.' : null,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _pincode,
        decoration: const InputDecoration(labelText: 'Pincode'),
        keyboardType: TextInputType.number,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(6),
        ],
        validator: _pincodeValidator,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _latitude,
        decoration: const InputDecoration(
          labelText: 'Latitude',
          helperText: 'Use Google Maps dropped pin coordinates for now.',
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        validator: _number,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _longitude,
        decoration: const InputDecoration(
          labelText: 'Longitude',
          helperText: 'Map picker integration can replace this field later.',
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        validator: _number,
      ),
    ],
  );

  Widget _businessStep() => Column(
    children: [
      TextFormField(
        controller: _upiId,
        decoration: const InputDecoration(labelText: 'UPI ID'),
        validator: _upiValidator,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _gst,
        decoration: const InputDecoration(labelText: 'GST number optional'),
        textCapitalization: TextCapitalization.characters,
        validator: _optionalGstValidator,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _fssai,
        decoration: const InputDecoration(labelText: 'FSSAI number optional'),
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _pan,
        decoration: const InputDecoration(labelText: 'PAN number optional'),
        textCapitalization: TextCapitalization.characters,
        validator: _optionalPanValidator,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _photoUrl,
        decoration: const InputDecoration(
          labelText: 'Shop photo URL placeholder',
        ),
      ),
    ],
  );

  Widget _deliveryStep() => Column(
    children: [
      DropdownButtonFormField<String>(
        initialValue: _deliveryMode,
        decoration: const InputDecoration(labelText: 'Delivery mode'),
        items: const [
          DropdownMenuItem(value: 'REDKS', child: Text('RedKS delivery')),
          DropdownMenuItem(value: 'SELF', child: Text('Self delivery')),
          DropdownMenuItem(value: 'HYBRID', child: Text('Hybrid')),
        ],
        onChanged: (value) => setState(() => _deliveryMode = value ?? 'REDKS'),
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _radius,
        decoration: const InputDecoration(labelText: 'Delivery radius km'),
        keyboardType: TextInputType.number,
        validator: _number,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _minOrder,
        decoration: const InputDecoration(labelText: 'Minimum order value'),
        keyboardType: TextInputType.number,
        validator: _number,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _opening,
        decoration: const InputDecoration(
          labelText: 'Opening time, e.g. 09:00',
        ),
        validator: _required,
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _closing,
        decoration: const InputDecoration(
          labelText: 'Closing time, e.g. 21:00',
        ),
        validator: _required,
      ),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(
        initialValue: _weeklyOff,
        decoration: const InputDecoration(labelText: 'Weekly off day'),
        items: const [
          'None',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ].map((day) => DropdownMenuItem(value: day, child: Text(day))).toList(),
        onChanged: (value) => setState(() => _weeklyOff = value ?? 'Sunday'),
      ),
    ],
  );

  Widget _documentsStep() => Column(
    children: [
      TextFormField(
        controller: _gstUrl,
        decoration: const InputDecoration(
          labelText: 'GST document URL placeholder',
        ),
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _fssaiUrl,
        decoration: const InputDecoration(
          labelText: 'FSSAI document URL placeholder',
        ),
      ),
      const SizedBox(height: 12),
      TextFormField(
        controller: _panUrl,
        decoration: const InputDecoration(
          labelText: 'PAN document URL placeholder',
        ),
      ),
      const SizedBox(height: 8),
      const Text(
        'File upload will use Cloudflare R2/S3 in a later phase. Paste temporary document URLs for now.',
      ),
    ],
  );

  Widget _reviewStep() => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _shopName.text,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text('Owner: ${_ownerName.text} / ${_ownerPhone.text}'),
          Text('Address: ${_address1.text}, ${_pincode.text}'),
          Text('Location: ${_latitude.text}, ${_longitude.text}'),
          Text('UPI: ${_upiId.text}'),
          Text('Delivery: $_deliveryMode, ${_radius.text} km'),
          Text(
            'Timings: ${_opening.text} - ${_closing.text}, off: $_weeklyOff',
          ),
        ],
      ),
    ),
  );

  Future<void> _uploadDocumentPlaceholders(PartnerRepository repo) async {
    final docs = {
      'GST': _gstUrl.text.trim(),
      'FSSAI': _fssaiUrl.text.trim(),
      'PAN': _panUrl.text.trim(),
      'SHOP_PHOTO': _photoUrl.text.trim(),
    };
    for (final entry in docs.entries) {
      if (entry.value.isNotEmpty) {
        await repo.createShopDocument({
          'type': entry.key,
          'fileUrl': entry.value,
        });
      }
    }
  }
}

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key});

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  late Future<List<ProductModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(partnerRepositoryProvider).myProducts();
  }

  void _reload() => setState(
    () => _future = ref.read(partnerRepositoryProvider).myProducts(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: RedKsAppBar(
        title: 'Products',
        actions: [
          IconButton(
            onPressed: () async {
              final saved = await Navigator.of(context).push<bool>(
                MaterialPageRoute(builder: (_) => const ProductFormScreen()),
              );
              if (saved == true) _reload();
            },
            icon: const Icon(Icons.add),
            tooltip: 'Add product',
          ),
        ],
      ),
      body: FutureBuilder<List<ProductModel>>(
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
          final products = snap.data ?? const <ProductModel>[];
          if (products.isEmpty) return const EmptyView('No products yet.');
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) =>
                  _ProductTile(product: products[index], onChanged: _reload),
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemCount: products.length,
            ),
          );
        },
      ),
    );
  }
}

class ProductFormScreen extends ConsumerStatefulWidget {
  const ProductFormScreen({super.key, this.product});

  final ProductModel? product;

  @override
  ConsumerState<ProductFormScreen> createState() => _ProductFormScreenState();
}

class _ProductFormScreenState extends ConsumerState<ProductFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _price = TextEditingController();
  final _stock = TextEditingController();
  final _description = TextEditingController();
  List<CategoryModel> _categories = [];
  String? _categoryId;
  String _status = 'ACTIVE';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final product = widget.product;
    _name.text = product?.name ?? '';
    _price.text = product == null ? '' : product.price.toStringAsFixed(0);
    _stock.text = product == null ? '' : product.stock.toString();
    _categoryId = product?.category?.id;
    _status = product?.status.isNotEmpty == true ? product!.status : 'ACTIVE';
    _loadCategories();
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _stock.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    try {
      final categories = await ref.read(partnerRepositoryProvider).categories();
      if (mounted) setState(() => _categories = categories);
    } catch (_) {}
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(partnerRepositoryProvider);
      final data = {
        if (widget.product == null) 'shopId': (await repo.myShop()).id,
        'name': _name.text.trim(),
        'price': double.parse(_price.text.trim()),
        'stock': int.parse(_stock.text.trim()),
        'description': _description.text.trim().isEmpty
            ? _name.text.trim()
            : _description.text.trim(),
        'status': _status,
        if (_categoryId != null) 'categoryId': _categoryId,
      };
      if (widget.product == null) {
        await repo.createProduct(data);
      } else {
        await repo.updateProduct(widget.product!.id, data);
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      setState(() {
        _loading = false;
        _error = ref.read(apiClientProvider).message(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: RedKsAppBar(
        title: widget.product == null ? 'Add Product' : 'Edit Product',
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Product name'),
              validator: _required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _price,
              decoration: const InputDecoration(labelText: 'Price'),
              keyboardType: TextInputType.number,
              validator: _number,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _stock,
              decoration: const InputDecoration(labelText: 'Stock'),
              keyboardType: TextInputType.number,
              validator: _integer,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _categoryId,
              decoration: const InputDecoration(labelText: 'Category'),
              items: _categories
                  .map(
                    (category) => DropdownMenuItem(
                      value: category.id,
                      child: Text(category.name),
                    ),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _categoryId = value),
              validator: (value) => value == null ? 'Select category.' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: const ['ACTIVE', 'INACTIVE']
                  .map(
                    (status) =>
                        DropdownMenuItem(value: status, child: Text(status)),
                  )
                  .toList(),
              onChanged: (value) => setState(() => _status = value ?? 'ACTIVE'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _description,
              decoration: const InputDecoration(labelText: 'Description'),
              minLines: 2,
              maxLines: 3,
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            const SizedBox(height: 20),
            PrimaryButton(
              label: 'Save product',
              loading: _loading,
              onPressed: _save,
            ),
            if (widget.product != null) ...[
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: _loading ? null : _delete,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete product'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _delete() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete product'),
        content: const Text(
          'This will soft delete the product from customer browsing.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirm != true || widget.product == null) return;
    setState(() => _loading = true);
    try {
      await ref
          .read(partnerRepositoryProvider)
          .deleteProduct(widget.product!.id);
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      setState(() {
        _loading = false;
        _error = ref.read(apiClientProvider).message(error);
      });
    }
  }
}

class ShopOrdersScreen extends ConsumerStatefulWidget {
  const ShopOrdersScreen({super.key});

  @override
  ConsumerState<ShopOrdersScreen> createState() => _ShopOrdersScreenState();
}

class _ShopOrdersScreenState extends ConsumerState<ShopOrdersScreen> {
  late Future<List<OrderModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(partnerRepositoryProvider).shopOrders();
  }

  void _reload() => setState(
    () => _future = ref.read(partnerRepositoryProvider).shopOrders(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Shop Orders'),
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
          if (orders.isEmpty) return const EmptyView('No shop orders yet.');
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) => _OrderTile(
                order: orders[index],
                role: OrderRole.shop,
                onChanged: _reload,
              ),
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemCount: orders.length,
            ),
          );
        },
      ),
    );
  }
}

class ItemRequestsScreen extends ConsumerStatefulWidget {
  const ItemRequestsScreen({super.key});

  @override
  ConsumerState<ItemRequestsScreen> createState() => _ItemRequestsScreenState();
}

class _ItemRequestsScreenState extends ConsumerState<ItemRequestsScreen> {
  late Future<List<ItemRequestModel>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(partnerRepositoryProvider).nearbyItemRequests();
  }

  void _reload() => setState(
    () => _future = ref.read(partnerRepositoryProvider).nearbyItemRequests(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const RedKsAppBar(title: 'Nearby Requests'),
      body: FutureBuilder<List<ItemRequestModel>>(
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
          final requests = snap.data ?? const <ItemRequestModel>[];
          if (requests.isEmpty) {
            return const EmptyView('No nearby item requests.');
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) =>
                  _RequestTile(request: requests[index], onChanged: _reload),
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemCount: requests.length,
            ),
          );
        },
      ),
    );
  }
}

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.order, required this.role});

  final OrderModel order;
  final OrderRole role;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _act(
    Future<void> Function(PartnerRepository repo) action,
  ) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await action(ref.read(partnerRepositoryProvider));
      if (mounted) Navigator.of(context).pop(true);
    } catch (error) {
      setState(() {
        _loading = false;
        _error = ref.read(apiClientProvider).message(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.order;
    return Scaffold(
      appBar: RedKsAppBar(
        title:
            'Order ${order.orderNumber.isEmpty ? order.id : order.orderNumber}',
      ),
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
                          'Total Rs ${order.totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      StatusBadge(order.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...order.items.map(
                    (item) => ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(item.name),
                      subtitle: Text('Qty ${item.quantity}'),
                      trailing: Text('Rs ${item.lineTotal.toStringAsFixed(0)}'),
                    ),
                  ),
                  if (order.items.isEmpty)
                    const Text('Item details will appear when available.'),
                ],
              ),
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          const SizedBox(height: 12),
          if (widget.role == OrderRole.shop) ...[
            PrimaryButton(
              label: 'Accept Order',
              loading: _loading,
              onPressed: () => _act((repo) => repo.acceptOrder(order.id)),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _loading
                  ? null
                  : () => _act((repo) => repo.readyOrder(order.id)),
              child: const Text('Mark Ready'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loading
                  ? null
                  : () => _act(
                      (repo) => repo.rejectOrder(order.id, 'Rejected by shop'),
                    ),
              child: const Text('Reject Order'),
            ),
          ],
          if (widget.role == OrderRole.rider) ...[
            PrimaryButton(
              label: 'Accept Delivery',
              loading: _loading,
              onPressed: () => _act((repo) => repo.acceptDelivery(order.id)),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _loading
                  ? null
                  : () => _act((repo) => repo.pickupOrder(order.id)),
              child: const Text('Mark Picked Up'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _loading
                  ? null
                  : () => _act((repo) => repo.deliverOrder(order.id)),
              child: const Text('Mark Delivered'),
            ),
          ],
        ],
      ),
    );
  }
}

enum OrderRole { shop, rider }

class _ShopHeader extends StatelessWidget {
  const _ShopHeader({required this.shop, required this.onEdit});

  final ShopModel shop;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  shop.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              StatusBadge(shop.status),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            [shop.city?.name, shop.zone?.name].whereType<String>().join(' / '),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              StatusBadge(shop.verificationStatus ?? shop.status),
              if (shop.category != null) StatusBadge(shop.category!.name),
            ],
          ),
          if (shop.status == 'PENDING_APPROVAL')
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Pending approval. RedKS admin will review your shop profile and documents.',
              ),
            ),
          if (shop.status == 'REJECTED')
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Rejected: ${shop.rejectionReason ?? 'Please update details and resubmit.'}',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          if (shop.status == 'SUSPENDED')
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Suspended. Contact RedKS support before accepting new orders.',
                style: TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onEdit,
            icon: const Icon(Icons.edit),
            label: const Text('Edit profile'),
          ),
        ],
      ),
    ),
  );
}

class _ProductTile extends ConsumerWidget {
  const _ProductTile({required this.product, required this.onChanged});

  final ProductModel product;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        title: Text(
          product.name,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          '${product.category?.name ?? 'No category'}\nStock ${product.stock}',
        ),
        isThreeLine: true,
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'Rs ${product.price.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            StatusBadge(product.status),
          ],
        ),
        onTap: () async {
          final saved = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => ProductFormScreen(product: product),
            ),
          );
          if (saved == true) onChanged();
        },
        onLongPress: () => _stockDialog(context, ref),
      ),
    );
  }

  Future<void> _stockDialog(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController(text: product.stock.toString());
    final stock = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Stock Update'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Stock'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(context, int.tryParse(controller.text.trim())),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (stock != null) {
      await ref.read(partnerRepositoryProvider).updateStock(product.id, stock);
      onChanged();
    }
  }
}

class _OrderTile extends StatelessWidget {
  const _OrderTile({
    required this.order,
    required this.role,
    required this.onChanged,
  });

  final OrderModel order;
  final OrderRole role;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(
          order.orderNumber.isEmpty ? order.id : order.orderNumber,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text('Rs ${order.totalAmount.toStringAsFixed(0)}'),
        trailing: StatusBadge(order.status),
        onTap: () async {
          final changed = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => OrderDetailScreen(order: order, role: role),
            ),
          );
          if (changed == true) onChanged();
        },
      ),
    );
  }
}

class _RequestTile extends ConsumerWidget {
  const _RequestTile({required this.request, required this.onChanged});

  final ItemRequestModel request;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      child: ListTile(
        title: Text(
          request.description,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          request.quotedAmount == null
              ? 'No quote sent'
              : 'Quoted Rs ${request.quotedAmount!.toStringAsFixed(0)}',
        ),
        trailing: StatusBadge(request.status),
        onTap: () => _quoteDialog(context, ref),
      ),
    );
  }

  Future<void> _quoteDialog(BuildContext context, WidgetRef ref) async {
    final amount = TextEditingController();
    final note = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send Quote'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: note,
              decoration: const InputDecoration(labelText: 'Note'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Send'),
          ),
        ],
      ),
    );
    final value = double.tryParse(amount.text.trim());
    if (result == true && value != null) {
      await ref
          .read(partnerRepositoryProvider)
          .sendQuote(request.id, value, note.text.trim());
      onChanged();
    }
    amount.dispose();
    note.dispose();
  }
}

String? _required(String? value) =>
    (value ?? '').trim().isEmpty ? 'Required.' : null;
String? _number(String? value) =>
    double.tryParse((value ?? '').trim()) == null ? 'Enter a number.' : null;
String? _integer(String? value) =>
    int.tryParse((value ?? '').trim()) == null ? 'Enter a whole number.' : null;
String? _phoneValidator(String? value) {
  final text = (value ?? '').trim();
  return RegExp(r'^[6-9]\d{9}$').hasMatch(text)
      ? null
      : 'Enter a valid Indian mobile number.';
}

String? _pincodeValidator(String? value) {
  final text = (value ?? '').trim();
  return RegExp(r'^\d{6}$').hasMatch(text) ? null : 'Enter a 6 digit pincode.';
}

String? _upiValidator(String? value) {
  final text = (value ?? '').trim();
  return RegExp(r'^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$').hasMatch(text)
      ? null
      : 'Enter a valid UPI ID.';
}

String? _optionalGstValidator(String? value) {
  final text = (value ?? '').trim().toUpperCase();
  if (text.isEmpty) return null;
  return RegExp(
        r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
      ).hasMatch(text)
      ? null
      : 'GST format is invalid.';
}

String? _optionalPanValidator(String? value) {
  final text = (value ?? '').trim().toUpperCase();
  if (text.isEmpty) return null;
  return RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$').hasMatch(text)
      ? null
      : 'PAN format is invalid.';
}

String? _blankToNull(String value) {
  final text = value.trim().toUpperCase();
  return text.isEmpty ? null : text;
}
