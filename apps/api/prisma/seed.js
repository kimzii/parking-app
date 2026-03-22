"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({
    path: (0, path_1.resolve)(__dirname, '../.env'),
});
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');
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
    console.log('👨‍💼 Creating admin user...');
    const adminExists = await prisma.user.findUnique({
        where: { email: 'admin@parkup.com' },
    });
    if (!adminExists) {
        await prisma.user.create({
            data: {
                email: 'admin@parkup.com',
                password: await (0, bcryptjs_1.hash)('Admin123!', 12),
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
    }
    else {
        console.log('  ⏭️ admin@parkup.com already exists, skipping');
    }
    console.log('👩‍💼 Creating your admin account...');
    const kimzieExists = await prisma.user.findUnique({
        where: { email: 'kimzie@giver.com' },
    });
    if (!kimzieExists) {
        await prisma.user.create({
            data: {
                email: 'kimzie@giver.com',
                password: await (0, bcryptjs_1.hash)('Password123!', 12),
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
    }
    else {
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
//# sourceMappingURL=seed.js.map