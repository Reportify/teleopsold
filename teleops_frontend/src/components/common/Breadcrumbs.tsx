/**
 * Breadcrumb Navigation Component
 * Provides consistent navigation hierarchy across the application
 */

import React from "react";
import { Box, Breadcrumbs as MuiBreadcrumbs, Typography, Link, Chip } from "@mui/material";
import { NavigateNext, Home, Security, Dashboard, Group, Person, Assignment, Settings } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  chip?: {
    label: string;
    color?: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";
  };
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  maxItems?: number;
  showHomeIcon?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  home: <Home fontSize="small" />,
  dashboard: <Dashboard fontSize="small" />,
  security: <Security fontSize="small" />,
  group: <Group fontSize="small" />,
  person: <Person fontSize="small" />,
  assignment: <Assignment fontSize="small" />,
  settings: <Settings fontSize="small" />,
};

const AppBreadcrumbs: React.FC<BreadcrumbsProps> = ({ items, maxItems = 8, showHomeIcon = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  const getIcon = (iconName?: string | React.ReactNode) => {
    if (React.isValidElement(iconName)) {
      return iconName;
    }
    if (typeof iconName === "string") {
      return iconMap[iconName.toLowerCase()];
    }
    return null;
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        mb: 2,
        py: 1,
        px: 2,
        backgroundColor: "grey.50",
        borderRadius: 1,
        border: "1px solid",
        borderColor: "grey.200",
      }}
    >
      <MuiBreadcrumbs separator={<NavigateNext fontSize="small" />} maxItems={maxItems} aria-label="breadcrumb navigation" sx={{ flex: 1 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const icon = getIcon(item.icon);

          if (isLast || !item.path) {
            // Current page - not clickable
            return (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  color: "text.primary",
                  fontWeight: 600,
                }}
              >
                {icon}
                <Typography variant="body2" color="text.primary" fontWeight={600}>
                  {item.label}
                </Typography>
                {item.chip && <Chip label={item.chip.label} size="small" color={item.chip.color || "default"} sx={{ ml: 1, height: 20 }} />}
              </Box>
            );
          }

          // Clickable breadcrumb item
          return (
            <Link
              key={index}
              component="button"
              variant="body2"
              onClick={() => handleClick(item.path)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                color: "text.secondary",
                textDecoration: "none",
                cursor: "pointer",
                padding: 0,
                border: "none",
                background: "none",
                "&:hover": {
                  color: "primary.main",
                  textDecoration: "underline",
                },
                "&:focus": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: 2,
                  borderRadius: 1,
                },
              }}
            >
              {icon}
              {item.label}
            </Link>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default AppBreadcrumbs;
