// src/data/users.ts
export type DemoUser = {
  id: string;
  email: string;
  name: string;
  password: string; // ⚠️ DEMO: solo para pruebas, no usar en prod
};

export const USERS: DemoUser[] = [
  { id: "u1", email: "ana@example.com",   name: "Ana",   password: "123456" },
  { id: "u2", email: "bruno@example.com", name: "Bruno", password: "123456" }
];