export type UserPrefs = {
  userId: string;
  dietary?: ("celiac" | "vegetarian")[];   // restricciones
  ambience?: "quiet" | "medium" | "loud";  // ambiente deseado
  cuisines?: string[];                     // tipos de comida preferidos
  budgetMax?: number;                      // tope de precio
};

export const PREFS: UserPrefs[] = [
  // vacío al iniciar demo; se llenará por endpoints
];