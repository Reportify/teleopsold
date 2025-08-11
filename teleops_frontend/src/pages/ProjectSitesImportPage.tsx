import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Breadcrumbs, Typography, Paper, Stack, Button, Alert, LinearProgress } from "@mui/material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

const ProjectSitesImportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const onSubmit = async () => {
    if (!file || !id) return;
    setSubmitting(true);
    setError(null);
    try {
      // Backend expects standard multipart/form-data under key 'file'
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiHelpers.post<any>(API_ENDPOINTS.PROJECTS.SITES.IMPORT(String(id)), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res);
    } catch (e: any) {
      setError(e?.message || "Failed to import file");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to={`/projects/${id}`}>Project Details</Link>
        <Typography color="text.primary">Import Project Sites</Typography>
      </Breadcrumbs>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
            <Button variant="contained" onClick={onSubmit} disabled={!file || submitting}>
              Upload
            </Button>
            <Button variant="text" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {submitting && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Import Summary
          </Typography>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate(`/projects/${id}/sites`)}>
              Go to Project Sites
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default ProjectSitesImportPage;
