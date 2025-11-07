// src/data/votes.ts
export type VoteValue = "up" | "down";

export type Vote = {
  groupId: string;
  userId: string;
  restaurantId: string;
  value: VoteValue;         // "up" o "down"
  votedAt: string;          // ISO
};

export const VOTES: Vote[] = [];
