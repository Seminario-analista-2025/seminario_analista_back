import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { USERS } from "./data/users.ts";
import { ADDRESSES, GROUPS, Group } from "./data/groups.ts";
import { PREFS, UserPrefs } from "./data/prefs.ts";
import { MENUS_BY_NAME, REVIEWS_BY_NAME } from "./data/restaurantExtras.ts";
import { CONFIRMATIONS } from "./data/confirmations.ts";

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


// Login de demo (sin tokens)
app.post("/auth/login", (req: Request, res: Response) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { email, password } = parsed.data;

  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // Para la demo, devolvemos datos mínimos y un sessionId ficticio
  return res.status(200).json({
    message: "Login exitoso (DEMO, sin token)",
    user: { id: user.id, email: user.email, name: user.name },
    sessionId: `demo-${user.id}` // opcional, puro front
  });
});

// GET /addresses/:userId
app.get("/addresses/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userAddresses = ADDRESSES.filter(a => a.userId === userId);
  res.json(userAddresses);
});

app.get("/groups/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userGroups = GROUPS.filter(
    g => g.coordinatorId === userId || g.members.includes(userId)
  );
  res.json(userGroups);
});

// POST /groups
app.post("/groups", (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    coordinatorId: z.string(),
    members: z.array(z.string()).default([])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { name, coordinatorId, members } = parsed.data;
  const id = `g${GROUPS.length + 1}`;
  const newGroup = { id, name, coordinatorId, members: [coordinatorId, ...members] };
  GROUPS.push(newGroup);

  res.status(201).json(newGroup);
});

/* =======================
   A) Preferencias del usuario (DEMO)
   ======================= */
// Guardar/actualizar preferencias del usuario (Usuario 1 primero, luego Usuario 2)
app.put("/users/:userId/preferences", (req: Request, res: Response) => {
  const schema = z.object({
    dietary: z.array(z.enum(["celiac", "vegetarian"])).optional(),
    ambience: z.enum(["quiet", "medium", "loud"]).optional(),
    cuisines: z.array(z.string()).optional(),
    budgetMax: z.number().int().positive().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { userId } = req.params;
  const idx = PREFS.findIndex(p => p.userId === userId);
  const payload: UserPrefs = { userId, ...parsed.data };

  if (idx >= 0) PREFS[idx] = { ...PREFS[idx], ...payload };
  else PREFS.push(payload);

  return res.status(200).json({ message: "Preferencias guardadas", prefs: payload });
});

// Obtener preferencias (p/ precargar pantalla de Usuario 2)
app.get("/users/:userId/preferences", (req: Request, res: Response) => {
  const { userId } = req.params;
  const prefs = PREFS.find(p => p.userId === userId) ?? null;
  return res.json(prefs);
});

/* =======================
   B) Direcciones e info base
   ======================= */
app.get("/addresses/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userAddresses = ADDRESSES.filter(a => a.userId === userId);
  res.json(userAddresses);
});

/* =======================
   C) Grupos: listar / crear / invitar / unirse
   ======================= */
// Listar grupos del usuario (coordinador o miembro/invitado)
app.get("/groups/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;
  const userGroups = GROUPS.filter(
    g => g.coordinatorId === userId || g.members.includes(userId) || (g.invitations ?? []).includes(userId)
  );
  res.json(userGroups);
});

// Crear grupo (Usuario 1): se crea con fecha/hora y queda con el coordinador adentro
app.post("/groups", (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    coordinatorId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    time: z.string().regex(/^\d{2}:\d{2}$/),       // HH:mm
    placeHint: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { name, coordinatorId, date, time, placeHint } = parsed.data;
  const id = `g${GROUPS.length + 1}`;
  const newGroup: Group = {
    id, name, coordinatorId,
    members: [coordinatorId],
    invitations: [],
    date, time, placeHint
  };
  GROUPS.push(newGroup);
  res.status(201).json(newGroup);
});

