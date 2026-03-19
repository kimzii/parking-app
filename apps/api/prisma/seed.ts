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

  // Create roles (upsert to avoid duplicates)
  console.log('👥 Creating roles...');
  await prisma.role.upsert({
    where: { name: 'DRIVER' },
    update: {},
    create: { name: 'DRIVER' },
  });

  await prisma.role.upsert({
    where: { name: 'HOST' },
    update: {},
    create: { name: 'HOST' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN' },
  });

  console.log('✅ Created roles: DRIVER, HOST, ADMIN');

  // Create admin user
  console.log('👨‍💼 Creating admin user...');
  const adminExists = await prisma.user.findUnique({
    where: { email: 'admin@parkup.com' },
  });

  if (!adminExists) {
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
            status: 'VERIFIED',
          },
        },
        wallet: { create: {} },
      },
    });
    console.log('  ✅ admin@parkup.com created');
  } else {
    console.log('  ⏭️ admin@parkup.com already exists, skipping');
  }

  // Create your personal admin account
  console.log('👩‍💼 Creating your admin account...');
  const kimzieExists = await prisma.user.findUnique({
    where: { email: 'kimzie@giver.com' },
  });

  if (!kimzieExists) {
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
            status: 'VERIFIED',
          },
        },
        wallet: { create: {} },
      },
    });
    console.log('  ✅ kimzie@giver.com created');
  } else {
    console.log('  ⏭️ kimzie@giver.com already exists, skipping');
  }

  console.log('\n✅ Database seeding completed!');
  console.log('\n📋 Admin accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  • admin@parkup.com (Admin123!)');
  console.log('  • kimzie@giver.com (Password123!)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log(`\n📊 Summary:`);
  console.log(`  • ${await prisma.user.count()} total users`);
  console.log(`  • ${await prisma.role.count()} roles`);
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
