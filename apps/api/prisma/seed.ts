/**
 * Seed script — default admin user, default settings row, starter categories.
 * Run with: npm run db:seed --workspace=apps/api
 *
 * IMPORTANT: change the default admin password immediately after first login
 * on the real shop PC. This seed password is only for initial setup.
 */

import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "Muzammil@123"; // change after first login

const STARTER_CATEGORIES = [
  "Shalwar Kameez",
  "Shirts",
  "Trousers",
  "Kids Wear",
  "Winter Wear",
  "Accessories",
];

async function main() {
  console.log("Seeding Muzammil Store POS database...");

  // ---- Admin user ----
  const existingAdmin = await prisma.user.findUnique({
    where: { username: DEFAULT_ADMIN_USERNAME },
  });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash(DEFAULT_ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        fullName: "Store Admin",
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(
      `Created default admin user -> username: "${DEFAULT_ADMIN_USERNAME}", password: "${DEFAULT_ADMIN_PASSWORD}" (change this after first login!)`
    );
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // ---- Default settings row (singleton) ----
  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        shopName: "Muzammil Store",
        currency: "PKR",
        receiptHeader: "Thank you for shopping at Muzammil Store",
        receiptFooter: "Exchange within 7 days with receipt",
        taxPercent: 0,
        lowStockThreshold: 5,
      },
    });
    console.log("Created default settings row.");
  } else {
    console.log("Settings row already exists, skipping.");
  }

  // ---- Starter categories ----
  for (const name of STARTER_CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, status: "ACTIVE" },
    });
  }
  console.log(`Ensured ${STARTER_CATEGORIES.length} starter categories exist.`);

  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });