import { PrismaClient, Role } from '@prisma/client';

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
    { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', defaultCommissionPercent: 7 },
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
      roles: [Role.ADMIN, Role.SUPER_ADMIN],
      status: 'ACTIVE',
    },
    create: {
      phone: adminPhone,
      email: adminEmail,
      name: 'RedKS Admin',
      roles: [Role.ADMIN, Role.SUPER_ADMIN],
      status: 'ACTIVE',
    },
  });
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
