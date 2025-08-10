// Minimal mock design versions/items service using localStorage

export type DesignItem = {
  id: number;
  item_name: string;
  category?: string;
  model?: string;
  manufacturer?: string;
  attributes?: Record<string, any>;
  remarks?: string;
  sort_order: number;
  is_category?: boolean;
};

export type DesignVersion = {
  id: number;
  version_number: number;
  status: "draft" | "published";
  items: DesignItem[];
  created_at: string;
  published_at?: string;
};

type Store = {
  versions: DesignVersion[];
  nextVersionId: number;
  nextItemId: number;
};

const STORAGE_KEY_PREFIX = "mock_design_";

function key(projectId: string) {
  return `${STORAGE_KEY_PREFIX}${projectId}`;
}

function initStore(projectId: string): Store {
  const existing = localStorage.getItem(key(projectId));
  if (existing) return JSON.parse(existing);
  const seed: Store = { versions: [], nextVersionId: 1, nextItemId: 1 };
  localStorage.setItem(key(projectId), JSON.stringify(seed));
  return seed;
}

function read(projectId: string): Store {
  return initStore(projectId);
}

function write(projectId: string, store: Store) {
  localStorage.setItem(key(projectId), JSON.stringify(store));
}

export const mockDesignService = {
  listVersions: async (projectId: string) => {
    const store = read(projectId);
    return store.versions.sort((a, b) => b.version_number - a.version_number);
  },

  listPublished: async (projectId: string) => {
    const all = await mockDesignService.listVersions(projectId);
    return all.filter((v) => v.status === "published");
  },

  getLatestPublished: async (projectId: string) => {
    const versions = await mockDesignService.listVersions(projectId);
    return versions.find((v) => v.status === "published");
  },

  createDraft: async (projectId: string, cloneFromId?: number) => {
    const store = read(projectId);
    // Enforce single-draft model
    const existingDraft = store.versions.find((v) => v.status === "draft");
    const baseItems = cloneFromId ? store.versions.find((v) => v.id === cloneFromId)?.items || [] : [];
    if (existingDraft) {
      // If draft already exists, refresh its items when a clone source is provided
      if (baseItems.length) {
        existingDraft.items = baseItems.map((it) => ({ ...it, id: store.nextItemId++ }));
        existingDraft.created_at = new Date().toISOString();
      }
      write(projectId, store);
      return existingDraft;
    }
    // Draft numbers should be derived from latest PUBLISHED only, so discarding a draft
    // does NOT increment the next draft's number.
    const latestPublished = store.versions.filter((v) => v.status === "published").reduce((m, v) => Math.max(m, v.version_number), 0);
    const nextVersionNumber = latestPublished + 1;
    const newVersion: DesignVersion = {
      id: store.nextVersionId++,
      version_number: nextVersionNumber,
      status: "draft",
      items: baseItems.map((it) => ({ ...it, id: store.nextItemId++ })),
      created_at: new Date().toISOString(),
    };
    store.versions.push(newVersion);
    write(projectId, store);
    return newVersion;
  },

  addItem: async (projectId: string, versionId: number, item: Omit<DesignItem, "id" | "sort_order">) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    const newItem: DesignItem = { id: store.nextItemId++, sort_order: version.items.length, ...item };
    version.items.push(newItem);
    write(projectId, store);
    return newItem;
  },

  addCategory: async (projectId: string, versionId: number, categoryName: string) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    // Avoid duplicate category headers
    const exists = version.items.find((it) => it.is_category && it.item_name.toLowerCase() === categoryName.toLowerCase());
    if (exists) return exists;
    const newItem: DesignItem = {
      id: store.nextItemId++,
      sort_order: version.items.length,
      item_name: categoryName,
      category: categoryName,
      is_category: true,
    };
    version.items.push(newItem);
    write(projectId, store);
    return newItem;
  },

  updateItem: async (projectId: string, versionId: number, itemId: number, update: Partial<DesignItem>) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    const idx = version.items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new Error("Item not found");
    version.items[idx] = { ...version.items[idx], ...update };
    write(projectId, store);
    return version.items[idx];
  },

  removeItem: async (projectId: string, versionId: number, itemId: number) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    const beforeCount = version.items.length;
    version.items = version.items.filter((i) => i.id !== itemId).map((it, i) => ({ ...it, sort_order: i }));
    if (version.items.length === beforeCount) throw new Error("Item not found");
    write(projectId, store);
    return version.items;
  },

  reorderItems: async (projectId: string, versionId: number, fromIndex: number, toIndex: number) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    const items = version.items;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    version.items = items.map((it, i) => ({ ...it, sort_order: i }));
    write(projectId, store);
    return version.items;
  },

  publish: async (projectId: string, versionId: number) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId);
    if (!version) throw new Error("Version not found");
    if (version.items.length === 0) throw new Error("At least one item required to publish");
    // Enforce at most 5 published versions per project
    const publishedCount = store.versions.filter((v) => v.status === "published").length;
    if (publishedCount >= 5) {
      throw new Error("Maximum 5 published versions reached. Please delete an older version to publish a new one.");
    }
    version.status = "published";
    version.published_at = new Date().toISOString();
    // Remove any other drafts after publish (single-draft model)
    store.versions = store.versions.filter((v) => v.status !== "draft" || v.id === version.id);
    write(projectId, store);
    return version;
  },

  // Replace all items in a draft with provided items (used for Cancel/Revert flows)
  setDraftItems: async (projectId: string, versionId: number, items: DesignItem[]) => {
    const store = read(projectId);
    const version = store.versions.find((v) => v.id === versionId && v.status === "draft");
    if (!version) throw new Error("Draft version not found");
    // Ensure sort_order sequence and maintain ids; bump nextItemId beyond max id
    const normalized = items.map((it, idx) => ({ ...it, sort_order: idx })).map((it) => ({ ...it }));
    version.items = normalized;
    const maxId = normalized.reduce((m, it) => Math.max(m, it.id || 0), 0);
    store.nextItemId = Math.max(store.nextItemId, maxId + 1);
    write(projectId, store);
    return version.items;
  },

  deleteVersion: async (projectId: string, versionId: number) => {
    const store = read(projectId);
    const idx = store.versions.findIndex((v) => v.id === versionId);
    if (idx === -1) throw new Error("Version not found");
    // Prevent deleting draft via this method
    if (store.versions[idx].status === "draft") throw new Error("Cannot delete draft using this action");
    store.versions.splice(idx, 1);
    write(projectId, store);
    return true;
  },

  deleteDraft: async (projectId: string) => {
    const store = read(projectId);
    const before = store.versions.length;
    store.versions = store.versions.filter((v) => v.status !== "draft");
    if (store.versions.length !== before) {
      // Recompute counters so discarded drafts don't keep bumping ids
      const maxVersionId = store.versions.reduce((m, v) => Math.max(m, v.id), 0);
      const maxItemId = store.versions.reduce((mv, v) => {
        const localMax = (v.items || []).reduce((mi, it) => Math.max(mi, it.id), 0);
        return Math.max(mv, localMax);
      }, 0);
      store.nextVersionId = maxVersionId + 1;
      store.nextItemId = maxItemId + 1;
      write(projectId, store);
    }
    return true;
  },
};
