import { createTheme } from "@mui/material/styles";

// Modern Professional Theme for Teleops Corporate Portal
export const createModernTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#2563EB", // Modern blue
        light: "#3B82F6",
        dark: "#1D4ED8",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#64748B", // Sophisticated slate
        light: "#94A3B8",
        dark: "#475569",
        contrastText: "#FFFFFF",
      },
      background: {
        default: mode === "light" ? "#FAFBFC" : "#0F172A", // Subtle warm gray / Deep dark
        paper: mode === "light" ? "#FFFFFF" : "#1E293B",
      },
      text: {
        primary: mode === "light" ? "#0F172A" : "#F8FAFC", // Deep slate / Light text
        secondary: mode === "light" ? "#64748B" : "#94A3B8",
      },
      success: {
        main: "#10B981", // Modern green
        light: "#34D399",
        dark: "#059669",
      },
      warning: {
        main: "#F59E0B", // Refined amber
        light: "#FBBF24",
        dark: "#D97706",
      },
      error: {
        main: "#EF4444", // Clean red
        light: "#F87171",
        dark: "#DC2626",
      },
      info: {
        main: "#0EA5E9", // Modern cyan
        light: "#38BDF8",
        dark: "#0284C7",
      },
      grey: {
        50: "#F8FAFC",
        100: "#F1F5F9",
        200: "#E2E8F0",
        300: "#CBD5E1",
        400: "#94A3B8",
        500: "#64748B",
        600: "#475569",
        700: "#334155",
        800: "#1E293B",
        900: "#0F172A",
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: "2.5rem",
        lineHeight: 1.1,
        letterSpacing: "-0.025em",
      },
      h2: {
        fontWeight: 700,
        fontSize: "2.25rem",
        lineHeight: 1.2,
        letterSpacing: "-0.025em",
      },
      h3: {
        fontWeight: 600,
        fontSize: "1.875rem",
        lineHeight: 1.25,
        letterSpacing: "-0.02em",
      },
      h4: {
        fontWeight: 600,
        fontSize: "1.5rem",
        lineHeight: 1.3,
        letterSpacing: "-0.02em",
      },
      h5: {
        fontWeight: 600,
        fontSize: "1.25rem",
        lineHeight: 1.4,
      },
      h6: {
        fontWeight: 600,
        fontSize: "1.125rem",
        lineHeight: 1.4,
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.6,
        fontWeight: 400,
      },
      body2: {
        fontSize: "0.875rem",
        lineHeight: 1.5,
        fontWeight: 400,
      },
      caption: {
        fontSize: "0.75rem",
        lineHeight: 1.4,
        fontWeight: 500,
      },
      overline: {
        fontSize: "0.75rem",
        lineHeight: 1.4,
        fontWeight: 600,
        letterSpacing: "0.8px",
        textTransform: "uppercase",
      },
    },
    shape: {
      borderRadius: 12,
    },
    spacing: 8,

    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: mode === "light" ? "1px solid #F1F5F9" : "1px solid #334155",
            boxShadow: "none",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              borderColor: mode === "light" ? "#E2E8F0" : "#475569",
              boxShadow: mode === "light" ? "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" : "0 10px 25px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: "none",
            fontWeight: 500,
            fontSize: "0.875rem",
            letterSpacing: "0.01em",
            padding: "10px 20px",
            boxShadow: "none",
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              boxShadow: "none",
            },
          },
          contained: {
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: "0.75rem",
            height: 28,
          },
          outlined: {
            ...(mode === "dark" && {
              backgroundColor: "transparent",
              color: "#FFFFFF",
              borderColor: "#FFFFFF",
              "&:hover": {
                backgroundColor: "rgba(77, 76, 76, 0.8)",
              },
            }),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            borderRadius: 16,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: "none",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            borderBottom: "1px solid #F1F5F9",
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            backgroundColor: "#F1F5F9",
          },
          bar: {
            borderRadius: 4,
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: "#F1F5F9",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });

// Export both light and dark themes
export const modernTheme = createModernTheme("light");
export const modernDarkTheme = createModernTheme("dark");

// Legacy theme export for compatibility
export const theme = {
  colors: {
    primary: "#2563EB",
    secondary: "#64748B",
    background: "#FAFBFC",
    surface: "#FFFFFF",
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    textPrimary: "#0F172A",
    textSecondary: "#64748B",
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    heading: 600,
    body: 400,
    mono: '"JetBrains Mono", monospace',
  },
  borderRadius: 12,
  shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
};
