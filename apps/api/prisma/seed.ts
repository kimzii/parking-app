import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({
  path: resolve(__dirname, '../.env'),
});

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.host.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // Create roles
  console.log('👥 Creating roles...');
  const driverRole = await prisma.role.create({
    data: { name: 'DRIVER' },
  });

  const hostRole = await prisma.role.create({
    data: { name: 'HOST' },
  });

  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN' },
  });

  console.log('✅ Created roles: DRIVER, HOST, ADMIN');

  // Create admin user
  console.log('👨‍💼 Creating admin user...');
  await prisma.user.create({
    data: {
      email: 'admin@parkup.com',
      password: await hash('Admin123!', 12),
      firstName: 'Admin',
      lastName: 'User',
      emailVerified: true,
      userRoles: {
        create: {
          roleId: adminRole.id,
          status: 'VERIFIED', // ← Changed from APPROVED
        },
      },
      wallet: { create: {} },
    },
  });

  // Create your personal admin account
  console.log('👩‍💼 Creating your admin account...');
  await prisma.user.create({
    data: {
      email: 'kimzie@giver.com',
      password: await hash('Password123!', 12),
      firstName: 'Kimzie',
      lastName: 'Torres',
      emailVerified: true,
      userRoles: {
        create: {
          roleId: adminRole.id,
          status: 'VERIFIED', // ← Changed from APPROVED
        },
      },
      wallet: { create: {} },
    },
  });

  // Create test driver (verified)
  console.log('🚗 Creating verified driver...');
  await prisma.user.create({
    data: {
      email: 'driver@test.com',
      password: await hash('Driver123!', 12),
      firstName: 'John',
      lastName: 'Driver',
      phoneNumber: '+639123456789',
      emailVerified: true,
      driver: {
        create: {
          licenseNumber: 'D123-45-678901',
          licenseImageUrl: 'https://park-link.s3.ap-southeast-2.amazonaws.com/driver-licenses/8d714381-2d6b-4c52-9996-8030159fecf9.jpeg',
        },
      },
      userRoles: {
        create: {
          roleId: driverRole.id,
          status: 'VERIFIED', // ← Changed from APPROVED
        },
      },
      wallet: { create: {} },
    },
  });

  // Create test host (verified)
  console.log('🏠 Creating verified host...');
  await prisma.user.create({
    data: {
      email: 'host@test.com',
      password: await hash('Host123!', 12),
      firstName: 'Maria',
      lastName: 'Host',
      phoneNumber: '+639987654321',
      emailVerified: true,
      host: {
        create: {},
      },
      userRoles: {
        create: {
          roleId: hostRole.id,
          status: 'VERIFIED', // ← Changed from APPROVED
        },
      },
      wallet: { create: {} },
    },
  });

  // Create multi-role user (Driver verified + Host pending)
  console.log('🔄 Creating multi-role user...');
  await prisma.user.create({
    data: {
      email: 'both@test.com',
      password: await hash('Both123!', 12),
      firstName: 'Alex',
      lastName: 'MultiRole',
      phoneNumber: '+639111222333',
      emailVerified: true,
      driver: {
        create: {
          licenseNumber: 'D987-65-432101',
        },
      },
      host: {
        create: {},
      },
      userRoles: {
        createMany: {
          data: [
            { roleId: driverRole.id, status: 'VERIFIED' }, // ← Changed from APPROVED
            { roleId: hostRole.id, status: 'PENDING' },
          ],
        },
      },
      wallet: { create: {} },
    },
  });

  // Create pending driver
  console.log('⏳ Creating pending driver...');
  await prisma.user.create({
    data: {
      email: 'pending-driver@test.com',
      password: await hash('Pending123!', 12),
      firstName: 'Bob',
      lastName: 'PendingDriver',
      phoneNumber: '+639555444333',
      emailVerified: true,
      driver: {
        create: {
          licenseNumber: 'D555-44-333222',
        },
      },
      userRoles: {
        create: {
          roleId: driverRole.id,
          status: 'PENDING',
        },
      },
      wallet: { create: {} },
    },
  });

  // Create pending host
  console.log('⏳ Creating pending host...');
  await prisma.user.create({
    data: {
      email: 'pending-host@test.com',
      password: await hash('Pending123!', 12),
      firstName: 'Sarah',
      lastName: 'PendingHost',
      phoneNumber: '+639777888999',
      emailVerified: true,
      host: {
        create: {},
      },
      userRoles: {
        create: {
          roleId: hostRole.id,
          status: 'PENDING',
        },
      },
      wallet: { create: {} },
    },
  });

  // Create rejected user
  console.log('❌ Creating rejected user...');
  await prisma.user.create({
    data: {
      email: 'rejected@test.com',
      password: await hash('Rejected123!', 12),
      firstName: 'Rejected',
      lastName: 'User',
      phoneNumber: '+639000111222',
      emailVerified: true,
      driver: {
        create: {
          licenseNumber: 'INVALID123',
        },
      },
      userRoles: {
        create: {
          roleId: driverRole.id,
          status: 'REJECTED',
        },
      },
      wallet: { create: {} },
    },
  });

  // Create suspended user
  console.log('🚫 Creating suspended user...');
  await prisma.user.create({
    data: {
      email: 'suspended@test.com',
      password: await hash('Suspended123!', 12),
      firstName: 'Suspended',
      lastName: 'User',
      phoneNumber: '+639333444555',
      emailVerified: true,
      host: {
        create: {},
      },
      userRoles: {
        create: {
          roleId: hostRole.id,
          status: 'SUSPENDED',
        },
      },
      wallet: { create: {} },
    },
  });

  // Create sample parking locations
  console.log('🅿️ Creating sample parking locations...');

  // Get host users to create parking locations for
  const hostUser = await prisma.user.findUnique({
    where: { email: 'host@test.com' },
    include: { host: true },
  });

  const multiRoleUser = await prisma.user.findUnique({
    where: { email: 'both@test.com' },
    include: { host: true },
  });

  if (hostUser?.host) {
    // Create approved parking locations for main host
    await prisma.parkingLocation.create({
      data: {
        hostId: hostUser.host.id,
        title: 'Downtown Shopping Mall Parking',
        description:
          'Secure covered parking near major shopping center. 24/7 security.',
        address: '123 Mall Drive, Downtown District, Metro City',
        latitude: 14.5995,
        longitude: 120.9842,
        basePricePerHour: 25.0,
        status: 'APPROVED',
        totalSlots: 12,
        availableSlots: 12,
        isMultiLevel: true,
        numberOfLevels: 3,
        images: {
          createMany: {
            data: [
              {
                imageUrl: 'https://park-link.s3.ap-southeast-2.amazonaws.com/parking-images/336fe79e-63d0-499c-91a4-b86b748ea2e9.jpeg',
                isPrimary: true,
              },
            ],
          },
        },
        parkingSpaces: {
          createMany: {
            data: [
              // Level 1
              { slotNumber: 1, name: 'L1-A1', levelNumber: 1 },
              { slotNumber: 2, name: 'L1-A2', levelNumber: 1 },
              { slotNumber: 3, name: 'L1-A3', levelNumber: 1 },
              { slotNumber: 4, name: 'L1-A4', levelNumber: 1 },
              // Level 2
              { slotNumber: 5, name: 'L2-B1', levelNumber: 2 },
              { slotNumber: 6, name: 'L2-B2', levelNumber: 2 },
              { slotNumber: 7, name: 'L2-B3', levelNumber: 2 },
              { slotNumber: 8, name: 'L2-B4', levelNumber: 2 },
              // Level 3
              { slotNumber: 9, name: 'L3-C1', levelNumber: 3 },
              { slotNumber: 10, name: 'L3-C2', levelNumber: 3 },
              { slotNumber: 11, name: 'L3-C3', levelNumber: 3 },
              { slotNumber: 12, name: 'L3-C4', levelNumber: 3 },
            ],
          },
        },
      },
    });

    await prisma.parkingLocation.create({
      data: {
        hostId: hostUser.host.id,
        title: 'Airport Terminal Parking',
        description: 'Close to airport terminal, perfect for travelers.',
        address: '456 Airport Road, Terminal Area, Metro City',
        latitude: 14.5085,
        longitude: 121.0194,
        basePricePerHour: 35.0,
        status: 'PENDING', // Waiting for approval
        totalSlots: 8,
        availableSlots: 8,
        isMultiLevel: true,
        numberOfLevels: 2,
        images: {
          createMany: {
            data: [
              {
                imageUrl: 'https://park-link.s3.ap-southeast-2.amazonaws.com/parking-images/336fe79e-63d0-499c-91a4-b86b748ea2e9.jpeg',
                isPrimary: true,
              },
            ],
          },
        },
        parkingSpaces: {
          createMany: {
            data: [
              // Ground Level
              { slotNumber: 1, name: 'G-01', levelNumber: 1 },
              { slotNumber: 2, name: 'G-02', levelNumber: 1 },
              { slotNumber: 3, name: 'G-03', levelNumber: 1 },
              { slotNumber: 4, name: 'G-04', levelNumber: 1 },
              // Upper Level
              { slotNumber: 5, name: 'U-01', levelNumber: 2 },
              { slotNumber: 6, name: 'U-02', levelNumber: 2 },
              { slotNumber: 7, name: 'U-03', levelNumber: 2 },
              { slotNumber: 8, name: 'U-04', levelNumber: 2 },
            ],
          },
        },
      },
    });
  }

  if (multiRoleUser?.host) {
    // Create pending parking location for multi-role user
    await prisma.parkingLocation.create({
      data: {
        hostId: multiRoleUser.host.id,
        title: 'University Campus Parking',
        description: 'Student-friendly parking near university campus.',
        address: '789 University Ave, Academic District, Metro City',
        latitude: 14.6507,
        longitude: 121.1029,
        basePricePerHour: 15.0,
        status: 'PENDING',
        totalSlots: 8,
        availableSlots: 8,
        isMultiLevel: false, // Single level parking
        parkingSpaces: {
          createMany: {
            data: [
              { slotNumber: 1, name: 'A1' },
              { slotNumber: 2, name: 'A2' },
              { slotNumber: 3, name: 'A3' },
              { slotNumber: 4, name: 'A4' },
              { slotNumber: 5, name: 'B1' },
              { slotNumber: 6, name: 'B2' },
              { slotNumber: 7, name: 'B3' },
              { slotNumber: 8, name: 'B4' },
            ],
          },
        },
      },
    });
  }

  console.log('✅ Database seeding completed!');
  console.log('\n📋 Test accounts created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👨‍💼 ADMIN ACCOUNTS:');
  console.log('  • admin@parkup.com (Admin123!)');
  console.log('  • kimzie@giver.com (Password123!)');
  console.log('');
  console.log('✅ VERIFIED USERS:');
  console.log('  • driver@test.com (Driver123!) - Driver role');
  console.log(
    '  • host@test.com (Host123!) - Host role (with parking locations)',
  );
  console.log(
    '  • both@test.com (Both123!) - Driver✅ + Host⏳ (with parking location)',
  );
  console.log('');
  console.log('⏳ PENDING APPROVAL:');
  console.log('  • pending-driver@test.com (Pending123!) - Driver pending');
  console.log('  • pending-host@test.com (Pending123!) - Host pending');
  console.log('');
  console.log('❌ REJECTED/SUSPENDED:');
  console.log('  • rejected@test.com (Rejected123!) - Driver rejected');
  console.log('  • suspended@test.com (Suspended123!) - Host suspended');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`\n📊 Summary:`);
  console.log(`  • ${await prisma.user.count()} users created`);
  console.log(`  • ${await prisma.role.count()} roles created`);
  console.log(`  • ${await prisma.userRole.count()} user-role assignments`);
  console.log(`  • ${await prisma.driver.count()} driver profiles`);
  console.log(`  • ${await prisma.host.count()} host profiles`);
  console.log(`  • ${await prisma.wallet.count()} wallets`);
  console.log(`  • ${await prisma.parkingLocation.count()} parking locations`);
  console.log(`  • ${await prisma.parkingSpace.count()} parking spaces`);

  console.log(`\n🅿️ Parking Status:`);
  console.log(
    `  • ${await prisma.parkingLocation.count({ where: { status: 'APPROVED' } })} approved locations`,
  );
  console.log(
    `  • ${await prisma.parkingLocation.count({ where: { status: 'PENDING' } })} pending locations`,
  );
  console.log(
    `  • ${await prisma.parkingLocation.count({ where: { status: 'REJECTED' } })} rejected locations`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  });
