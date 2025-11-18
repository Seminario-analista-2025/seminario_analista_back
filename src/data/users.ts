// src/data/users.ts
export type DemoUser = {
  id: string;
  email: string;
  name: string;
  password: string; // ⚠️ DEMO: solo para pruebas, no usar en prod
};

export const USERS: DemoUser[] = [];