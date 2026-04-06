/**
 * One-time script to reset parking spaces that are stuck as OCCUPIED
 * despite having no active (CONFIRMED or ACTIVE) reservation.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register scripts/fix-stuck-spaces.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find spaces that are OCCUPIED but have no CONFIRMED or ACTIVE reservation
  const stuckSpaces = await prisma.parkingSpace.findMany({
    where: {
      status: 'OCCUPIED',
      reservations: {
        none: {
          status: { in: ['CONFIRMED', 'ACTIVE'] },
        },
      },
    },
    select: {
      id: true,
      slotNumber: true,
      parkingLocationId: true,
      parkingLocation: { select: { title: true } },
    },
  });

  if (stuckSpaces.length === 0) {
    console.log('✅ No stuck spaces found. Database is clean.');
    return;
  }

  console.log(`Found ${stuckSpaces.length} stuck space(s):`);
  for (const space of stuckSpaces) {
    console.log(`  - Slot #${space.slotNumber} at "${space.parkingLocation.title}" (${space.id})`);
  }

  // Reset all stuck spaces to AVAILABLE in one transaction
  await prisma.$transaction(async (tx) => {
    for (const space of stuckSpaces) {
      await tx.parkingSpace.update({
        where: { id: space.id },
        data: { status: 'AVAILABLE' },
      });

      // Recalculate availableSlots for the location
      const availableCount = await tx.parkingSpace.count({
        where: {
          parkingLocationId: space.parkingLocationId,
          status: 'AVAILABLE',
          isActive: true,
        },
      });

      await tx.parkingLocation.update({
        where: { id: space.parkingLocationId },
        data: { availableSlots: availableCount },
      });
    }
  });

  console.log(`✅ Reset ${stuckSpaces.length} stuck space(s) to AVAILABLE and updated slot counts.`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
