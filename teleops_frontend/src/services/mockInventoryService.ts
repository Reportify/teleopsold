// Minimal mock inventory service using localStorage

export type MockCategory = {
  id: number;
  name: string;
  unit_of_measurement?: string;
  requires_serial_number?: boolean;
};

export type MockModel = {
  id: number;
  category_id: number;
  category_name: string;
  model_name: string;
  manufacturer?: string;
};

type InventoryStore = {
  categories: MockCategory[];
  models: MockModel[];
  nextCategoryId: number;
  nextModelId: number;
};

const STORAGE_KEY = "mock_inventory";

function initStore(): InventoryStore {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return JSON.parse(existing);
  const seed: InventoryStore = {
    categories: [
      { id: 1, name: "CABINET", unit_of_measurement: "Unit", requires_serial_number: false },
      { id: 2, name: "ANTENNA", unit_of_measurement: "Unit", requires_serial_number: false },
    ],
    models: [
      { id: 1, category_id: 1, category_name: "CABINET", model_name: "RBS-2964", manufacturer: "Ericsson" },
      { id: 2, category_id: 2, category_name: "ANTENNA", model_name: "Sector-Antenna-900" },
    ],
    nextCategoryId: 3,
    nextModelId: 3,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function read(): InventoryStore {
  return initStore();
}

function write(store: InventoryStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export const mockInventoryService = {
  getSuggestions: async (q: string, limit = 10) => {
    const store = read();
    const qLower = q.trim().toLowerCase();
    const categories = store.categories.filter((c) => !qLower || c.name.toLowerCase().includes(qLower)).slice(0, limit);
    const models = store.models
      .filter((m) => !qLower || m.model_name.toLowerCase().includes(qLower) || m.category_name.toLowerCase().includes(qLower) || (m.manufacturer || "").toLowerCase().includes(qLower))
      .slice(0, limit);
    return { categories, models };
  },

  ensureCategory: async (name: string) => {
    const store = read();
    const existing = store.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const created: MockCategory = {
      id: store.nextCategoryId++,
      name,
      unit_of_measurement: "Unit",
      requires_serial_number: false,
    };
    store.categories.push(created);
    write(store);
    return created;
  },

  createModel: async (categoryName: string, modelName: string, manufacturer?: string) => {
    const store = read();
    let category = store.categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!category) {
      category = await mockInventoryService.ensureCategory(categoryName);
    }
    const created: MockModel = {
      id: store.nextModelId++,
      category_id: category.id,
      category_name: category.name,
      model_name: modelName,
      manufacturer,
    };
    store.models.push(created);
    write(store);
    return created;
  },

  existsCategoryByName: (name?: string) => {
    if (!name) return true; // optional field
    const store = read();
    return !!store.categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  },

  existsModelByName: (categoryName?: string, modelName?: string) => {
    if (!modelName) return true; // optional field
    const store = read();
    return !!store.models.find((m) => m.model_name.toLowerCase() === modelName.toLowerCase() && (!categoryName || m.category_name.toLowerCase() === categoryName.toLowerCase()));
  },
};

