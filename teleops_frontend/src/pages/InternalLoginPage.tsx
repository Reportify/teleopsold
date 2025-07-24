import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress, Link } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";

const InternalLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { loginInternal } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await loginInternal(email, password);
      // Redirect to internal dashboard
      navigate("/internal/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper elevation={3} sx={{ p: 4, minWidth: 350 }}>
        <Typography variant="h5" mb={2} align="center">
          Teleops Internal Login
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required margin="normal" />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth required margin="normal" />
          <Box mt={2} display="flex" flexDirection="column" alignItems="center">
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mb: 1 }}>
              {loading ? <CircularProgress size={24} /> : "Login"}
            </Button>
            <Link href="/login" underline="hover" sx={{ mt: 1 }}>
              Tenant Login
            </Link>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default InternalLoginPage;
