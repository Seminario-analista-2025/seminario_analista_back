import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.restaurant.deleteMany();

  const r1 = await prisma.restaurant.create({
    data: {
      name: "Koi & Noodles",
      cuisines: ["Japonesa", "Ramen"],
      avgPrice: 25,
      location: { lat: -31.4, lng: -64.18, address: "Calle 123, Córdoba" },
      noiseLevel: "medio",
      accessibility: ["ramp", "restroom"]
    }
  });

  const r2 = await prisma.restaurant.create({
    data: {
      name: "La Trattoria",
      cuisines: ["Italiana", "Pasta"],
      avgPrice: 20,
      location: { lat: -31.41, lng: -64.19, address: "Av. 456, Córdoba" },
      noiseLevel: "bajo",
      accessibility: ["ramp"]
    }
  });

  const today = new Date();
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const slots = ["20:00", "21:30"];

  for (const slot of slots) {
    await prisma.availability.create({ data: { restaurantId: r1.id, date, slot, capacity: 6 } });
    await prisma.availability.create({ data: { restaurantId: r2.id, date, slot, capacity: 4 } });
  }

  console.log("Seed completo.");
}

main().catch(e => { console.error(e); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
