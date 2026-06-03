import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/models.dart';
import '../../data/repositories/redks_repository.dart';

final citiesProvider = FutureProvider<List<CityModel>>((ref) {
  return ref.watch(redKsRepositoryProvider).cities();
});

final selectedCityProvider = StateProvider<CityModel?>((ref) => null);
final selectedZoneProvider = StateProvider<ZoneModel?>((ref) => null);

final categoriesProvider = FutureProvider<List<CategoryModel>>((ref) {
  return ref.watch(redKsRepositoryProvider).categories();
});
