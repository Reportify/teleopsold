import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
  Breadcrumbs,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  useTheme,
  Tabs,
  Tab,
  InputAdornment,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Popover,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PublishIcon from "@mui/icons-material/Publish";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import HistoryIcon from "@mui/icons-material/History";
// dnd-kit for smooth drag-and-drop reordering of category cards
import { DndContext, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { mockDesignService, DesignItem, DesignVersion } from "../services/mockDesignService";
import designService from "../services/designService";
import { mockInventoryService } from "../services/mockInventoryService";
import equipmentService from "../services/equipmentService";
import projectService from "../services/projectService";

type Suggestion = { type: "category"; id: number; label: string } | { type: "model"; id: number; label: string; categoryName: string; manufacturer?: string };

const ProjectDesignPage: React.FC = () => {
  const { id: projectIdParam } = useParams();
  const navigate = useNavigate();
  const projectId = projectIdParam || "demo";

  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DesignVersion | null>(null);
  const [latestPublished, setLatestPublished] = useState<DesignVersion | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const theme = useTheme();

  // Quick add and suggestions
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggest, setIsLoadingSuggest] = useState(false);
  const [rightTab, setRightTab] = useState<"categories" | "equipments">("categories");
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterManufacturer, setFilterManufacturer] = useState<string>("");
  const [dragOverCategoryId, setDragOverCategoryId] = useState<number | null>(null);
  const [dragInsertPosition, setDragInsertPosition] = useState<"before" | "after">("before");
  // Clone from published modal state
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneVersions, setCloneVersions] = useState<DesignVersion[]>([]);
  const [cloneSelected, setCloneSelected] = useState<DesignVersion | null>(null);
  // Track server-saved draft to drive Close/Delete UI
  const [serverDraft, setServerDraft] = useState<any | null>(null);
  const [serverDraftFingerprint, setServerDraftFingerprint] = useState<string | null>(null);

  const fingerprint = useCallback((items?: any[]) => {
    const arr = (items || [])
      .map((it: any) => ({
        n: String(it.item_name || it.model || ""),
        c: String(it.category || ""),
        m: String(it.model || ""),
        f: String(it.manufacturer || ""),
        a: it.attributes ? JSON.stringify(it.attributes) : "",
        r: String(it.remarks || ""),
        s: Number(typeof it.sort_order === "number" ? it.sort_order : 0),
        k: Boolean(it.is_category),
      }))
      .sort((a, b) => a.s - b.s || a.n.localeCompare(b.n));
    return JSON.stringify(arr);
  }, []);

  const load = useCallback(async () => {
    // If a local draft exists, prefer local (user is editing). Avoid overwriting it with server hydration.
    const localVs = await mockDesignService.listVersions(projectId);
    const localDraft = localVs.find((v) => v.status === "draft") || null;
    if (localDraft) {
      setVersions(localVs);
      setCurrentDraft(localDraft);
      setLatestPublished(localVs.find((v) => v.status === "published") || null);
      // Also probe server to know if a server draft exists
      try {
        const sv = await designService.listVersions(projectId);
        const sd: any = (sv || []).find((v: any) => v.status === "draft") || null;
        setServerDraft(sd);
        setServerDraftFingerprint(sd ? fingerprint(sd.items || []) : null);
      } catch {
        setServerDraft(null);
        setServerDraftFingerprint(null);
      }
      return;
    }

    // Otherwise prefer server and hydrate local cache
    try {
      const serverVersions = await designService.listVersions(projectId);
      if (serverVersions && serverVersions.length) {
        await mockDesignService.hydrateFromServer(projectId, serverVersions as any);
        const mapped: any[] = (serverVersions || []).map((v: any) => ({
          id: v.id,
          version_number: v.version_number,
          status: v.status,
          items: v.items || [],
          created_at: v.created_at,
          published_at: v.published_at || undefined,
        }));
        setVersions(mapped as any);
        const sdLocal = (mapped as any).find((v: any) => v.status === "draft") || null;
        setCurrentDraft(sdLocal);
        setLatestPublished((mapped as any).find((v: any) => v.status === "published") || null);
        const sd: any = (serverVersions || []).find((v: any) => v.status === "draft") || null;
        setServerDraft(sd);
        setServerDraftFingerprint(sd ? fingerprint(sd.items || []) : null);
        return;
      }
    } catch {
      // fall back to local if server unavailable
    }
    setVersions(localVs);
    setCurrentDraft(localDraft);
    setLatestPublished(localVs.find((v) => v.status === "published") || null);
    setServerDraft(null);
    setServerDraftFingerprint(null);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load project name for breadcrumbs
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const proj = await projectService.retrieve(projectId);
        setProjectName(proj.name);
      } catch {
        setProjectName("");
      }
    };
    void fetchProject();
  }, [projectId]);

  const createDraft = useCallback(async (): Promise<DesignVersion | null> => {
    const draft = await mockDesignService.createDraft(projectId, latestPublished?.id);
    setCurrentDraft(draft);
    return draft ?? null;
  }, [projectId, latestPublished]);

  const onAddItem = useCallback(
    async (baseName: string, chosen?: Suggestion) => {
      let draft = currentDraft;
      if (!draft) {
        draft = await createDraft();
      }
      if (!draft) return;
      const base: Partial<DesignItem> = { item_name: baseName } as any;
      if (chosen?.type === "category") base.category = chosen.label;
      if (chosen?.type === "model") {
        const FALLBACK_CATEGORY = "Uncategorized";
        const targetCategory = (chosen.categoryName || "").trim() || FALLBACK_CATEGORY;
        // Ensure header exists for target category
        const hasHeader = (draft.items || []).some(
          (it: any) => it.is_category && (String(it.item_name || "").toLowerCase() === targetCategory.toLowerCase() || String(it.category || "").toLowerCase() === targetCategory.toLowerCase())
        );
        if (!hasHeader) {
          await mockDesignService.addCategory(projectId, draft.id, targetCategory);
        }
        base.model = chosen.label;
        base.category = targetCategory;
        if (chosen.manufacturer) base.manufacturer = chosen.manufacturer;
      }
      await mockDesignService.addItem(projectId, draft.id, base as any);
      setQuery("");
      await load();
    },
    [currentDraft, projectId, load, createDraft]
  );

  const onReorder = async (index: number, dir: -1 | 1) => {
    if (!currentDraft) return;
    const target = index + dir;
    if (target < 0 || target >= currentDraft.items.length) return;
    await mockDesignService.reorderItems(projectId, currentDraft.id, index, target);
    await load();
  };

  // Reorder categories using drag-and-drop
  const onCategoryDragStart = (catId: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-category-id", String(catId));
    e.dataTransfer.effectAllowed = "move";
  };
  const onCategoryDragOverReorder = (targetCatId: number) => (e: React.DragEvent) => {
    const payload = e.dataTransfer.getData("application/x-category-id");
    if (payload) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverCategoryId !== targetCatId) setDragOverCategoryId(targetCatId);
    }
  };
  const onCategoryDropReorder = (targetCatId: number) => async (e: React.DragEvent) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData("application/x-category-id");
    setDragOverCategoryId(null);
    if (!payload || !currentDraft) return;
    const sourceId = Number(payload);
    if (!sourceId || sourceId === targetCatId) return;
    // Compute source and target indices among draft items
    const cats = currentDraft.items.map((it: any, idx: number) => ({ id: it.id, isCategory: !!it.is_category, idx })).filter((c: any) => c.isCategory);
    const from = cats.find((c: any) => c.id === sourceId);
    const to = cats.find((c: any) => c.id === targetCatId);
    if (!from || !to) return;
    await mockDesignService.reorderItems(projectId, currentDraft.id, from.idx, to.idx);
    await load();
  };

  const onRemove = async (itemId: number) => {
    if (!currentDraft) return;
    await mockDesignService.removeItem(projectId, currentDraft.id, itemId);
    await load();
  };

  const onPublish = async () => {
    if (!currentDraft) return;
    try {
      // Publish on server
      const resp = await designService.publish(projectId, currentDraft.id as any);
      // After publish, remove any local draft and refresh from server
      await mockDesignService.deleteDraft(projectId);
      await load();
      setToast({ open: true, message: `Published v${resp.version_number}`, severity: "success" });
    } catch (e: any) {
      setToast({ open: true, message: "Failed to publish. Ensure at least one item is present and you have not exceeded 5 published versions.", severity: "error" });
    }
  };

  // Suggestions - first try real equipment API, fallback to mock
  useEffect(() => {
    let active = true;
    const work = async () => {
      setIsLoadingSuggest(true);
      try {
        const resp = await equipmentService.list({ search: query, page_size: 20 });
        const results = Array.isArray(resp) ? resp : resp.results;
        const mappedModels = (results || []).map((i: any) => ({
          type: "model" as const,
          id: i.id,
          label: i.name || i.material_code,
          categoryName: i.category || "",
          manufacturer: i.manufacturer || "",
        }));
        // derive categories from results
        const uniqueCats = Array.from(new Set((results || []).map((i: any) => i.category).filter(Boolean)));
        const mappedCategories = uniqueCats.map((name, idx) => ({ type: "category" as const, id: idx + 1, label: String(name) }));
        if (!active) return;
        setSuggestions([...mappedCategories, ...mappedModels].slice(0, 12));
      } catch (e) {
        // fallback to mock data
        const { categories, models } = await mockInventoryService.getSuggestions(query, 8);
        if (!active) return;
        const mapped: Suggestion[] = [
          ...categories.map((c) => ({ type: "category", id: c.id, label: c.name } as Suggestion)),
          ...models.map((m) => ({ type: "model", id: m.id, label: m.model_name, categoryName: m.category_name, manufacturer: m.manufacturer } as Suggestion)),
        ];
        setSuggestions(mapped);
      } finally {
        if (active) setIsLoadingSuggest(false);
      }
    };
    void work();
    return () => {
      active = false;
    };
  }, [query]);

  // Load right palette lists (categories and equipment) using Equipment API; fallback to mock
  useEffect(() => {
    const loadPalette = async () => {
      try {
        // Equipments list (single page for browsing)
        const firstPage = await equipmentService.list({ search: equipmentSearch, category: filterCategory || undefined, manufacturer: filterManufacturer || undefined, page_size: 50, page: 1 });
        const results = Array.isArray(firstPage) ? firstPage : firstPage.results;
        setEquipmentList(results || []);

        // Categories via dedicated backend endpoint
        const respCats = await equipmentService.categories(equipmentSearch);
        setCategoriesList(respCats.categories || []);
      } catch {
        const { categories, models } = await mockInventoryService.getSuggestions(equipmentSearch, 50);
        setEquipmentList(models.map((m) => ({ id: m.id, name: m.model_name, category: m.category_name, manufacturer: m.manufacturer })));
        setCategoriesList(categories.map((c) => c.name));
      }
    };
    void loadPalette();
  }, [equipmentSearch, filterCategory, filterManufacturer]);

  const addCategoryByName = useCallback(
    async (name: string) => {
      let draft = currentDraft;
      if (!draft) draft = await createDraft();
      if (!draft) return;
      await mockDesignService.addCategory(projectId, draft.id, name);
      await load();
    },
    [currentDraft, createDraft, projectId, load]
  );

  // Drag-and-drop helpers
  const onDragStartCategory = (name: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ kind: "category", name }));
  };
  const onDragStartEquipment = (item: any) => (e: React.DragEvent) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ kind: "model", id: item.id, name: item.name || item.material_code, category: item.category || "", manufacturer: item.manufacturer || "" })
    );
  };
  const onCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.kind === "category") {
        await addCategoryByName(parsed.name);
      } else if (parsed.kind === "model") {
        warn("Drop equipment onto a category to add it");
      }
    } catch {
      // ignore
    }
  };

  // Drag-to-reorder helpers for category cards
  const onCategoryCardDragStart = (catId: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-category-id", String(catId));
    e.dataTransfer.effectAllowed = "move";
  };
  const onCategoryCardDragOver = (targetCatId: number) => (e: React.DragEvent) => {
    const payload = e.dataTransfer.getData("application/x-category-id");
    if (payload) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      setDragInsertPosition(before ? "before" : "after");
      if (dragOverCategoryId !== targetCatId) setDragOverCategoryId(targetCatId);
    }
  };

  // Unified drop handler for a category card: supports reordering and equipment drops
  const onCategoryCardDrop = (catId: number, categoryName: string) => async (e: React.DragEvent) => {
    e.preventDefault();
    // Reorder if a category id is being dragged
    const movingId = e.dataTransfer.getData("application/x-category-id");
    setDragOverCategoryId(null);
    if (movingId && currentDraft) {
      const sourceId = Number(movingId);
      if (sourceId && sourceId !== catId) {
        const cats = currentDraft.items.map((it: any, idx: number) => ({ id: it.id, isCategory: !!it.is_category, idx })).filter((c: any) => c.isCategory);
        const from = cats.find((c: any) => c.id === sourceId);
        const to = cats.find((c: any) => c.id === catId);
        if (from && to) {
          await mockDesignService.reorderItems(projectId, currentDraft.id, from.idx, to.idx);
          await load();
          return;
        }
      }
    }
    // Otherwise, treat as equipment drop
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.kind === "model") {
        const exists = (currentDraft?.items || []).some(
          (it: any) =>
            !it.is_category && String(it.category || "").toLowerCase() === categoryName.toLowerCase() && String(it.item_name || it.model || "").toLowerCase() === String(parsed.name).toLowerCase()
        );
        if (exists) return warn(`Equipment "${parsed.name}" already exists in ${categoryName}`);
        await onAddItem(parsed.name, { type: "model", id: parsed.id, label: parsed.name, categoryName: categoryName, manufacturer: parsed.manufacturer });
      } else if (parsed.kind === "category") {
        warn("Category already exists. You can only add equipment here.");
      }
    } catch {
      // ignore
    }
  };

  const onInlineCreateCategory = async (name: string) => {
    await mockInventoryService.ensureCategory(name);
    const { categories } = await mockInventoryService.getSuggestions(name, 1);
    if (categories[0]) await onAddItem(categories[0].name, { type: "category", id: categories[0].id, label: categories[0].name });
  };

  const onInlineCreateModel = async (categoryName: string, modelName: string) => {
    const created = await mockInventoryService.createModel(categoryName, modelName);
    await onAddItem(created.model_name, { type: "model", id: created.id, label: created.model_name, categoryName: created.category_name });
  };

  const viewItems = useMemo(() => (currentDraft ? currentDraft.items : latestPublished?.items || []), [currentDraft, latestPublished]);
  const draftItemCount = currentDraft ? currentDraft.items.length : 0;
  const canEdit = Boolean(currentDraft);
  const normalizeCategory = (s?: string) => {
    const n = (s || "").toString().trim();
    return n.length ? n : "Uncategorized";
  };
  const itemsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    (viewItems.filter((i: any) => !i.is_category) as any[]).forEach((it: any) => {
      const key = normalizeCategory(it.category);
      if (!map[key]) map[key] = [];
      map[key].push(it);
    });
    return map;
  }, [viewItems]);
  const categoryItems = useMemo(() => {
    const headers = (viewItems.filter((i: any) => i.is_category) as any[]).sort((a: any, b: any) => a.sort_order - b.sort_order);
    const headerNames = new Set(headers.map((h: any) => String(h.item_name || h.category || "").toLowerCase()));
    const missing: any[] = [];
    let nextOrder = headers.length;
    Object.keys(itemsByCategory).forEach((cat) => {
      const name = normalizeCategory(cat);
      if (!headerNames.has(name.toLowerCase())) {
        const synthId = -Math.abs(name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 1000);
        missing.push({ id: synthId, item_name: name, is_category: true, isSynthetic: true, sort_order: nextOrder++ });
      }
    });
    return [...headers, ...missing].sort((a: any, b: any) => a.sort_order - b.sort_order);
  }, [viewItems, itemsByCategory]);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "warning" | "success" | "info" | "error" }>({ open: false, message: "", severity: "warning" });
  const warn = (message: string) => setToast({ open: true, message, severity: "warning" });
  const [isSaving, setIsSaving] = useState(false);

  const saveDraftToBackend = useCallback(async () => {
    if (!currentDraft || draftItemCount === 0 || isSaving) return;
    try {
      setIsSaving(true);
      // 1) Create a backend draft version
      const newVersion = await designService.createVersion(projectId, {});
      // 2) Persist items in current order via bulk
      const sorted = [...currentDraft.items].sort((a: any, b: any) => a.sort_order - b.sort_order);
      const payload = sorted.map((it: any, idx: number) => ({
        item_name: String(it.item_name || it.model || ""),
        equipment_code: it.equipment_code || "",
        category: it.is_category ? "" : it.category || "",
        model: it.model || "",
        manufacturer: it.manufacturer || "",
        attributes: it.attributes || null,
        remarks: it.remarks || "",
        is_category: Boolean(it.is_category),
        sort_order: idx,
      }));
      await designService.bulkCreateItems(projectId, newVersion.id, payload, { replace: true });
      // Refresh draft state from backend for the new version so UI shows server data
      const serverItems = await designService.listItems(projectId, newVersion.id);

      // Remove local mock draft and replace in-memory state with server versions/items
      await mockDesignService.deleteDraft(projectId);

      // Load all versions from server and sync local state
      const serverVersions = await designService.listVersions(projectId);
      // Map server versions to local shape used in the page
      const mapped: any[] = (serverVersions || []).map((v: any) => ({
        id: v.id,
        version_number: v.version_number,
        status: v.status,
        items: v.items || [],
        created_at: v.created_at,
        published_at: v.published_at || undefined,
      }));
      setVersions(mapped as any);

      const latestPub: any = (serverVersions || []).find((v: any) => v.status === "published") || null;
      setLatestPublished(latestPub as any);

      setCurrentDraft({ id: newVersion.id, version_number: newVersion.version_number, status: "draft", items: serverItems, created_at: newVersion.created_at } as any);
      setServerDraft({ id: newVersion.id, version_number: newVersion.version_number, status: "draft", items: serverItems });
      setServerDraftFingerprint(fingerprint(serverItems));
      setToast({ open: true, message: "Draft saved to server", severity: "success" });
    } catch (e: any) {
      console.error(e);
      setToast({ open: true, message: "Failed to save draft", severity: "error" });
    } finally {
      setIsSaving(false);
    }
  }, [currentDraft, draftItemCount, isSaving, projectId, fingerprint]);

  const isEquipmentExisting = useCallback(
    (name?: string, category?: string) => {
      const draft = currentDraft?.items || [];
      if (!name) return false;
      const n = String(name).toLowerCase();
      const c = String(category || "").toLowerCase();
      return draft.some((it: any) => !it.is_category && String(it.item_name || it.model || "").toLowerCase() === n && String(it.category || "").toLowerCase() === c);
    },
    [currentDraft]
  );

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Sortable item wrapper for category card
  const SortableCategory: React.FC<{ id: number; children: React.ReactNode }> = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.75 : 1,
      cursor: "grab",
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    );
  };

  const onCategoriesDragEnd = async (event: DragEndEvent) => {
    if (!currentDraft) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Map category ids to indices in draft items
    const list = currentDraft.items.map((it: any, idx: number) => ({ id: it.id, isCategory: !!it.is_category, idx })).filter((c: any) => c.isCategory);
    const from = list.find((c) => String(c.id) === String(active.id));
    const to = list.find((c) => String(c.id) === String(over.id));
    if (!from || !to) return;
    await mockDesignService.reorderItems(projectId, currentDraft.id, from.idx, to.idx);
    await load();
  };

  return (
    <Box p={2}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${projectId}`}>{projectName || "Project"}</Link>
        <Typography color="text.primary">Design</Typography>
      </Breadcrumbs>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Button
            variant="outlined"
            onClick={async () => {
              // If a draft exists with unsaved edits, ask to save as draft
              if (currentDraft && currentDraft.items.length > 0) {
                const shouldSave = window.confirm("Save current design as a draft before leaving?");
                if (!shouldSave) {
                  await mockDesignService.deleteDraft(projectId);
                }
              }
              navigate(`/projects/${projectId}`);
            }}
          >
            Back to Project
          </Button>
          <Typography variant="h5">Project Design</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={async () => {
              const draft = await createDraft();
              if (!draft) return;
              await mockDesignService.setDraftItems(projectId, draft.id, [] as any);
              await load();
              setToast({ open: true, message: "Blank draft created", severity: "success" });
            }}
          >
            Create New
          </Button>
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={async () => {
              const published = await mockDesignService.listPublished(projectId);
              setCloneVersions(published);
              setCloneSelected(published[0] || null);
              setCloneOpen(true);
            }}
          >
            Clone from Published
          </Button>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => navigate(`/projects/${projectId}/design/history`)}>
            Version History
          </Button>
          {/* Edit/Save/Close live in the design container header (not here) */}
          <Button variant="contained" startIcon={<PublishIcon />} disabled={!currentDraft || draftItemCount === 0} onClick={() => void onPublish()}>
            Publish
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box flex={1} onDragOver={(e) => e.preventDefault()} onDrop={onCanvasDrop}>
          <Card>
            <CardContent sx={{ position: "relative" }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                {currentDraft ? <Chip label={`Draft v${currentDraft.version_number}`} /> : <Chip label="No Draft" color="warning" />}
                {latestPublished && <Chip label={`Published v${latestPublished.version_number}`} color="success" />}
                {!currentDraft && latestPublished && <Chip label="Viewing published" size="small" />}
              </Stack>

              {/* Absolute-positioned action icons at top-right of design container */}
              <Box sx={{ position: "absolute", right: 32, top: 8, display: "flex", gap: 2 }}>
                {!canEdit && latestPublished && (
                  <Stack alignItems="center" spacing={0.25}>
                    <IconButton
                      size="small"
                      title="Edit"
                      onClick={async () => {
                        const d = await createDraft();
                        if (!d) return;
                        await mockDesignService.setDraftItems(projectId, d.id, latestPublished.items as any);
                        await load();
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="caption">Edit</Typography>
                  </Stack>
                )}
                {canEdit && (
                  <>
                    <Stack alignItems="center" spacing={0.25}>
                      <IconButton size="small" title="Save draft" onClick={() => void saveDraftToBackend()} disabled={isSaving}>
                        <SaveOutlinedIcon fontSize="small" />
                      </IconButton>
                      <Typography variant="caption">{isSaving ? "Saving…" : "Save"}</Typography>
                    </Stack>
                    {(!serverDraft || (serverDraft && fingerprint(currentDraft?.items) !== serverDraftFingerprint)) && (
                      <Stack alignItems="center" spacing={0.25}>
                        <IconButton
                          size="small"
                          title={!serverDraft ? "Close (discard and show published)" : "Revert to saved draft"}
                          onClick={async () => {
                            if (!currentDraft) return;
                            if (!serverDraft) {
                              const ok = window.confirm("Discard local changes and return to published view?");
                              if (!ok) return;
                              await mockDesignService.deleteDraft(projectId);
                              await load();
                              return;
                            }
                            const ok = window.confirm("Revert local changes to last saved server draft?");
                            if (!ok) return;
                            const sv = await designService.listVersions(projectId);
                            const sd: any = (sv || []).find((v: any) => v.status === "draft");
                            if (sd) {
                              await mockDesignService.hydrateFromServer(projectId, sv as any);
                              setVersions(sv as any);
                              setCurrentDraft({ ...(sd as any), items: (sd as any).items || [] } as any);
                              setServerDraft(sd);
                              setServerDraftFingerprint(fingerprint(sd.items || []));
                              setToast({ open: true, message: "Reverted to saved draft", severity: "success" });
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption">{!serverDraft ? "Close" : "Revert"}</Typography>
                      </Stack>
                    )}
                    {serverDraft && (
                      <Stack alignItems="center" spacing={0.25}>
                        <IconButton
                          size="small"
                          title="Delete draft"
                          onClick={async () => {
                            if (!currentDraft) return;
                            const ok = window.confirm("Delete this draft permanently?");
                            if (!ok) return;
                            try {
                              await designService.deleteDraft(projectId, (serverDraft as any).id);
                              await mockDesignService.deleteDraft(projectId);
                              setServerDraft(null);
                              setServerDraftFingerprint(null);
                              await load();
                              setToast({ open: true, message: "Draft deleted", severity: "success" });
                            } catch (e) {
                              setToast({ open: true, message: "Failed to delete draft", severity: "error" });
                            }
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption">Delete</Typography>
                      </Stack>
                    )}
                  </>
                )}
              </Box>

              {/* Design canvas as stacked category cards */}
              <Box
                sx={{
                  minHeight: "70vh",
                  maxHeight: "calc(100vh - 300px)",
                  overflowY: "auto",
                  pr: 1,
                  backgroundColor: theme.palette.mode === "light" ? "#fafafa" : "#0b1220",
                  borderRadius: 1.5,
                  border: `1px dashed ${theme.palette.divider}`,
                  p: 1.5,
                }}
              >
                {categoryItems.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 4,
                      textAlign: "center",
                      color: "text.secondary",
                      borderRadius: 2,
                      border: `1px dashed ${theme.palette.divider}`,
                      background: theme.palette.mode === "light" ? "#fff" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Start your design
                    </Typography>
                    <Typography variant="body2">Drag a category from the right panel and drop here. Then drop equipments into the category.</Typography>
                  </Paper>
                ) : canEdit ? (
                  <>
                    <DndContext sensors={sensors} onDragEnd={onCategoriesDragEnd}>
                      <SortableContext items={categoryItems.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        <Stack spacing={2}>
                          {categoryItems.map((cat, catIdx) => (
                            <SortableCategory key={cat.id} id={cat.id}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  border: `1px solid ${theme.palette.divider}`,
                                  background: theme.palette.mode === "light" ? "#fff" : "rgba(255,255,255,0.03)",
                                  transition: "box-shadow 120ms ease",
                                  "&:hover": { boxShadow: theme.shadows[2] },
                                  position: "relative",
                                }}
                                onDrop={onCategoryCardDrop(cat.id, cat.item_name)}
                              >
                                {/* Top placeholder while dragging over upper half */}
                                {dragOverCategoryId === cat.id && dragInsertPosition === "before" && (
                                  <Box sx={{ height: 12, borderRadius: 1, border: `2px dashed ${theme.palette.primary.main}`, mb: 1 }} />
                                )}
                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  sx={{ mb: 1, outline: dragOverCategoryId === cat.id ? `2px dashed ${theme.palette.primary.main}` : "none", outlineOffset: 2 }}
                                >
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <DragIndicatorIcon fontSize="small" sx={{ color: "text.disabled" }} />
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                      {cat.item_name}
                                    </Typography>
                                    <Chip size="small" label={(itemsByCategory[cat.item_name]?.length || 0) + " items"} />
                                  </Stack>
                                  <Stack direction="row" spacing={0.5} className="cardActions" sx={{ opacity: 0.8 }}>
                                    <Tooltip title="Move up">
                                      <span>
                                        <IconButton size="small" onClick={() => void onReorder(catIdx, -1)} disabled={catIdx === 0}>
                                          <ArrowUpwardIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Move down">
                                      <span>
                                        <IconButton size="small" onClick={() => void onReorder(catIdx, 1)} disabled={catIdx === categoryItems.length - 1}>
                                          <ArrowDownwardIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                    <Tooltip title="Remove category">
                                      <IconButton size="small" color="error" onClick={() => void onRemove(cat.id)}>
                                        <DeleteOutlineIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>

                                <Box
                                  sx={{
                                    pl: { xs: 0, md: 1 },
                                    py: 1,
                                    borderRadius: 1.5,
                                    border: itemsByCategory[cat.item_name]?.length ? "none" : `1px dashed ${theme.palette.divider}`,
                                    background: itemsByCategory[cat.item_name]?.length ? "transparent" : theme.palette.mode === "light" ? "#fafafa" : "rgba(255,255,255,0.02)",
                                    textAlign: itemsByCategory[cat.item_name]?.length ? "left" : "center",
                                  }}
                                >
                                  {itemsByCategory[cat.item_name]?.length ? (
                                    <Stack spacing={0.75}>
                                      {itemsByCategory[cat.item_name].map((it) => (
                                        <Stack key={it.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.25 }}>
                                          <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                              {it.item_name || it.model}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              {it.manufacturer || ""}
                                            </Typography>
                                          </Box>
                                          <IconButton size="small" color="error" onClick={() => void onRemove(it.id)}>
                                            <DeleteOutlineIcon fontSize="small" />
                                          </IconButton>
                                        </Stack>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      Drop equipment here
                                    </Typography>
                                  )}
                                </Box>
                                {/* Bottom placeholder while dragging over lower half */}
                                {dragOverCategoryId === cat.id && dragInsertPosition === "after" && (
                                  <Box sx={{ height: 12, borderRadius: 1, border: `2px dashed ${theme.palette.primary.main}`, mt: 1 }} />
                                )}
                              </Paper>
                            </SortableCategory>
                          ))}
                        </Stack>
                      </SortableContext>
                    </DndContext>
                    {/* Bottom drop zone to add more categories */}
                    <Box
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onCanvasDrop}
                      sx={{
                        mt: 1,
                        p: 2,
                        borderRadius: 1.5,
                        textAlign: "center",
                        color: "text.secondary",
                        border: `1px dashed ${theme.palette.divider}`,
                        background: theme.palette.mode === "light" ? "#fff" : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Typography variant="body2">Drag more categories here to add</Typography>
                    </Box>
                  </>
                ) : (
                  // View-only rendering of categories when not editing
                  <Stack spacing={2}>
                    {categoryItems.map((cat) => (
                      <Paper key={cat.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {cat.item_name}
                            </Typography>
                            <Chip size="small" label={(itemsByCategory[cat.item_name]?.length || 0) + " items"} />
                          </Stack>
                        </Stack>
                        <Box>
                          {(itemsByCategory[cat.item_name] || []).length ? (
                            <Stack spacing={0.5}>
                              {itemsByCategory[cat.item_name].map((it) => (
                                <Typography key={it.id} variant="body2">
                                  {it.item_name || it.model}
                                </Typography>
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No items.
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Version History card removed in favor of dedicated page */}
        </Box>

        {/* Right panel: overview + palette */}
        <Box width={{ xs: "100%", md: 380 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Overview
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">Draft items: {draftItemCount}</Typography>
                <Typography variant="body2">Latest published: {latestPublished ? new Date(latestPublished.published_at || latestPublished.created_at).toLocaleString() : "—"}</Typography>
              </Stack>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Tabs value={rightTab} onChange={(_, v) => setRightTab(v)} variant="fullWidth">
                <Tab value="categories" label="Categories" />
                <Tab value="equipments" label="Equipments" />
              </Tabs>
              <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={rightTab === "categories" ? "Search categories…" : "Search equipment…"}
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                  {rightTab === "equipments" && (
                    <IconButton size="small" onClick={(e) => setFilterAnchor(e.currentTarget)} aria-label="Filters">
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  )}
                </Stack>

                {/* Categories list */}
                {rightTab === "categories" && (
                  <List dense sx={{ mt: 1, maxHeight: 380, overflow: "auto" }}>
                    {categoriesList.map((c) => (
                      <ListItem key={c} disablePadding>
                        <ListItemButton onClick={() => addCategoryByName(c)} onDragStart={onDragStartCategory(c)} draggable>
                          <ListItemText primary={c} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                    {categoriesList.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No categories found
                      </Typography>
                    )}
                  </List>
                )}

                {/* Equipments list */}
                {rightTab === "equipments" && (
                  <List dense sx={{ mt: 1, maxHeight: 380, overflow: "auto" }}>
                    {equipmentList.map((e) => (
                      <ListItem
                        key={e.id}
                        secondaryAction={(() => {
                          const exists = isEquipmentExisting(e.name || e.material_code, e.category);
                          return (
                            <Button
                              size="small"
                              disabled={exists}
                              onClick={() => {
                                if (exists) {
                                  warn("Equipment already added in design");
                                  return;
                                }
                                onAddItem(e.name || e.material_code, { type: "model", id: e.id, label: e.name || e.material_code, categoryName: e.category || "", manufacturer: e.manufacturer });
                              }}
                            >
                              {exists ? "Added" : "Add"}
                            </Button>
                          );
                        })()}
                        disablePadding
                      >
                        <ListItemButton draggable onDragStart={onDragStartEquipment(e)} selected={isEquipmentExisting(e.name || e.material_code, e.category)}>
                          <ListItemText
                            primaryTypographyProps={{ sx: { fontWeight: 600 } }}
                            primary={e.name || e.material_code}
                            secondary={`${e.category || ""}${e.manufacturer ? ` • ${e.manufacturer}` : ""}`}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                    {equipmentList.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No equipment found
                      </Typography>
                    )}
                  </List>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Filters popover */}
          <Popover
            open={Boolean(filterAnchor)}
            anchorEl={filterAnchor}
            onClose={() => setFilterAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <Box sx={{ p: 2, width: 280 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Filters</Typography>
                <IconButton size="small" onClick={() => setFilterAnchor(null)} aria-label="Close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select label="Category" value={filterCategory} onChange={(e) => setFilterCategory(String(e.target.value))}>
                  <MenuItem value="">All</MenuItem>
                  {categoriesList.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField fullWidth size="small" label="Manufacturer" value={filterManufacturer} onChange={(e) => setFilterManufacturer(e.target.value)} />
            </Box>
          </Popover>
        </Box>
      </Stack>
      {/* Clone from Published Modal */}
      <Dialog open={cloneOpen} onClose={() => setCloneOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Select a version to clone</DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <Box width={{ xs: "100%", md: 260 }}>
              <List dense>
                {cloneVersions.map((v) => (
                  <ListItem key={v.id} disablePadding>
                    <ListItemButton selected={cloneSelected?.id === v.id} onClick={() => setCloneSelected(v)}>
                      <ListItemText primary={`v${v.version_number}`} secondary={v.published_at ? new Date(v.published_at).toLocaleString() : ""} />
                    </ListItemButton>
                  </ListItem>
                ))}
                {cloneVersions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No published versions
                  </Typography>
                )}
              </List>
            </Box>
            <Box flex={1}>
              {!cloneSelected ? (
                <Typography variant="body2" color="text.secondary">
                  Select a version to preview.
                </Typography>
              ) : (
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    Preview v{cloneSelected.version_number}
                  </Typography>
                  {/* Simple grouped preview */}
                  {(() => {
                    const map: Record<string, string[]> = {};
                    (cloneSelected.items || []).forEach((it: any) => {
                      const key = it.category || "";
                      if (!map[key]) map[key] = [];
                      map[key].push(it.item_name);
                    });
                    const entries = Object.entries(map);
                    if (entries.length === 0)
                      return (
                        <Typography variant="body2" color="text.secondary">
                          No items.
                        </Typography>
                      );
                    return (
                      <Box>
                        {entries.map(([cat, names]) => (
                          <Box key={cat} sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                              {cat || "(Uncategorized)"}
                            </Typography>
                            <Stack sx={{ pl: 1 }}>
                              {names.map((n, i) => (
                                <Typography key={i} variant="body2">
                                  {n}
                                </Typography>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    );
                  })()}
                </Box>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneOpen(false)}>Close</Button>
          <Button
            variant="contained"
            disabled={!cloneSelected}
            onClick={async () => {
              if (!cloneSelected) return;
              const draft = await createDraft();
              if (!draft) return;
              await mockDesignService.setDraftItems(projectId, draft.id, cloneSelected.items as any);
              await load();
              setCloneOpen(false);
              setToast({ open: true, message: `Cloned v${cloneSelected.version_number} into draft`, severity: "success" });
            }}
          >
            Clone
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProjectDesignPage;
