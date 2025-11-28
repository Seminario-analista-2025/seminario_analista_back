// src/data/suggestions.ts
export type RestaurantSuggestion = {
  groupId: string;
  userId: string;           // Usuario que sugirió el restaurante
  restaurantId: string;
  suggestedAt: string;      // ISO timestamp
};

export const SUGGESTIONS: RestaurantSuggestion[] = [];


