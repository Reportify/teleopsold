import React, { useState } from "react";
import { Box, Paper, Typography, TextField, Button, MenuItem, Alert, CircularProgress } from "@mui/material";

const categories = ["Onboarding", "Access", "Technical Issue", "Billing", "Other"];

const RaiseTicketPage: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    description: "",
    attachment: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, attachment: e.target.files?.[0] || null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSuccess("Your support ticket has been submitted. Our team will contact you soon.");
      setForm({ name: "", email: "", subject: "", category: "", description: "", attachment: null });
    }, 1500);
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f7f9fb" }}>
      <Paper sx={{ p: 4, maxWidth: 500, width: "100%" }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Raise a Support Ticket
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Need help? Fill out the form below and our support team will get back to you.
        </Typography>
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <TextField label="Your Name" name="name" value={form.name} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
          <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
          <TextField label="Subject" name="subject" value={form.subject} onChange={handleChange} fullWidth required sx={{ mb: 2 }} />
          <TextField label="Category" name="category" value={form.category} onChange={handleChange} select fullWidth required sx={{ mb: 2 }}>
            {categories.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth required multiline minRows={4} sx={{ mb: 2 }} />
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            {form.attachment ? form.attachment.name : "Attach File"}
            <input type="file" hidden onChange={handleFileChange} />
          </Button>
          <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
            Submit Ticket
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default RaiseTicketPage;
