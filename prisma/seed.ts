import {
  DeliveryMode,
  ProductStatus,
  RiderAvailabilityStatus,
  RiderStatus,
  ShopStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminPhone = process.env.ADMIN_PHONE ?? '9999999999';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@redks.in';

  const cities = [
    {
      name: 'Bengaluru',
      state: 'Karnataka',
      slug: 'bengaluru',
      zones: ['Indiranagar', 'Koramangala', 'Whitefield'],
    },
    {
      name: 'Delhi',
      state: 'Delhi',
      slug: 'delhi',
      zones: ['Dwarka', 'Rohini', 'Lajpat Nagar'],
    },
    {
      name: 'Mumbai',
      state: 'Maharashtra',
      slug: 'mumbai',
      zones: ['Andheri', 'Bandra', 'Powai'],
    },
  ];

  for (const city of cities) {
    const createdCity = await prisma.city.upsert({
      where: { slug: city.slug },
      update: { name: city.name, state: city.state, isActive: true },
      create: {
        name: city.name,
        state: city.state,
        slug: city.slug,
      },
    });

    for (const zone of city.zones) {
      const slug = zone.toLowerCase().replace(/\s+/g, '-');
      await prisma.zone.upsert({
        where: {
          cityId_slug: {
            cityId: createdCity.id,
            slug,
          },
        },
        update: { name: zone, isActive: true },
        create: {
          cityId: createdCity.id,
          name: zone,
          slug,
        },
      });
    }
  }

  const categories = [
    { name: 'Grocery', slug: 'grocery', defaultCommissionPercent: 8 },
    { name: 'Medicines', slug: 'medicines', defaultCommissionPercent: 10 },
    {
      name: 'Fruits & Vegetables',
      slug: 'fruits-vegetables',
      defaultCommissionPercent: 7,
    },
    { name: 'Bakery', slug: 'bakery', defaultCommissionPercent: 9 },
    { name: 'Stationery', slug: 'stationery', defaultCommissionPercent: 11 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        defaultCommissionPercent: category.defaultCommissionPercent,
        isActive: true,
      },
      create: category,
    });
  }

  await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      email: adminEmail,
      name: 'RedKS Admin',
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      status: 'ACTIVE',
    },
    create: {
      phone: adminPhone,
      email: adminEmail,
      name: 'RedKS Admin',
      roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      status: 'ACTIVE',
    },
  });

  const bengaluru = await prisma.city.findUniqueOrThrow({
    where: { slug: 'bengaluru' },
  });
  const indiranagar = await prisma.zone.findUniqueOrThrow({
    where: { cityId_slug: { cityId: bengaluru.id, slug: 'indiranagar' } },
  });
  const grocery = await prisma.category.findUniqueOrThrow({
    where: { slug: 'grocery' },
  });
  const bakery = await prisma.category.findUniqueOrThrow({
    where: { slug: 'bakery' },
  });

  const customer = await prisma.user.upsert({
    where: { phone: '9000000001' },
    update: {
      name: 'Demo Customer',
      roles: [UserRole.CUSTOMER],
      status: 'ACTIVE',
    },
    create: {
      phone: '9000000001',
      name: 'Demo Customer',
      roles: [UserRole.CUSTOMER],
      status: 'ACTIVE',
    },
  });

  const shopOwner = await prisma.user.upsert({
    where: { phone: '9000000002' },
    update: {
      name: 'Demo Shop Owner',
      roles: [UserRole.CUSTOMER, UserRole.SHOP_OWNER],
      status: 'ACTIVE',
    },
    create: {
      phone: '9000000002',
      name: 'Demo Shop Owner',
      roles: [UserRole.CUSTOMER, UserRole.SHOP_OWNER],
      status: 'ACTIVE',
    },
  });

  const riderUser = await prisma.user.upsert({
    where: { phone: '9000000003' },
    update: {
      name: 'Demo Rider',
      roles: [UserRole.CUSTOMER, UserRole.RIDER],
      status: 'ACTIVE',
    },
    create: {
      phone: '9000000003',
      name: 'Demo Rider',
      roles: [UserRole.CUSTOMER, UserRole.RIDER],
      status: 'ACTIVE',
    },
  });

  const demoShop = await prisma.shop.upsert({
    where: { cityId_slug: { cityId: bengaluru.id, slug: 'redks-demo-kirana' } },
    update: {
      ownerId: shopOwner.id,
      zoneId: indiranagar.id,
      status: ShopStatus.APPROVED,
      deliveryMode: DeliveryMode.REDKS_DELIVERY,
      approvedAt: new Date(),
    },
    create: {
      ownerId: shopOwner.id,
      cityId: bengaluru.id,
      zoneId: indiranagar.id,
      name: 'RedKS Demo Kirana',
      slug: 'redks-demo-kirana',
      description: 'Demo grocery shop for local MVP testing',
      phone: '9000000002',
      addressLine1: '12 RedKS Market Road',
      pincode: '560038',
      status: ShopStatus.APPROVED,
      deliveryMode: DeliveryMode.REDKS_DELIVERY,
      approvedAt: new Date(),
    },
  });

  await prisma.shopCategory.upsert({
    where: {
      shopId_categoryId: { shopId: demoShop.id, categoryId: grocery.id },
    },
    update: {},
    create: { shopId: demoShop.id, categoryId: grocery.id },
  });

  await prisma.shopCategory.upsert({
    where: {
      shopId_categoryId: { shopId: demoShop.id, categoryId: bakery.id },
    },
    update: {},
    create: { shopId: demoShop.id, categoryId: bakery.id },
  });

  const demoProducts = [
    {
      name: 'Amul Taaza Milk 1L',
      slug: 'amul-taaza-milk-1l',
      categoryId: grocery.id,
      price: 68,
      mrp: 70,
      stock: 40,
      unit: 'litre',
    },
    {
      name: 'Fresh Bread Loaf',
      slug: 'fresh-bread-loaf',
      categoryId: bakery.id,
      price: 45,
      mrp: 50,
      stock: 25,
      unit: 'piece',
    },
    {
      name: 'Aashirvaad Atta 5kg',
      slug: 'aashirvaad-atta-5kg',
      categoryId: grocery.id,
      price: 245,
      mrp: 260,
      stock: 18,
      unit: 'pack',
    },
  ];

  for (const product of demoProducts) {
    await prisma.product.upsert({
      where: { shopId_slug: { shopId: demoShop.id, slug: product.slug } },
      update: {
        name: product.name,
        categoryId: product.categoryId,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        unit: product.unit,
        status: ProductStatus.ACTIVE,
      },
      create: {
        shopId: demoShop.id,
        categoryId: product.categoryId,
        name: product.name,
        slug: product.slug,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        unit: product.unit,
        status: ProductStatus.ACTIVE,
      },
    });
  }

  const existingAddress = await prisma.address.findFirst({
    where: { userId: customer.id, line1: '101 Demo Apartments' },
  });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        type: 'HOME',
        line1: '101 Demo Apartments',
        landmark: 'Near RedKS Market',
        cityId: bengaluru.id,
        zoneId: indiranagar.id,
        pincode: '560038',
        isDefault: true,
      },
    });
  }

  await prisma.riderProfile.upsert({
    where: { userId: riderUser.id },
    update: {
      cityId: bengaluru.id,
      zoneId: indiranagar.id,
      status: RiderStatus.APPROVED,
      availabilityStatus: RiderAvailabilityStatus.AVAILABLE,
      vehicleType: 'BIKE',
      vehicleNumber: 'KA01RK0001',
      approvedAt: new Date(),
    },
    create: {
      userId: riderUser.id,
      cityId: bengaluru.id,
      zoneId: indiranagar.id,
      status: RiderStatus.APPROVED,
      availabilityStatus: RiderAvailabilityStatus.AVAILABLE,
      vehicleType: 'BIKE',
      vehicleNumber: 'KA01RK0001',
      approvedAt: new Date(),
    },
  });

  const existingRequest = await prisma.itemRequest.findFirst({
    where: {
      customerId: customer.id,
      description: 'Need a 2kg chocolate cake by 7 PM',
    },
  });
  if (!existingRequest) {
    await prisma.itemRequest.create({
      data: {
        customerId: customer.id,
        cityId: bengaluru.id,
        zoneId: indiranagar.id,
        description: 'Need a 2kg chocolate cake by 7 PM',
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
