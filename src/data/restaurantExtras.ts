// src/data/restaurantExtras.ts
export type MenuItem = { name: string; price: number; tags?: string[]; desc?: string };
export type MenuCategory = { category: string; items: MenuItem[] };
export type Review = { author: string; rating: number; text: string; when: string }; // when = ISO

// Mapeo por NOMBRE de restaurante (de tu seed)
export const MENUS_BY_NAME: Record<string, MenuCategory[]> = {
  "Koi & Noodles": [
    { category: "Ramen", items: [
      { name: "Tonkotsu Ramen", price: 6500, tags: ["pork"], desc: "Caldo intenso, chashu y huevo marinado" },
      { name: "Shoyu Ramen", price: 5900, tags: ["chicken"], desc: "Clásico de soja, fideos finos" }
    ]},
    { category: "Entradas", items: [
      { name: "Gyozas (6)", price: 4300, tags: ["vegetarian"], desc: "Salteadas, salsa ponzu" }
    ]}
  ],
  "La Trattoria": [
    { category: "Pastas", items: [
      { name: "Spaghetti Pomodoro", price: 5200, tags: ["vegetarian"], desc: "Tomate italiano, albahaca" },
      { name: "Fettuccine Alfredo", price: 5900, tags: ["vegetarian"] }
    ]},
    { category: "Pizzas", items: [
      { name: "Margherita", price: 6200, tags: ["vegetarian"] }
    ]}
  ],
  "Bamboo Trattoria Fusión": [
    { category: "Fusión", items: [
      { name: "Nigiri Caprese", price: 4800, tags: ["vegetarian"], desc: "Arroz, mozzarella, pesto" },
      { name: "Ramen al Pesto", price: 6700, tags: ["vegetarian", "gluten-free"] }
    ]},
    { category: "Sin TACC", items: [
      { name: "Risotto Funghi (sin TACC)", price: 7300, tags: ["gluten-free", "vegetarian"] }
    ]}
  ]
};

export const REVIEWS_BY_NAME: Record<string, Review[]> = {
  "Koi & Noodles": [
    { author: "Luz", rating: 5, text: "El caldo del tonkotsu es BUENÍSIMO.", when: "2025-10-25T20:10:00Z" },
    { author: "Mauro", rating: 4, text: "Rico y rápido, local pequeño pero tranquilo.", when: "2025-10-20T18:00:00Z" }
  ],
  "La Trattoria": [
    { author: "Sofi", rating: 4, text: "Pasta al dente y buen precio.", when: "2025-10-22T21:30:00Z" },
    { author: "Diego", rating: 3, text: "La pizza bien, pero un poco ruidoso.", when: "2025-10-18T23:00:00Z" }
  ],
  "Bamboo Trattoria Fusión": [
    { author: "Nati", rating: 5, text: "Opciones sin TACC reales. Ambiente súper tranquilo.", when: "2025-10-26T19:45:00Z" },
    { author: "Juan", rating: 4, text: "Muy creativa la fusión, volvería.", when: "2025-10-24T20:20:00Z" }
  ]
};