// Simular invitación por QR: agrega el userId a "invitations"
app.post("/groups/:groupId/invite", (req: Request, res: Response) => {
  const schema = z.object({ userId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { groupId } = req.params;
  const { userId } = parsed.data;

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  g.invitations = Array.from(new Set([...(g.invitations ?? []), userId]));
  return res.status(200).json({ message: "Invitación generada (DEMO)", group: g, qr: `demo://invite/${groupId}/${userId}` });
});

// Unirse a grupo (Usuario 2 acepta invitación)
app.post("/groups/:groupId/join", (req: Request, res: Response) => {
  const schema = z.object({ userId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { groupId } = req.params;
  const { userId } = parsed.data;

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  // si estaba invitado, pasa a ser miembro
  if (g.invitations?.includes(userId)) {
    g.invitations = g.invitations.filter(u => u !== userId);
  }
  g.members = Array.from(new Set([...g.members, userId]));
  return res.status(200).json({ message: "Te uniste al grupo (DEMO)", group: g });
});

/* =======================
   D) Vista de grupo: detalles + resumen de preferencias + sugerencias
   ======================= */


app.get("/group-view/:groupId", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  // 1) miembros y prefs
  const members = g.members;
  const memberPrefs = PREFS.filter(p => members.includes(p.userId));

  const merged = {
    dietary: Array.from(new Set(memberPrefs.flatMap(p => p.dietary ?? []))),
    ambience:
      memberPrefs.some(p => p.ambience === "quiet") ? "quiet" :
      memberPrefs.some(p => p.ambience === "medium") ? "medium" :
      memberPrefs.some(p => p.ambience === "loud") ? "loud" : undefined,
    cuisines: Array.from(new Set(memberPrefs.flatMap(p => p.cuisines ?? []))),
    budgetMax: Math.min(...memberPrefs.map(p => p.budgetMax ?? Infinity))
  };

  // 2) restaurantes
  const restaurants = await prisma.restaurant.findMany({ include: { availability: true } });

  // Filtro estricto (como ahora), pero además calculamos score y motivos
  const passesStrict = (r: any) => {
    const access = Array.isArray(r.accessibility) ? r.accessibility : [];
    const cuis = Array.isArray(r.cuisines) ? r.cuisines : [];

    if (merged.dietary?.includes("celiac") && !access.includes("gluten-free")) return false;
    if (merged.dietary?.includes("vegetarian")) {
      const isVeg = access.includes("vegetarian") || cuis.includes("Vegetariana");
      if (!isVeg) return false;
    }
    if (merged.ambience === "quiet" && r.noiseLevel !== "bajo") return false;
    if ((merged.cuisines?.length ?? 0) > 0) {
      const match = cuis.some(c => merged.cuisines!.includes(c));
      if (!match) return false;
    }
    return true;
  };

  const explain = (r: any) => {
    const access = Array.isArray(r.accessibility) ? r.accessibility : [];
    const cuis = Array.isArray(r.cuisines) ? r.cuisines : [];

    const motivos: string[] = [];
    let score = 0;

    if (merged.dietary?.includes("celiac")) {
      if (access.includes("gluten-free")) { motivos.push("Apto celíacos"); score++; }
      else motivos.push("No apto celíacos");
    }
    if (merged.dietary?.includes("vegetarian")) {
      if (access.includes("vegetarian") || cuis.includes("Vegetariana")) { motivos.push("Opciones vegetarianas"); score++; }
      else motivos.push("Sin opciones vegetarianas");
    }
    if (merged.ambience === "quiet") {
      if (r.noiseLevel === "bajo") { motivos.push("Ambiente tranquilo"); score++; }
      else motivos.push("Ambiente no tranquilo");
    }
    if ((merged.cuisines?.length ?? 0) > 0) {
      const hasCuisine = cuis.some(c => merged.cuisines!.includes(c));
      if (hasCuisine) { motivos.push(`Cocina preferida: ${merged.cuisines!.join("/")}`); score++; }
      else motivos.push("No coincide con cocinas preferidas");
    }
    if (Number.isFinite(merged.budgetMax)) {
      if (typeof r.avgPrice === "number" && r.avgPrice <= (merged.budgetMax as number)) {
        motivos.push("Dentro del presupuesto"); score++;
      } else {
        motivos.push("Fuera de presupuesto");
      }
    }
    return { score, motivos };
  };

  // 3) filtrar y explicar
  const filtered = restaurants.filter(passesStrict);

  // 4) availability por fecha/hora: usa la del grupo si existe; permite override por query
  //    Ej: /group-view/g1?date=2025-11-05&time=21:00
  const qDate = typeof req.query.date === "string" ? req.query.date : undefined;
  const qTime = typeof req.query.time === "string" ? req.query.time : undefined;

  const dateStr = qDate ?? g.date;   // "YYYY-MM-DD"
  const timeStr = qTime ?? g.time;   // "HH:mm"

  let availabilityByRestaurant: Record<string, { slot: string; capacity: number }[]> = {};
  if (dateStr) {
    const normalized = new Date(Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10))
    ));

    const ids = filtered.map(r => r.id);
    const avs = await prisma.availability.findMany({
      where: { restaurantId: { in: ids }, date: normalized },
      orderBy: { slot: "asc" }
    });
    for (const a of avs) {
      (availabilityByRestaurant[a.restaurantId] ??= []).push({ slot: a.slot, capacity: a.capacity });
    }
  }

  // 5) armar respuesta con score/motivos + disponibilidad
  const suggestions = filtered
    .map(r => {
      const { score, motivos } = explain(r);
      const slots = availabilityByRestaurant[r.id] ?? [];
      const hasAvailability = dateStr ? slots.length > 0 && (!timeStr || slots.some(s => s.slot === timeStr)) : false;
      return {
        ...r,
        matchScore: score,
        motivos,
        availabilityForDate: dateStr ? { date: dateStr, slots } : null,
        reservableAtTime: dateStr && timeStr ? { time: timeStr, ok: slots.some(s => s.slot === timeStr) } : null
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return res.json({
    group: g,
    members,
    consideredPreferences: merged,
    suggestions
  });
});

app.get("/restaurants/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const r = await prisma.restaurant.findUnique({
    where: { id },
    include: { availability: true }
  });
  if (!r) return res.status(404).json({ error: "Restaurante no encontrado" });

  const reviews = REVIEWS_BY_NAME[r.name] ?? [];
  const ratingAvg = reviews.length ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) : null;

  res.json({
    ...r,
    rating: ratingAvg ? Number(ratingAvg.toFixed(2)) : null,
    reviewsCount: reviews.length
  });
});

