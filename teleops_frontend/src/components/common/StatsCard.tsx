import React from "react";
import { Card, CardContent, Typography, Box, useTheme, Chip } from "@mui/material";
import { SvgIconComponent } from "@mui/icons-material";
import { useDarkMode } from "../../contexts/ThemeContext";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: SvgIconComponent;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    suffix?: string;
  };
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  onClick?: () => void;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon: Icon, trend, color = "primary", onClick }) => {
  const theme = useTheme();
  const { darkMode } = useDarkMode();

  const getColorValue = (colorName: string) => {
    return theme.palette[colorName as keyof typeof theme.palette] as any;
  };

  const getAccentColor = () => {
    switch (color) {
      case "primary":
        return "#2563EB";
      case "success":
        return "#10B981";
      case "warning":
        return "#F59E0B";
      case "error":
        return "#EF4444";
      case "info":
        return "#0EA5E9";
      case "secondary":
        return "#64748B";
      default:
        return "#2563EB";
    }
  };

  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        background: darkMode ? "#202124" : "white",
        border: darkMode ? "1px solid #3c4043" : "1px solid #F1F5F9",
        borderRadius: "16px",
        overflow: "hidden",
        "&:hover": {
          transform: onClick ? "translateY(-4px)" : "translateY(-2px)",
          boxShadow: darkMode ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)" : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          borderColor: darkMode ? "#5f6368" : "#E2E8F0",
        },
      }}
      onClick={onClick}
    >
      {/* Subtle accent line */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: `linear-gradient(90deg, ${getAccentColor()}, ${getAccentColor()}80)`,
        }}
      />

      <CardContent sx={{ p: "20px", "&:last-child": { pb: "20px" } }}>
        {/* Header with title and icon */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="overline"
              sx={{
                color: darkMode ? "#9aa0a6" : "#6b7280",
                fontWeight: 500,
                letterSpacing: "0.5px",
                fontSize: "0.65rem",
                lineHeight: 1,
                textTransform: "uppercase",
                opacity: 0.8,
              }}
            >
              {title}
            </Typography>
          </Box>
          {Icon && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "10px",
                backgroundColor: `${getAccentColor()}08`,
                color: getAccentColor(),
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 18 }} />
            </Box>
          )}
        </Box>

        {/* Main value */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: darkMode ? "#e8eaed" : "#1a1a1a",
              lineHeight: 1.1,
              fontSize: { xs: "1.75rem", sm: "2rem" },
              fontFeatureSettings: '"tnum"',
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </Typography>
        </Box>

        {/* Footer with subtitle and trend */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "24px" }}>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: darkMode ? "#9aa0a6" : "#6b7280",
                fontSize: "0.75rem",
                fontWeight: 400,
                flex: 1,
                lineHeight: 1.4,
                opacity: 0.8,
              }}
            >
              {subtitle}
            </Typography>
          )}

          {trend && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                px: 1.5,
                py: 0.5,
                borderRadius: "8px",
                backgroundColor: trend.isPositive ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                ml: subtitle ? 2 : 0,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: trend.isPositive ? "#059669" : "#DC2626",
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}
                {trend.suffix || "%"}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
