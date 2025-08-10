// Equipment Page Component - Placeholder
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Autocomplete,
} from "@mui/material";
import { AddRounded, CloudUploadRounded, RefreshRounded, EditRounded, DeleteOutlineRounded, SearchRounded, FilterListRounded } from "@mui/icons-material";
import { apiHelpers, API_ENDPOINTS } from "../services/api";

type EquipmentItem = {
  id: number;
  name: string;
  material_code?: string;
  category?: string;
  sub_category?: string;
  manufacturer?: string;
  unit_of_measurement?: string;
  technologies?: string[];
};

const EquipmentPage: React.FC = () => {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<{ category?: string; manufacturer?: string; technology?: string }>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [form, setForm] = useState<EquipmentItem>({ id: 0, name: "", unit_of_measurement: "Unit", technologies: [] });
  const [techOptions, setTechOptions] = useState<string[]>([]);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: "success" | "error" | "info" } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: page + 1, page_size: rowsPerPage };
      if (search) params.search = search;
      if (filters.category) params.category = filters.category;
      if (filters.manufacturer) params.manufacturer = filters.manufacturer;
      if (filters.technology) params.technology = filters.technology;
      const resp = await apiHelpers.get<any>(API_ENDPOINTS.EQUIPMENT.ITEMS.LIST, { params });
      const results = Array.isArray(resp) ? resp : resp.results || [];
      const count = Array.isArray(resp) ? results.length : resp.count || results.length;
      setItems(results);
      setTotal(count);
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message || "Failed to load equipment", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [search, filters, page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiHelpers.get<any>(API_ENDPOINTS.EQUIPMENT.TECHNOLOGIES.LIST);
        const names = (Array.isArray(data?.results) ? data.results : data || []).map((t: any) => t.name);
        setTechOptions(names);
      } catch {}
    })();
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      setUploading(true);
      const result = await apiHelpers.post<any>(API_ENDPOINTS.EQUIPMENT.ITEMS.BULK_UPLOAD, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
      });
      const summary =
        typeof result === "object"
          ? `Created ${result?.created ?? 0}, Updated ${result?.updated ?? 0}, Skipped ${result?.skipped ?? 0}${result?.sheet_used ? ` (Sheet: ${result.sheet_used})` : ""}`
          : "Bulk upload completed";
      setSnack({ open: true, msg: summary, severity: "success" });
      setFile(null);
      setBulkOpen(false);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Upload failed";
      setSnack({ open: true, msg, severity: "error" });
    } finally {
      setUploading(false);
    }
  }, [file, load]);

  const rows = useMemo(
    () =>
      items.map((i) => (
        <tr key={i.id}>
          <td>{i.name}</td>
          <td>{i.material_code || "-"}</td>
          <td>{i.category || "-"}</td>
          <td>{i.sub_category || "-"}</td>
          <td>{i.manufacturer || "-"}</td>
          <td>{i.unit_of_measurement || "Unit"}</td>
          <td>
            {(i as any).technologies?.map((t: string) => (
              <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />
            ))}
          </td>
        </tr>
      )),
    [items]
  );

  const openEditor = (item?: EquipmentItem) => {
    const initial: EquipmentItem = item
      ? { ...item, technologies: item.technologies || [] }
      : { id: 0, name: "", material_code: "", category: "", sub_category: "", manufacturer: "", unit_of_measurement: "Unit", technologies: [] };
    setEditing(item || null);
    setForm(initial);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        material_code: form.material_code,
        category: form.category,
        sub_category: form.sub_category,
        manufacturer: form.manufacturer,
        unit_of_measurement: form.unit_of_measurement,
        technologies: form.technologies || [],
      } as any;
      if (editing) {
        await apiHelpers.put(API_ENDPOINTS.EQUIPMENT.ITEMS.UPDATE(String(editing.id)), payload);
        setSnack({ open: true, msg: "Item updated", severity: "success" });
      } else {
        await apiHelpers.post(API_ENDPOINTS.EQUIPMENT.ITEMS.CREATE, payload);
        setSnack({ open: true, msg: "Item created", severity: "success" });
      }
      setEditorOpen(false);
      await load();
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message || "Save failed", severity: "error" });
    }
  };

  const handleDelete = async (item: EquipmentItem) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await apiHelpers.delete(API_ENDPOINTS.EQUIPMENT.ITEMS.DELETE(String(item.id)));
      setSnack({ open: true, msg: "Item deleted", severity: "success" });
      await load();
    } catch (e: any) {
      setSnack({ open: true, msg: e?.message || "Delete failed", severity: "error" });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={600}>
          Equipment Inventory
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Create Item">
            <Button startIcon={<AddRounded />} variant="contained" onClick={() => openEditor()}>
              New
            </Button>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={load}>
              <RefreshRounded />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} p={2} alignItems={{ xs: "stretch", lg: "center" }}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: (<SearchRounded fontSize="small" />) as any }}
            sx={{ minWidth: 220 }}
          />
          <TextField size="small" label="Category" value={filters.category || ""} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} sx={{ minWidth: 180 }} />
          <TextField size="small" label="Manufacturer" value={filters.manufacturer || ""} onChange={(e) => setFilters((f) => ({ ...f, manufacturer: e.target.value }))} sx={{ minWidth: 200 }} />
          <TextField size="small" label="Technology" value={filters.technology || ""} onChange={(e) => setFilters((f) => ({ ...f, technology: e.target.value }))} sx={{ minWidth: 180 }} />
          <Stack direction="row" spacing={1} ml={{ lg: "auto" }}>
            <Tooltip title="Apply Filters">
              <Button
                variant="outlined"
                startIcon={<FilterListRounded />}
                onClick={() => {
                  setPage(0);
                  load();
                }}
              >
                Filter
              </Button>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Button startIcon={<CloudUploadRounded />} variant="contained" onClick={() => setBulkOpen(true)}>
              Bulk Upload
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Material Code</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Sub-Category</TableCell>
                <TableCell>Manufacturer</TableCell>
                <TableCell>UOM</TableCell>
                <TableCell>Technologies</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 6 }}>
                    <Typography align="center" color="text.secondary">
                      No equipment found. Try adjusting filters or upload a file.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map((i) => (
                <TableRow key={i.id} hover>
                  <TableCell>{i.name}</TableCell>
                  <TableCell>{i.material_code || "-"}</TableCell>
                  <TableCell>{i.category || "-"}</TableCell>
                  <TableCell>{i.sub_category || "-"}</TableCell>
                  <TableCell>{i.manufacturer || "-"}</TableCell>
                  <TableCell>{i.unit_of_measurement || "Unit"}</TableCell>
                  <TableCell>
                    {(i.technologies || []).map((t) => (
                      <Chip key={t} size="small" label={t} sx={{ mr: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEditor(i)} size="small">
                        <EditRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(i)} size="small" color="error">
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Bulk Upload Modal */}
      <Dialog open={bulkOpen} onClose={() => setBulkOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Upload Inventory</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Download the CSV template, fill your equipment rows, then upload the file. Technologies can be comma or semicolon separated.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                const headers = ["Material Code", "Manufacturer", "Material Description", "UOM", "Material Category", "Material Sub-Category", "Technology"];
                const sample = ["301446921", "Ericsson", "PSU-AC-32", "Unit", "PSU", "Card Power Supply", "2G;MW"];
                const csv = `${headers.join(",")}\n${sample.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")}\n`;
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "equipment_inventory_template.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download Template
            </Button>
            <input id="equip-upload-file" type="file" accept=".xlsx,.csv" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <label htmlFor="equip-upload-file">
              <Button component="span" variant="outlined">
                Choose File
              </Button>
            </label>
          </Stack>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              Selected: {file.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>

      {loading && (
        <Stack alignItems="center" justifyContent="center" sx={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
          <CircularProgress />
        </Stack>
      )}

      <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit Equipment" : "Create Equipment"}</DialogTitle>
        <DialogContent dividers>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 1 }}>
            <TextField label="Name" fullWidth value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="Material Code" fullWidth value={form.material_code || ""} onChange={(e) => setForm({ ...form, material_code: e.target.value })} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField label="Category" fullWidth value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Sub-Category" fullWidth value={form.sub_category || ""} onChange={(e) => setForm({ ...form, sub_category: e.target.value })} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }}>
            <TextField label="Manufacturer" fullWidth value={form.manufacturer || ""} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
            <TextField label="UOM" select fullWidth value={form.unit_of_measurement || "Unit"} onChange={(e) => setForm({ ...form, unit_of_measurement: e.target.value })}>
              {["Unit", "Meter", "Kilogram", "Liter", "Square Meter"].map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Autocomplete
            multiple
            freeSolo
            options={techOptions}
            value={form.technologies || []}
            onChange={(_, v) => setForm({ ...form, technologies: v as string[] })}
            renderInput={(params) => <TextField {...params} label="Technologies" placeholder="Add technologies" sx={{ mt: 2 }} />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editing ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack?.open} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert severity={snack?.severity || "info"} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EquipmentPage;
