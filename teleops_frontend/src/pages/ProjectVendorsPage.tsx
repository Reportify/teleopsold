import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Breadcrumbs,
  Typography,
  Paper,
  Stack,
  Button,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

const ProjectVendorsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);
  const [projectName, setProjectName] = useState<string>("");
  const [vendors, setVendors] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ relationship_id: "", expires_in_days: 14 });
  const [relationships, setRelationships] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [v, inv, p] = await Promise.all([
        apiHelpers.get<any>(API_ENDPOINTS.PROJECTS.VENDORS.LIST(String(id))),
        apiHelpers.get<any>(API_ENDPOINTS.PROJECTS.VENDOR_INVITES.LIST(String(id))),
        apiHelpers.get<any>(API_ENDPOINTS.PROJECTS.DETAIL(String(id))),
      ]);
      const list = Array.isArray(v) ? v : v?.results || [];
      setVendors(list);
      const invList = Array.isArray(inv) ? inv : inv?.results || [];
      setInvites(invList);
      setProjectName(p?.name || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // When opening invite modal, fetch client vendor relationships for dropdown
  useEffect(() => {
    const fetchRelationships = async () => {
      try {
        const rels = await apiHelpers.get<any>(API_ENDPOINTS.RELATIONSHIPS.LIST);
        const list = Array.isArray(rels) ? rels : rels?.results || [];
        setRelationships(list);
      } catch {
        setRelationships([]);
      }
    };
    if (openInvite) fetchRelationships();
  }, [openInvite]);

  const statusChip = (s: string) => <Chip size="small" label={s.replace(/_/g, " ")} />;

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        {id ? <Link to={`/projects/${id}`}>{projectName || "Project"}</Link> : <Typography>Project</Typography>}
        <Typography color="text.primary">Project Vendors</Typography>
      </Breadcrumbs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Vendors
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => setOpenInvite(true)}>
              Invite Vendor
            </Button>
          </Stack>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Active Vendors" />
          <Tab label="Invitations" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendor Code</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vendors.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.relationship_vendor_code || r.relationship_id}</TableCell>
                    <TableCell>{r.scope_notes || "-"}</TableCell>
                    <TableCell>{statusChip(r.status)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={async () => {
                            await apiHelpers.patch(API_ENDPOINTS.PROJECTS.VENDORS.UPDATE_STATUS(String(id), r.id), { status: r.status === "hold" ? "active" : "hold" });
                            load();
                          }}
                        >
                          {r.status === "hold" ? "Resume" : "Hold"}
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
                            await apiHelpers.patch(API_ENDPOINTS.PROJECTS.VENDORS.UPDATE_STATUS(String(id), r.id), { status: "suspended" });
                            load();
                          }}
                        >
                          Suspend
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={async () => {
                            await apiHelpers.patch(API_ENDPOINTS.PROJECTS.VENDORS.UPDATE_STATUS(String(id), r.id), { status: "removed" });
                            load();
                          }}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No vendors
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.relationship_id}</TableCell>
                    <TableCell>{r.invite_email}</TableCell>
                    <TableCell>{statusChip(r.status)}</TableCell>
                    <TableCell>{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "-"}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button size="small" onClick={() => navigator.clipboard.writeText(window.location.origin + API_ENDPOINTS.PUBLIC.VENDOR_INVITES.PREVIEW(r.token))}>
                          Copy Link
                        </Button>
                        <Button
                          size="small"
                          onClick={async () => {
                            await apiHelpers.post(API_ENDPOINTS.PROJECTS.VENDOR_INVITES.RESEND(String(id), r.id));
                            load();
                          }}
                        >
                          Resend
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={async () => {
                            await apiHelpers.post(API_ENDPOINTS.PROJECTS.VENDOR_INVITES.DISCARD(String(id), r.id));
                            load();
                          }}
                        >
                          Discard
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {invites.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No invitations
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      <Dialog open={openInvite} onClose={() => setOpenInvite(false)} fullWidth maxWidth="sm">
        <DialogTitle>Invite Vendor</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Select Vendor (Relationship)"
              value={inviteForm.relationship_id}
              onChange={(e) => setInviteForm({ ...inviteForm, relationship_id: e.target.value })}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            >
              <option value="">-- Select --</option>
              {relationships.map((rel: any) => (
                <option key={rel.id} value={rel.id}>
                  {rel.vendor_code || rel.id} {rel.vendor_organization_name ? `- ${rel.vendor_organization_name}` : ""}
                </option>
              ))}
            </TextField>
            {/* Email not required since vendor email exists on relationship */}
            <TextField
              select
              label="Expires in (days)"
              value={inviteForm.expires_in_days}
              onChange={(e) => setInviteForm({ ...inviteForm, expires_in_days: parseInt(e.target.value || "0", 10) })}
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              fullWidth
            >
              {[1, 3, 7, 14].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvite(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={async () => {
              try {
                setSubmitting(true);
                await apiHelpers.post(API_ENDPOINTS.PROJECTS.VENDOR_INVITES.CREATE(String(id)), inviteForm);
                setOpenInvite(false);
                setInviteForm({ relationship_id: "", expires_in_days: 14 });
                load();
              } catch {
                /* no-op */
              } finally {
                setSubmitting(false);
              }
            }}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectVendorsPage;
