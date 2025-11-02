// src/data/confirmations.ts
export type Confirmation = {
  groupId: string;
  userId: string;
  restaurantId: string;
  confirmedAt: string;
};

export const CONFIRMATIONS: Confirmation[] = [];