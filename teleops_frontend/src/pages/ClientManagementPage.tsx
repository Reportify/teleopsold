// Unified Client Management Page for both Circle and Vendor tenants
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Rating,
} from "@mui/material";
import { Add, Edit, Delete, Visibility } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";
import clientService, { Client, ClientForm } from "../services/clientService";
import { ClientDisplay, RelationshipType, RelationshipStatus, VerificationStatus } from "../types/client";

// Remove the old interfaces since we're importing them from types

const ClientManagementPage: React.FC = () => {
  const { getCurrentTenant, isAuthenticated, user, tenantContext } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState({
    total_clients: 0,
    active_clients: 0,
    pending_approvals: 0,
    verified_clients: 0,
    average_performance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    client_name: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    headquarters_address: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // Use ref to prevent multiple API calls
  const hasFetchedRef = React.useRef(false);

  // Fetch clients from API
  useEffect(() => {
    const fetchClients = async () => {
      // Prevent multiple calls
      if (hasFetchedRef.current) {
        return;
      }

      try {
        setLoading(true);

        // Check if user is authenticated
        if (!isAuthenticated) {
          console.error("User is not authenticated");
          setSnackbar({
            open: true,
            message: "Please log in to view clients",
            severity: "error",
          });
          return;
        }

        // Check if tenant context is available
        if (!currentTenant) {
          console.error("No tenant context available");
          setSnackbar({
            open: true,
            message: "No tenant context available",
            severity: "error",
          });
          return;
        }

        // Mark as fetched to prevent duplicate calls
        hasFetchedRef.current = true;

        const [clientsData, statsData] = await Promise.all([clientService.getClients(), clientService.getClientStats()]);

        setClients(clientsData.clients);
        setClientStats(statsData);
      } catch (error) {
        console.error("Failed to fetch clients:", error);
        setSnackbar({
          open: true,
          message: "Failed to load clients",
          severity: "error",
        });
        // Reset the ref on error so we can retry
        hasFetchedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if authenticated and tenant is available
    if (isAuthenticated && currentTenant) {
      fetchClients();
    }
  }, [isAuthenticated, currentTenant?.id]); // Single useEffect with proper dependencies

  const handleAddClient = () => {
    setEditingClient(null);
    setFormData({
      client_name: "",
      primary_contact_name: "",
      primary_contact_email: "",
      primary_contact_phone: "",
      headquarters_address: "",
    });
    setDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_tenant_data.organization_name,
      primary_contact_name: client.client_tenant_data.primary_contact_name || "",
      primary_contact_email: client.client_tenant_data.primary_contact_email || "",
      primary_contact_phone: client.client_tenant_data.primary_contact_phone || "",
      headquarters_address: "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await clientService.deleteClient(clientId);
      setClients(clients.filter((client) => client.id !== clientId));
      setSnackbar({
        open: true,
        message: "Client deleted successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to delete client",
        severity: "error",
      });
    }
  };

  const handleSaveClient = async () => {
    try {
      if (editingClient) {
        // Update existing client
        const updatedClient = await clientService.updateClient(editingClient.id, formData);
        setClients(clients.map((client) => (client.id === editingClient.id ? updatedClient : client)));
        setSnackbar({
          open: true,
          message: "Client updated successfully",
          severity: "success",
        });
      } else {
        // Add new vendor client
        const newClient = await clientService.createVendorClient(formData);
        // Refresh the clients list to include the new client
        const [clientsData, statsData] = await Promise.all([clientService.getClients(), clientService.getClientStats()]);
        setClients(clientsData.clients);
        setClientStats(statsData);
        setSnackbar({
          open: true,
          message: "Client added successfully",
          severity: "success",
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to save client:", error);
      setSnackbar({
        open: true,
        message: "Failed to save client",
        severity: "error",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Inactive":
        return "error";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "Primary":
        return "primary";
      case "Secondary":
        return "secondary";
      case "Prospect":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your clients who hire you for services
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => {
              clientService
                .getClients()
                .then((data) => {
                  // API test completed successfully
                })
                .catch((err) => {
                  // API test failed - error handled silently
                });
            }}
          >
            Test API
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={handleAddClient} sx={{ borderRadius: 2 }}>
            Add Client
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Clients
              </Typography>
              <Typography variant="h4" component="div">
                {clientStats.total_clients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Clients
              </Typography>
              <Typography variant="h4" component="div">
                {clientStats.active_clients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pending Approvals
              </Typography>
              <Typography variant="h4" component="div">
                {clientStats.pending_approvals}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Performance
              </Typography>
              <Typography variant="h4" component="div">
                {clientStats.average_performance.toFixed(1)}/5
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Client List
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Relationship</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {client.client_tenant_data.organization_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.vendor_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{client.client_tenant_data.primary_contact_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.client_tenant_data.primary_contact_email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={client.relationship_type} color={getRelationshipColor(client.relationship_type) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={client.relationship_status} color={getStatusColor(client.relationship_status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Client">
                          <IconButton size="small" onClick={() => handleEditClient(client)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Client">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClient(client.id)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Client Name" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Primary Contact Name" value={formData.primary_contact_name} onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Primary Contact Email"
                type="email"
                value={formData.primary_contact_email}
                onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Primary Contact Phone" value={formData.primary_contact_phone} onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Headquarters Address" value={formData.headquarters_address} onChange={(e) => setFormData({ ...formData, headquarters_address: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveClient} variant="contained">
            {editingClient ? "Update" : "Add"} Client
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default ClientManagementPage;
