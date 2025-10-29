import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { USERS } from "./data/users.ts";

const app = express();
app.use(express.json());
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

app.get("/users", (_req: Request, res: Response) => res.json(USERS));

app.get("/restaurants", async (req: Request, res: Response) => {
  const schema = z.object({
    cuisines: z.string().optional(),
    maxPrice: z.coerce.number().optional(),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { cuisines, maxPrice } = parsed.data;
  const cuisinesArr = cuisines ? cuisines.split(",").map((s) => s.trim()) : undefined;

  const restaurants = await prisma.restaurant.findMany({
    where: {
      ...(maxPrice !== undefined ? { avgPrice: { lte: maxPrice } } : {}),
      ...(cuisinesArr ? { cuisines: { hasSome: cuisinesArr } } : {}),
    },
    include: { availability: true },
  });

  res.json(restaurants);
});

app.post("/reservations", async (req: Request, res: Response) => {
  const schema = z.object({
    restaurantId: z.string(),
    date: z.coerce.date(),
    slot: z.string(),
    partySize: z.number().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { restaurantId, date, slot, partySize } = parsed.data;

  const availability = await prisma.availability.findFirst({ where: { restaurantId, date, slot } });
  if (!availability) return res.status(400).json({ error: "Sin disponibilidad" });
  if (partySize > availability.capacity) return res.status(400).json({ error: "Capacidad insuficiente" });

  const reservation = await prisma.reservation.create({ data: { restaurantId, date, slot, partySize } });
  res.status(201).json(reservation);
});

app.listen(PORT, () => console.log(`API demo en http://localhost:${PORT}`));
