/**
 * Performance test seeder — creates 55 approved parking locations under one host.
 * To run:  npx ts-node prisma/seed-perf-test.ts <hostUserId>
 * To delete all seeded locations: npx ts-node prisma/seed-perf-test.ts <hostUserId> --delete
 *
 * All seeded locations have title starting with "[PERF-TEST]" so they are easy to identify.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Metro Manila area — spread across a ~20km radius so they appear on the map
const BASE_LAT = 14.5995;
const BASE_LNG = 120.9842;

function randomOffset(range: number) {
  return (Math.random() - 0.5) * range;
}

async function seed(hostUserId: string) {
  const host = await prisma.host.findUnique({ where: { userId: hostUserId } });
  if (!host) {
    console.error(`No Host record found for userId: ${hostUserId}`);
    process.exit(1);
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

    // Add 2 parking spaces per location
    await prisma.parkingSpace.createMany({
      data: [
        { parkingLocationId: location.id, slotNumber: 1, name: 'Slot A', status: 'AVAILABLE', isActive: true },
        { parkingLocationId: location.id, slotNumber: 2, name: 'Slot B', status: 'AVAILABLE', isActive: true },
      ],
    });

    process.stdout.write(`\r  Created ${i}/55`);
  }

  console.log('\nDone! 55 [PERF-TEST] locations created.');
}

async function deletePerfTestLocations(hostUserId: string) {
  const host = await prisma.host.findUnique({ where: { userId: hostUserId } });
  if (!host) {
    console.error(`No Host record found for userId: ${hostUserId}`);
    process.exit(1);
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
    console.error('Usage: npx ts-node prisma/seed-perf-test.ts <hostUserId> [--delete]');
    process.exit(1);
  }

  if (shouldDelete) {
    await deletePerfTestLocations(hostUserId);
  } else {
    await seed(hostUserId);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
