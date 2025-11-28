// src/data/groups.ts
export type Address = {
  id: string;
  userId: string;
  label: string;
  address: string;
};

export const ADDRESSES: Address[] = [
  { id: "a1", userId: "u1", label: "Casa",         address: "Av. Siempre Viva 742" },
  { id: "a2", userId: "u2", label: "Departamento", address: "Calle Falsa 123" }
];

export type GroupReservation = {
  id: string;
  restaurantId: string;
  date: string;
  time: string;
  note?: string;
  partySize: number;
  restaurant?: {
    id: string;
    name: string;
    cuisines: string[];
    avgPrice: number | null;
    location: Record<string, unknown>;
    noiseLevel?: string | null;
    accessibility: string[];
    photoUrl?: string | null;
  };
};

export type Group = {
  id: string;
  name: string;
  coordinatorId: string;
  members: string[];           // miembros confirmados
  invitations?: string[];      // usuarios invitados (simulado)
  date?: string;               // "YYYY-MM-DD"
  time?: string;               // "HH:mm"
  placeHint?: string;          // opcional: barrio/zona
  limit: number;
  reservation?: GroupReservation;
};

export const GROUPS: Group[] = [
  // Podés iniciar vacío si querés que el usuario 1 NO tenga grupos al principio:
  // (dejalo vacío para la demo)
  // { id: "g1", name: "Cena Japonesa", coordinatorId: "u1", members: ["u1", "u2"] }
];