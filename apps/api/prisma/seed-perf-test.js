/**
 * Performance test seeder — creates 55 approved parking locations under one host.
 * To run:  node prisma/seed-perf-test.js <hostUserId>
 * To delete: node prisma/seed-perf-test.js <hostUserId> --delete
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BASE_LAT = 14.5995;
const BASE_LNG = 120.9842;

function randomOffset(range) {
  return (Math.random() - 0.5) * range;
}

async function seed(hostUserId) {
  const host = await prisma.host.findUnique({ where: { userId: hostUserId } });
  if (!host) {
    console.error(`No Host record found for userId: ${hostUserId}`);
    return;
  }

  console.log(`Seeding 55 locations for host ${host.id}...`);

  for (let i = 1; i <= 55; i++) {
    const lat = BASE_LAT + randomOffset(0.18);
    const lng = BASE_LNG + randomOffset(0.18);

    const location = await prisma.parkingLocation.create({
      data: {
        hostId: host.id,
        title: `[PERF-TEST] Parking Lot ${i}`,
        description: 'Performance test location — safe to delete.',
        address: `Test Street ${i}, Metro Manila`,
        latitude: parseFloat(lat.toFixed(7)),
        longitude: parseFloat(lng.toFixed(7)),
        basePricePerHour: 50 + (i % 5) * 10,
        status: 'APPROVED',
        totalSlots: 5,
        availableSlots: 5,
        is24Hours: true,
        acceptedVehicles: ['CAR', 'MOTORCYCLE'],
      },
    });

    await prisma.parkingSpace.createMany({
      data: [
        { parkingLocationId: location.id, slotNumber: 1, name: 'Slot A', status: 'AVAILABLE', isActive: true },
        { parkingLocationId: location.id, slotNumber: 2, name: 'Slot B', status: 'AVAILABLE', isActive: true },
      ],
    });

    console.log(`  Created ${i}/55`);
  }

  console.log('Done! 55 [PERF-TEST] locations created.');
}

async function deletePerfTestLocations(hostUserId) {
  const host = await prisma.host.findUnique({ where: { userId: hostUserId } });
  if (!host) {
    console.error(`No Host record found for userId: ${hostUserId}`);
    return;
  }

  const { count } = await prisma.parkingLocation.deleteMany({
    where: {
      hostId: host.id,
      title: { startsWith: '[PERF-TEST]' },
    },
  });

  console.log(`Deleted ${count} [PERF-TEST] locations.`);
}

async function main() {
  const hostUserId = process.argv[2];
  const shouldDelete = process.argv[3] === '--delete';

  if (!hostUserId) {
    console.error('Usage: node prisma/seed-perf-test.js <hostUserId> [--delete]');
    return;
  }

  if (shouldDelete) {
    await deletePerfTestLocations(hostUserId);
  } else {
    await seed(hostUserId);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
