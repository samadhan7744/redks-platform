import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopStatus, UserRole } from '@prisma/client';
import { AddressesService } from '../src/modules/addresses/addresses.service';
import { MapsService } from '../src/modules/maps/maps.service';
import { ShopsService } from '../src/modules/shops/shops.service';

function redisMock(cached?: unknown) {
  const calls: string[] = [];
  return {
    calls,
    getJson: async (key: string) => {
      calls.push(`get:${key}`);
      return cached ?? null;
    },
    setJson: async (key: string, value: unknown, ttl: number) => {
      calls.push(`set:${key}:${ttl}:${Array.isArray(value) ? value.length : 0}`);
    },
  };
}

async function testAddressOwnership() {
  const prisma = {
    address: {
      findUnique: async () => ({ id: 'addr_1', userId: 'user_2' }),
    },
  };
  const service = new AddressesService(prisma as never);

  await assert.rejects(
    () => service.remove('user_1', 'addr_1'),
    ForbiddenException,
  );
}

async function testOnlyOneDefaultAddress() {
  const calls: string[] = [];
  const prisma = {
    address: {
      updateMany: async ({ where, data }: { where: unknown; data: unknown }) => {
        calls.push(`updateMany:${JSON.stringify({ where, data })}`);
      },
      create: async ({ data }: { data: unknown }) => {
        calls.push(`create:${JSON.stringify(data)}`);
        return { id: 'addr_1', ...(data as object) };
      },
    },
    $transaction: async (callback: (tx: unknown) => unknown) => callback(prisma),
  };
  const service = new AddressesService(prisma as never);

  await service.create('user_1', {
    addressLine1: 'Flat 1',
    cityId: 'city_1',
    pincode: '560001',
    latitude: 12.97,
    longitude: 77.59,
    isDefault: true,
  });

  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes('"isDefault":false'));
}

async function testDefaultAddressRequiresLatLng() {
  const service = new AddressesService({} as never);

  await assert.rejects(
    () =>
      service.create('user_1', {
        addressLine1: 'Flat 1',
        cityId: 'city_1',
        pincode: '560001',
        isDefault: true,
      }),
    BadRequestException,
  );
}

async function testCannotDeleteDefaultAddressUsedByActiveOrder() {
  const prisma = {
    address: {
      findUnique: async () => ({ id: 'addr_1', userId: 'user_1', isDefault: true }),
      delete: async () => undefined,
    },
    order: {
      count: async () => 1,
    },
  };
  const service = new AddressesService(prisma as never);

  await assert.rejects(
    () => service.remove('user_1', 'addr_1'),
    BadRequestException,
  );
}

async function testNearbyShopDistanceSortingAndRadiusFiltering() {
  const maps = new MapsService({ get: () => undefined } as never);
  const cache = redisMock();
  const prisma = {
    shop: {
      findMany: async () => [
        shop('far', 13.2, 77.7, 3),
        shop('near', 12.972, 77.595, 3),
        shop('outside_service', 12.98, 77.6, 0.1),
      ],
    },
  };
  const service = new ShopsService(prisma as never, maps, cache as never);

  const response = await service.findNearby({
    lat: 12.9716,
    lng: 77.5946,
    radiusKm: 5,
  });

  assert.deepEqual(
    response.data.map((item) => item.shop.id),
    ['near'],
  );
  assert.ok(response.data[0].distanceKm < 1);
}

async function testNearbyCacheMissThenSet() {
  const maps = new MapsService({ get: () => undefined } as never);
  const cache = redisMock();
  const prisma = {
    shop: {
      findMany: async () => [shop('near', 12.972, 77.595, 3)],
    },
  };
  const service = new ShopsService(prisma as never, maps, cache as never);

  await service.findNearby({ lat: 12.97161, lng: 77.59461 });

  assert.ok(cache.calls[0].startsWith('get:shops:nearby:12.972:77.595:5.0'));
  assert.ok(cache.calls[1].includes(':60:1'));
}

async function testNearbyCacheHitSkipsDatabase() {
  const maps = new MapsService({ get: () => undefined } as never);
  const cache = redisMock([{ shop: { id: 'cached' }, distanceKm: 0.1 }]);
  const prisma = {
    shop: {
      findMany: async () => {
        throw new Error('db should not be called');
      },
    },
  };
  const service = new ShopsService(prisma as never, maps, cache as never);

  const response = await service.findNearby({ lat: 12.9716, lng: 77.5946 });

  assert.equal(response.data[0].shop.id, 'cached');
}

