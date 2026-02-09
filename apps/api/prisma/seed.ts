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
        },
      },
      userRoles: {
        create: {
          roleId: driverRole.id,
          status: 'VERIFIED', // ← Changed from APPROVED
        },
      },
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
        totalSlots: 10,
        availableSlots: 10,
        images: {
          createMany: {
            data: [
              {
                imageUrl: 'https://example.com/parking1-main.jpg',
                isPrimary: true,
              },
              { imageUrl: 'https://example.com/parking1-entrance.jpg' },
              { imageUrl: 'https://example.com/parking1-security.jpg' },
            ],
          },
        },
        parkingSpaces: {
          createMany: {
            data: Array.from({ length: 10 }, (_, i) => ({
              slotNumber: i + 1,
            })),
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
        totalSlots: 5,
        availableSlots: 5,
        images: {
          createMany: {
            data: [
              {
                imageUrl: 'https://example.com/parking2-main.jpg',
                isPrimary: true,
              },
            ],
          },
        },
        parkingSpaces: {
          createMany: {
            data: Array.from({ length: 5 }, (_, i) => ({
              slotNumber: i + 1,
            })),
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
        parkingSpaces: {
          createMany: {
            data: Array.from({ length: 8 }, (_, i) => ({
              slotNumber: i + 1,
            })),
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