app.get("/restaurants/:id/menu", async (req: Request, res: Response) => {
  const { id } = req.params;
  const r = await prisma.restaurant.findUnique({ where: { id }, select: { name: true } });
  if (!r) return res.status(404).json({ error: "Restaurante no encontrado" });

  const menu = MENUS_BY_NAME[r.name] ?? [];
  res.json({ restaurantId: id, name: r.name, menu });
});

app.get("/restaurants/:id/reviews", async (req: Request, res: Response) => {
  const { id } = req.params;
  const top = Number(req.query.top ?? 3);

  const r = await prisma.restaurant.findUnique({ where: { id }, select: { name: true } });
  if (!r) return res.status(404).json({ error: "Restaurante no encontrado" });

  const all = (REVIEWS_BY_NAME[r.name] ?? []).slice()
    .sort((a, b) => b.rating - a.rating || b.when.localeCompare(a.when));

  res.json({
    restaurantId: id,
    name: r.name,
    total: all.length,
    reviews: all.slice(0, Math.max(1, Math.min(top, 10))) // 1..10 por sanidad
  });
});

app.post("/groups/:groupId/confirm", (req: Request, res: Response) => {
  const schema = z.object({
    userId: z.string(),
    restaurantId: z.string()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { groupId } = req.params;
  const { userId, restaurantId } = parsed.data;

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });
  if (!g.members.includes(userId)) return res.status(403).json({ error: "El usuario no pertenece al grupo" });

  // Eliminar confirmaciones previas del mismo usuario en el mismo grupo
  for (let i = CONFIRMATIONS.length - 1; i >= 0; i--) {
    if (CONFIRMATIONS[i].groupId === groupId && CONFIRMATIONS[i].userId === userId)
      CONFIRMATIONS.splice(i, 1);
  }

  const confirmation = { groupId, userId, restaurantId, confirmedAt: new Date().toISOString() };
  CONFIRMATIONS.push(confirmation);

  res.status(201).json({ message: "Confirmación registrada", confirmation });
});

app.get("/groups/:groupId/confirmations", (req: Request, res: Response) => {
  const { groupId } = req.params;

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  const list = CONFIRMATIONS.filter(c => c.groupId === groupId);

  const enriched = list.map(c => {
    const user = USERS.find(u => u.id === c.userId);
    const restaurant = { id: c.restaurantId };
    return {
      ...c,
      userName: user?.name ?? c.userId,
      restaurant
    };
  });

  const allConfirmed = g.members.every(m => list.some(c => c.userId === m));

  res.json({
    groupId,
    totalMembers: g.members.length,
    confirmed: list.length,
    allConfirmed,
    confirmations: enriched
  });
});