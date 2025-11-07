import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.restaurant.deleteMany();

// r1
const r1 = await prisma.restaurant.create({
  data: {
    name: "Koi & Noodles",
    cuisines: ["Japonesa", "Ramen"],
    avgPrice: 25,
    location: { lat: -31.4, lng: -64.18, address: "Calle 123, Córdoba" },
    noiseLevel: "bajo", // 👈 tranquilo
    accessibility: ["ramp", "restroom", "gluten-free"],
    photoUrl: "https://i.pinimg.com/1200x/b4/fa/ea/b4faea413da984b5c6723be19572063e.jpg"
  },
});

// r2
const r2 = await prisma.restaurant.create({
  data: {
    name: "La Trattoria",
    cuisines: ["Italiana", "Pasta", "Vegetariana"], // 👈 opciones veggies
    avgPrice: 20,
    location: { lat: -31.41, lng: -64.19, address: "Av. 456, Córdoba" },
    noiseLevel: "medio",
    accessibility: ["ramp", "vegetarian"],
    photoUrl: "https://i.pinimg.com/1200x/c7/68/e6/c768e6ab9455d6b0b3b8732ef1ac9215.jpg"
  },
});

// r3
const r3 = await prisma.restaurant.create({
  data: {
    name: "Bamboo Trattoria Fusión",
    cuisines: ["Italiana", "Japonesa", "Fusión", "Vegetariana"],
    avgPrice: 30,
    location: { lat: -31.42, lng: -64.20, address: "Av. Las Flores 789, Córdoba" },
    noiseLevel: "bajo", // tranquilo
    accessibility: ["ramp", "restroom", "gluten-free", "vegetarian"],
    photoUrl: "https://i.pinimg.com/736x/2b/1d/f1/2b1df159ca331b71104b2d0f8c1a4863.jpg"
  },
});

  const today = new Date();
  const date = new Date("2025-11-05T00:00:00Z");
  const slots = ["20:00", "21:00"];

  for (const slot of slots) {
    await prisma.availability.create({ data: { restaurantId: r1.id, date, slot, capacity: 6 } });
    await prisma.availability.create({ data: { restaurantId: r2.id, date, slot, capacity: 4 } });
    await prisma.availability.create({ data: { restaurantId: r3.id, date, slot, capacity: 5 } });
}

  console.log("Seed completo.");
}

main().catch(e => { console.error(e); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
