import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { USERS } from "./data/users.ts";
import { ADDRESSES, GROUPS, Group } from "./data/groups.ts";
import { PREFS, UserPrefs } from "./data/prefs.ts";
import { MENUS_BY_NAME, REVIEWS_BY_NAME } from "./data/restaurantExtras.ts";
import { VOTES, VoteValue } from "./data/votes.ts ";

const app = express();
app.use(express.json());
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT ?? 3000);

app.get("/health", (_req: Request, res: Response) => res.json({ ok: true }));

// GET /users?exclude=u1&name=ana
app.get("/users", (req: Request, res: Response) => {
  const schema = z.object({
    exclude: z.string().optional(), // id del usuario a excluir (por ejemplo, el logueado)
    name: z.string().optional(),    // búsqueda parcial por nombre
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { exclude, name } = parsed.data;

  let filtered = USERS;

  // excluir usuario actual (por id)
  if (exclude) filtered = filtered.filter(u => u.id !== exclude);

  // filtro por nombre (case-insensitive)
  if (name) {
    const search = name.toLowerCase();
    filtered = filtered.filter(u => u.name.toLowerCase().includes(search));
  }

  res.json(filtered);
});

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
// Crear grupo (con fecha/hora y límite)
app.post("/groups", (req: Request, res: Response) => {
  const schema = z.object({
    name: z.string(),
    coordinatorId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    time: z.string().regex(/^\d{2}:\d{2}$/),       // HH:mm
    placeHint: z.string().optional(),
    // admite "limit" o "size" desde la UI
    limit: z.preprocess(
      (v) => (v ?? (req.body.size as unknown)),
      z.coerce.number().int().min(2).max(20)
    )
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { name, coordinatorId, date, time, placeHint, limit } = parsed.data;
  const id = `g${GROUPS.length + 1}`;
  const newGroup: Group = {
    id,
    name,
    coordinatorId,
    members: [coordinatorId],
    invitations: [],
    date,
    time,
    placeHint,
    limit
  };

  GROUPS.push(newGroup);
  return res.status(201).json({ ...newGroup, remainingSeats: limit - 1 });
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

  // votos del grupo
const groupVotes = VOTES.filter(v => v.groupId === groupId);
const voteCounts: Record<string, { up: number; down: number }> = {};
for (const v of groupVotes) {
  voteCounts[v.restaurantId] ??= { up: 0, down: 0 };
  voteCounts[v.restaurantId][v.value]++;
}

// si querés, el front puede pasar ?userId=u2 para saber el propio voto
const viewerUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;
const myVotes = viewerUserId
  ? groupVotes.filter(v => v.userId === viewerUserId).reduce<Record<string, VoteValue>>((acc, v) => {
      acc[v.restaurantId] = v.value;
      return acc;
    }, {})
  : {};

// anexar conteos a cada sugerencia
const suggestionsWithVotes = suggestions.map(s => ({
  ...s,
  votes: { ...(voteCounts[s.id] ?? { up: 0, down: 0 }) },
  myVote: viewerUserId ? myVotes[s.id] ?? null : null
}));

return res.json({
  group: g,
  members,
  consideredPreferences: merged,
  suggestions: suggestionsWithVotes,
  limit: g.limit,
  remainingSeats: g.limit - g.members.length,
  voteSummary: voteCounts
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
// =======================
// E) Vista extendida: todos los grupos de un usuario
// =======================
app.get("/group-view/all/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Buscar todos los grupos donde participa o coordina
  const userGroups = GROUPS.filter(
    g =>
      g.coordinatorId === userId ||
      g.members.includes(userId) ||
      (g.invitations ?? []).includes(userId)
  );

  // Si no tiene grupos, devolvemos lista vacía
  if (userGroups.length === 0) {
    return res.json([]);
  }

  // Traer restaurantes para sugerencias (una sola vez)
  const restaurants = await prisma.restaurant.findMany({ include: { availability: true } });

  // Procesar cada grupo igual que en /group-view/:groupId
  const groupViews = userGroups.map(g => {
    const members = g.members;
    const memberPrefs = PREFS.filter(p => members.includes(p.userId));

    const merged = {
      dietary: Array.from(new Set(memberPrefs.flatMap(p => p.dietary ?? []))),
      ambience:
        memberPrefs.some(p => p.ambience === "quiet")
          ? "quiet"
          : memberPrefs.some(p => p.ambience === "medium")
          ? "medium"
          : memberPrefs.some(p => p.ambience === "loud")
          ? "loud"
          : undefined,
      cuisines: Array.from(new Set(memberPrefs.flatMap(p => p.cuisines ?? []))),
      budgetMax: Math.min(...memberPrefs.map(p => p.budgetMax ?? Infinity))
    };

    const suggestions = restaurants.filter(r => {
      if (merged.dietary?.includes("celiac") && !r.accessibility.includes("gluten-free")) return false;
      if (merged.dietary?.includes("vegetarian")) {
        const isVeg = r.accessibility.includes("vegetarian") || r.cuisines.includes("Vegetariana");
        if (!isVeg) return false;
      }
      if (merged.ambience === "quiet" && r.noiseLevel !== "bajo") return false;
      if ((merged.cuisines?.length ?? 0) > 0) {
        const match = r.cuisines.some(c => merged.cuisines!.includes(c));
        if (!match) return false;
      }
      return true;
    });

    return {
      group: g,
      members,
      consideredPreferences: merged,
      suggestions,
      limit: g.limit,
      remainingSeats: g.limit - g.members.length
    };
  });

  res.json(groupViews);
});

// 👉 Crear/actualizar voto (+/-) de un usuario sobre un restaurante del grupo
app.post("/groups/:groupId/votes", (req: Request, res: Response) => {
  const schema = z.object({
    userId: z.string(),
    restaurantId: z.string(),
    value: z.enum(["up", "down"])
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { groupId } = req.params;
  const { userId, restaurantId, value } = parsed.data;

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });
  if (!g.members.includes(userId)) return res.status(403).json({ error: "El usuario no pertenece al grupo" });

  // Reemplazar voto previo del mismo user sobre ese restaurant
  for (let i = VOTES.length - 1; i >= 0; i--) {
    if (VOTES[i].groupId === groupId && VOTES[i].userId === userId && VOTES[i].restaurantId === restaurantId) {
      VOTES.splice(i, 1);
    }
  }
  VOTES.push({ groupId, userId, restaurantId, value: value as VoteValue, votedAt: new Date().toISOString() });

  return res.status(201).json({ message: "Voto registrado", groupId, userId, restaurantId, value });
});

// 👉 Quitar voto (opcional)
app.delete("/groups/:groupId/votes", (req: Request, res: Response) => {
  const schema = z.object({
    userId: z.string(),
    restaurantId: z.string()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { groupId } = req.params;
  const { userId, restaurantId } = parsed.data;

  const before = VOTES.length;
  for (let i = VOTES.length - 1; i >= 0; i--) {
    if (VOTES[i].groupId === groupId && VOTES[i].userId === userId && VOTES[i].restaurantId === restaurantId) {
      VOTES.splice(i, 1);
    }
  }
  return res.json({ removed: before - VOTES.length });
});

// 👉 Resumen de votos del grupo (conteos por restaurant y mi voto)
app.get("/groups/:groupId/votes", async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { userId } = req.query as { userId?: string };

  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  const groupVotes = VOTES.filter(v => v.groupId === groupId);

  // Conteos por restaurante
  const counts: Record<string, { up: number; down: number }> = {};
  for (const v of groupVotes) {
    counts[v.restaurantId] ??= { up: 0, down: 0 };
    counts[v.restaurantId][v.value]++;
  }

  // Mi voto (si me pasan userId)
  const myVotes = userId
    ? groupVotes.filter(v => v.userId === userId).reduce<Record<string, VoteValue>>((acc, v) => {
        acc[v.restaurantId] = v.value;
        return acc;
      }, {})
    : {};

  res.json({
    groupId,
    totalVotes: groupVotes.length,
    counts,
    myVotes
  });
});


// Admin reserva directo para el grupo
app.post("/groups/:groupId/reserve", async (req: Request, res: Response) => {
  const schema = z.object({
    coordinatorId: z.string(),
    restaurantId: z.string(),
    // opcionalmente permitir override por body
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    note: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { coordinatorId, restaurantId, date, time, note } = parsed.data;

  const { groupId } = req.params;
  const g = GROUPS.find(x => x.id === groupId);
  if (!g) return res.status(404).json({ error: "Grupo no encontrado" });

  if (g.coordinatorId !== coordinatorId) {
    return res.status(403).json({ error: "Solo el coordinador puede reservar" });
  }

  const partySize = g.members.length;
  const dateStr = date ?? g.date;
  const timeStr = time ?? g.time;

  if (!dateStr || !timeStr) {
    return res.status(400).json({ error: "Falta fecha u hora para reservar" });
  }

  // normalizar fecha a 00:00 UTC (igual que seed)
  const normalized = new Date(Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10))
  ));

  // verificar slot
  const availability = await prisma.availability.findFirst({
    where: { restaurantId, date: normalized, slot: timeStr }
  });
  if (!availability) return res.status(400).json({ error: "Sin disponibilidad para esa fecha/hora" });
  if (partySize > availability.capacity) return res.status(400).json({ error: "Capacidad insuficiente" });

  // crear reserva y descontar capacidad
  const reservation = await prisma.reservation.create({
    data: { restaurantId, date: normalized, slot: timeStr, partySize, note }
  });

  await prisma.availability.update({
    where: { id: availability.id },
    data: { capacity: availability.capacity - partySize }
  });

  return res.status(201).json({
    message: "Reserva creada para el grupo",
    reservation,
    remainingCapacity: availability.capacity - partySize
  });
});
