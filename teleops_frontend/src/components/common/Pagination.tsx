import React from "react";
import { Box, IconButton, Typography, Select, MenuItem, FormControl, InputLabel, Tooltip } from "@mui/material";
import { FirstPage, KeyboardArrowLeft, KeyboardArrowRight, LastPage, Refresh } from "@mui/icons-material";
import { PaginationState } from "../../hooks/usePagination";

interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRefresh: () => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showRefreshButton?: boolean;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showRefreshButton = true,
  disabled = false,
}) => {
  const { currentPage, pageSize, totalPages, totalItems, hasNextPage, hasPreviousPage } = pagination;

  const handleFirstPage = () => {
    if (currentPage > 1) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages);
    }
  };

  const handlePageSizeChange = (event: any) => {
    onPageSizeChange(event.target.value);
  };

  // Calculate page range for display
  const getPageRange = () => {
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  if (totalPages <= 1 && totalItems === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        p: 2,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Left side - Page size selector and item count */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {showPageSizeSelector && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Page Size</InputLabel>
            <Select value={pageSize} label="Page Size" onChange={handlePageSizeChange} disabled={disabled}>
              {pageSizeOptions.map((size) => (
                <MenuItem key={size} value={size}>
                  {size} per page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Typography variant="body2" color="text.secondary">
          {totalItems > 0 ? (
            <>
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
            </>
          ) : (
            "No items found"
          )}
        </Typography>
      </Box>

      {/* Center - Page navigation */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Tooltip title="First Page">
          <span>
            <IconButton onClick={handleFirstPage} disabled={disabled || currentPage <= 1} size="small">
              <FirstPage />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Previous Page">
          <span>
            <IconButton onClick={handlePreviousPage} disabled={disabled || !hasPreviousPage} size="small">
              <KeyboardArrowLeft />
            </IconButton>
          </span>
        </Tooltip>

        {/* Page numbers */}
        {getPageRange().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <Typography
                variant="body2"
                sx={{
                  px: 1,
                  color: "text.secondary",
                  userSelect: "none",
                }}
              >
                ...
              </Typography>
            ) : (
              <Typography
                variant="body2"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  cursor: page === currentPage ? "default" : "pointer",
                  bgcolor: page === currentPage ? "primary.main" : "transparent",
                  color: page === currentPage ? "primary.contrastText" : "text.primary",
                  fontWeight: page === currentPage ? "bold" : "normal",
                  "&:hover":
                    page !== currentPage
                      ? {
                          bgcolor: "action.hover",
                        }
                      : {},
                  userSelect: "none",
                  minWidth: 32,
                  textAlign: "center",
                }}
                onClick={() => page !== currentPage && onPageChange(page as number)}
              >
                {page}
              </Typography>
            )}
          </React.Fragment>
        ))}

        <Tooltip title="Next Page">
          <span>
            <IconButton onClick={handleNextPage} disabled={disabled || !hasNextPage} size="small">
              <KeyboardArrowRight />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Last Page">
          <span>
            <IconButton onClick={handleLastPage} disabled={disabled || currentPage >= totalPages} size="small">
              <LastPage />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Right side - Refresh button */}
      {showRefreshButton && (
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} disabled={disabled} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default Pagination;
