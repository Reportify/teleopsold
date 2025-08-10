import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Box, Breadcrumbs, Button, Card, CardContent, Chip, Divider, List, ListItem, ListItemButton, ListItemText, Stack, Typography, IconButton, Paper } from "@mui/material";
import { mockDesignService, DesignVersion } from "../services/mockDesignService";
import projectService from "../services/projectService";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const ProjectDesignHistoryPage: React.FC = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState<DesignVersion[]>([]);
  const [selected, setSelected] = useState<DesignVersion | null>(null);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const all = await mockDesignService.listPublished(projectId || "demo");
      setVersions(all);
      setSelected(all[0] || null);
    })();
  }, [projectId]);

  useEffect(() => {
    (async () => {
      try {
        const p = await projectService.retrieve(projectId || "");
        setProjectName(p.name);
      } catch {}
    })();
  }, [projectId]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    (selected?.items || []).forEach((it) => {
      const key = it.category || "";
      if (!map[key]) map[key] = [];
      map[key].push(it.item_name);
    });
    return map;
  }, [selected]);

  const handleClone = async () => {
    if (!selected) return;
    const draft = await mockDesignService.createDraft(projectId || "demo", selected.id);
    if (!draft) return;
    await mockDesignService.setDraftItems(projectId || "demo", draft.id, selected.items as any);
    alert(`Cloned v${selected.version_number} into draft. Go back to Design to edit.`);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete version v${selected.version_number}? You can download it as PDF first.`)) return;
    await mockDesignService.deleteVersion(projectId || "demo", selected.id);
    const remaining = await mockDesignService.listPublished(projectId || "demo");
    setVersions(remaining);
    setSelected(remaining[0] || null);
  };

  const handleDownloadPdf = () => {
    if (!selected) return;
    const html = `
      <html>
      <head>
        <title>Design v${selected.version_number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin: 0 0 8px; }
          h2 { font-size: 14px; margin: 16px 0 8px; }
          ul { margin: 0; padding-left: 18px; }
          li { margin: 2px 0; }
        </style>
      </head>
      <body>
        <h1>Design v${selected.version_number} (published ${selected.published_at ? new Date(selected.published_at).toLocaleString() : ""})</h1>
        ${Object.entries(itemsByCategory)
          .map(([cat, names]) => `<h2>${cat || "(Uncategorized)"}</h2><ul>${names.map((n) => `<li>${n}</li>`).join("")}</ul>`)
          .join("")}
      </body>
      </html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${projectId}`}>{projectName || "Project"}</Link>
        <Link to={`/projects/${projectId}/design`}>Project Design</Link>
        <Typography color="text.primary">Design History</Typography>
      </Breadcrumbs>
      <Box sx={{ mb: 1, display: "flex", justifyContent: "flex-end" }}>
        <Button variant="outlined" onClick={() => navigate(`/projects/${projectId}/design`)}>
          Back to Design
        </Button>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Box width={{ xs: "100%", md: 320 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Versions
            </Typography>
            <List dense>
              {versions.map((v) => (
                <ListItem key={v.id} disablePadding>
                  <ListItemButton selected={selected?.id === v.id} onClick={() => setSelected(v)}>
                    <ListItemText primary={`v${v.version_number}`} secondary={v.published_at ? new Date(v.published_at).toLocaleString() : ""} />
                  </ListItemButton>
                </ListItem>
              ))}
              {versions.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No published versions yet
                </Typography>
              )}
            </List>
          </Paper>
        </Box>

        <Box flex={1}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">{selected ? `Version v${selected.version_number}` : "No version selected"}</Typography>
                {selected && <Chip size="small" label="Published" color="success" />}
              </Stack>
              {selected && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleClone}>
                    Clone
                  </Button>
                  <Button size="small" startIcon={<PictureAsPdfIcon />} onClick={handleDownloadPdf}>
                    Download PDF
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={handleDelete}>
                    Delete
                  </Button>
                </Stack>
              )}
            </Stack>
            <Divider sx={{ mb: 2 }} />
            {!selected ? (
              <Typography variant="body2" color="text.secondary">
                Select a version to view its design.
              </Typography>
            ) : (
              <Box>
                {Object.keys(itemsByCategory).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No items.
                  </Typography>
                ) : (
                  Object.entries(itemsByCategory).map(([cat, names]) => (
                    <Box key={cat} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
                  ))
                )}
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default ProjectDesignHistoryPage;
