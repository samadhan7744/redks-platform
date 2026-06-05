import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../data/models/models.dart';
import '../../data/repositories/partner_repository.dart';

final locationTrackingServiceProvider = Provider<LocationTrackingService>(
  (ref) => LocationTrackingService(ref.watch(partnerRepositoryProvider)),
);

class LocationTrackingService {
  LocationTrackingService(this._repository);

  final PartnerRepository _repository;
  Timer? _timer;
  bool _running = false;

  bool get isRunning => _timer?.isActive ?? false;

  Future<void> start() async {
    if (_timer?.isActive ?? false) return;
    _running = true;
    await _tick();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _tick());
  }

  void stop() {
    _running = false;
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _tick() async {
    if (!_running) return;
    try {
      final activeOrders = await _repository.activeRiderOrders();
      if (!activeOrders.any(_shouldTrackOrder)) return;
      final position = await _currentPosition();
      if (position == null) return;
      await _repository.updateRiderLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed < 0 ? null : position.speed,
        heading: position.heading < 0 ? null : position.heading,
      );
    } catch (_) {
      // Location tracking should not interrupt the rider's active workflow.
    }
  }

  bool _shouldTrackOrder(OrderModel order) =>
      order.status == 'ASSIGNED' ||
      order.status == 'PICKED_UP' ||
      order.status == 'OUT_FOR_DELIVERY';

  Future<Position?> _currentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 8),
      ),
    );
  }
}