async function testNearbyRadiusCap() {
  const service = new ShopsService({} as never, {} as never, redisMock() as never);

  await assert.rejects(
    () => service.findNearby({ lat: 12.9, lng: 77.5, radiusKm: 21 }),
    BadRequestException,
  );
  await assert.rejects(
    () => service.findNearby({ lat: 12.9, lng: 77.5, radiusKm: 0 }),
    BadRequestException,
  );
}

async function testInvalidLatLngRejected() {
  const service = new ShopsService({} as never, {} as never, redisMock() as never);

  await assert.rejects(
    () => service.findNearby({ lat: 120, lng: 77.5, radiusKm: 5 }),
    BadRequestException,
  );
}

async function testMissingLatLngValidation() {
  const service = new ShopsService({} as never, {} as never, redisMock() as never);

  await assert.rejects(
    () =>
      service.create('owner_1', {
        ownerName: 'Ravi',
        ownerPhone: '9876543210',
        shopName: 'Ravi Store',
        categoryId: 'cat_1',
        addressLine1: 'Main Road',
        cityId: 'city_1',
        zoneId: 'zone_1',
        pincode: '560001',
        upiId: 'ravi@upi',
      }),
    BadRequestException,
  );
}

async function testShopOwnerCannotUpdateAnotherShopLocation() {
  const prisma = {
    shop: {
      findFirst: async () => null,
    },
  };
  const service = new ShopsService(prisma as never, {} as never, redisMock() as never);

  await assert.rejects(
    () =>
      service.updateLocation(
        { sub: 'owner_1', phone: '9999999999', roles: [UserRole.SHOP_OWNER] },
        'shop_2',
        { latitude: 12.9, longitude: 77.5, serviceRadiusKm: 5 },
      ),
    ForbiddenException,
  );
}

async function testServiceRadiusMaxCap() {
  const service = new ShopsService({} as never, {} as never, redisMock() as never);

  await assert.rejects(
    () =>
      service.updateLocation(
        { sub: 'admin_1', phone: '9999999999', roles: [UserRole.ADMIN] },
        'shop_1',
        { latitude: 12.9, longitude: 77.5, serviceRadiusKm: 21 },
      ),
    BadRequestException,
  );
}

async function testNoGoogleApiKeyFallback() {
  const maps = new MapsService({
    get: (_key: string) => undefined,
  } as ConfigService);

  assert.equal(await maps.geocodeAddress('Bengaluru'), null);
  assert.equal(await maps.reverseGeocode(12.9716, 77.5946), null);
  assert.ok(maps.distanceKm(12.9716, 77.5946, 12.972, 77.595) < 1);
}

async function testGoogleMapsErrorFallback() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('timeout');
  };
  try {
    const maps = new MapsService({
      get: (key: string, fallback?: unknown) =>
        key === 'GOOGLE_MAPS_API_KEY' ? 'fake-key' : fallback,
    } as ConfigService);
    assert.equal(await maps.geocodeAddress('Bengaluru'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function shop(
  id: string,
  latitude: number,
  longitude: number,
  serviceRadiusKm: number,
) {
  return {
    id,
    status: ShopStatus.APPROVED,
    latitude,
    longitude,
    serviceRadiusKm,
    deliveryRadiusKm: serviceRadiusKm,
  };
}

void (async () => {
  await testAddressOwnership();
  await testOnlyOneDefaultAddress();
  await testDefaultAddressRequiresLatLng();
  await testCannotDeleteDefaultAddressUsedByActiveOrder();
  await testNearbyShopDistanceSortingAndRadiusFiltering();
  await testNearbyCacheMissThenSet();
  await testNearbyCacheHitSkipsDatabase();
  await testNearbyRadiusCap();
  await testInvalidLatLngRejected();
  await testMissingLatLngValidation();
  await testShopOwnerCannotUpdateAnotherShopLocation();
  await testServiceRadiusMaxCap();
  await testNoGoogleApiKeyFallback();
  await testGoogleMapsErrorFallback();
  console.log('maps address shops tests passed');
})();
