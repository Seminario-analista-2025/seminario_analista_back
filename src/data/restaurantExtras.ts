// src/data/restaurantExtras.ts
export type MenuItem = {
  name: string;
  price: number;
  tags?: string[];
  desc?: string;
  imageUrl?: string;   // 👈 NUEVO
};

export type MenuCategory = {
  category: string;
  items: MenuItem[];
};

export type Review = { author: string; rating: number; text: string; when: string };

export const MENUS_BY_NAME: Record<string, MenuCategory[]> = {
  "Koi & Noodles": [
    {
      category: "Ramen",
      items: [
        {
          name: "Tonkotsu Ramen",
          price: 6500,
          tags: ["pork"],
          desc: "Caldo intenso, chashu y huevo marinado",
          imageUrl: "https://i.pinimg.com/1200x/d6/8a/be/d68abeeccb103fdff55b6f662650a63c.jpg" // 👈 ejemplo
        },
        {
          name: "Shoyu Ramen",
          price: 5900,
          tags: ["chicken"],
          desc: "Clásico de soja, fideos finos",
          imageUrl: "https://i.pinimg.com/1200x/62/38/08/6238083cdbed4e1243890eb8f4e53867.jpg"
        }
      ]
    },
    {
      category: "Entradas",
      items: [
        {
          name: "Gyozas (6)",
          price: 4300,
          tags: ["vegetarian"],
          desc: "Salteadas, salsa ponzu",
          imageUrl: "https://i.pinimg.com/1200x/e4/c1/61/e4c161e4da631855340b76c6b8207f15.jpg"
        }
      ]
    }
  ],
  "La Trattoria": [
    {
      category: "Pastas",
      items: [
        {
          name: "Spaghetti Pomodoro",
          price: 5200,
          tags: ["vegetarian"],
          desc: "Tomate italiano, albahaca",
          imageUrl: "https://i.pinimg.com/1200x/7e/f3/c3/7ef3c3293cc54f3ac40f4ab08df47521.jpg"
        },
        {
          name: "Fettuccine Alfredo",
          price: 5900,
          tags: ["vegetarian"],
          imageUrl: "https://i.pinimg.com/1200x/6d/f9/8b/6df98b0988df1514fb3948822c2cf7cc.jpg"
        }
      ]
    },
    {
      category: "Pizzas",
      items: [
        {
          name: "Margherita",
          price: 6200,
          tags: ["vegetarian"],
          imageUrl: "https://picsum.photos/seed/margherita/400"
        }
      ]
    }
  ],
  "Bamboo Trattoria Fusión": [
    {
      category: "Fusión",
      items: [
        {
          name: "Nigiri Caprese",
          price: 4800,
          tags: ["vegetarian"],
          desc: "Arroz, mozzarella, pesto",
          imageUrl: "https://i.pinimg.com/1200x/37/92/4a/37924a08b4a1824a80190c2e4a3d21cf.jpg"
        },
        {
          name: "Ramen al Pesto",
          price: 6700,
          tags: ["vegetarian", "gluten-free"],
          imageUrl: "https://i.pinimg.com/1200x/fa/0c/ea/fa0cea9eb8f332237b54ede61a7fcac0.jpg"
        }
      ]
    },
    {
      category: "Sin TACC",
      items: [
        {
          name: "Risotto Funghi (sin TACC)",
          price: 7300,
          tags: ["gluten-free", "vegetarian"],
          imageUrl: "https://i.pinimg.com/736x/d5/72/09/d5720977c8c8b0a77d05e3eaece65313.jpg"
        }
      ]
    }
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
