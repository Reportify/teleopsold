import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
  Toolbar,
  alpha,
} from "@mui/material";
import { MoreVert, FilterList, Search } from "@mui/icons-material";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: "right" | "left" | "center";
  format?: (value: any, row?: any) => string | React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
}

export interface RowAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  color?: "primary" | "secondary" | "error" | "warning";
  disabled?: (row: any) => boolean;
}

interface DataTableProps {
  columns: Column[];
  rows: any[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selected: string[]) => void;
  actions?: RowAction[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  title?: string;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  getRowId?: (row: any) => string;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  loading = false,
  error = null,
  onRetry,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  actions = [],
  searchable = true,
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
  title,
  rowsPerPageOptions = [10, 25, 50],
  defaultRowsPerPage = 10,
  getRowId = (row) => row.id,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | { element: HTMLElement; row: any }>(null);

  // Filter rows based on search term
  const filteredRows = React.useMemo(() => {
    if (!searchTerm) return rows;

    return rows.filter((row) => {
      return columns.some((column) => {
        const value = row[column.id];
        if (value == null) return false;
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [rows, searchTerm, columns]);

  // Paginated rows
  const paginatedRows = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredRows.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;

    if (event.target.checked) {
      const allIds = filteredRows.map(getRowId);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (rowId: string) => {
    if (!onSelectionChange) return;

    const newSelection = selectedRows.includes(rowId) ? selectedRows.filter((id) => id !== rowId) : [...selectedRows, rowId];

    onSelectionChange(newSelection);
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setActionMenuAnchor({ element: event.currentTarget, row });
  };

  const handleActionClose = () => {
    setActionMenuAnchor(null);
  };

  if (loading) {
    return <LoadingSpinner message="Loading data..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  const numSelected = selectedRows.length;
  const numRows = filteredRows.length;

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      {(title || searchable || numSelected > 0) && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            ...(numSelected > 0 && {
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
            }),
          }}
        >
          {numSelected > 0 ? (
            <Typography sx={{ flex: "1 1 100%" }} color="inherit" variant="subtitle1" component="div">
              {numSelected} selected
            </Typography>
          ) : (
            <>
              {title && (
                <Typography sx={{ flex: "1 1 100%" }} variant="h6" id="tableTitle" component="div">
                  {title}
                </Typography>
              )}
              {searchable && (
                <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
                  <TextField
                    size="small"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Box>
              )}
            </>
          )}
        </Toolbar>
      )}

      <TableContainer>
        <Table stickyHeader aria-label="data table">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox color="primary" indeterminate={numSelected > 0 && numSelected < numRows} checked={numRows > 0 && numSelected === numRows} onChange={handleSelectAll} />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align} style={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
              {actions.length > 0 && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedRows.includes(rowId);

                return (
                  <TableRow hover role="checkbox" aria-checked={isSelected} tabIndex={-1} key={rowId} selected={isSelected}>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox color="primary" checked={isSelected} onChange={() => handleSelectRow(rowId)} />
                      </TableCell>
                    )}
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format ? column.format(value, row) : value}
                        </TableCell>
                      );
                    })}
                    {actions.length > 0 && (
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleActionClick(e, row)}>
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={filteredRows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Action Menu */}
      <Menu anchorEl={actionMenuAnchor?.element} open={Boolean(actionMenuAnchor)} onClose={handleActionClose}>
        {actions.map((action) => (
          <MenuItem
            key={action.label}
            onClick={() => {
              if (actionMenuAnchor) {
                action.onClick(actionMenuAnchor.row);
              }
              handleActionClose();
            }}
            disabled={action.disabled ? action.disabled(actionMenuAnchor?.row) : false}
          >
            {action.icon && <Box sx={{ mr: 1, display: "flex" }}>{action.icon}</Box>}
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Paper>
  );
};

export default DataTable;
