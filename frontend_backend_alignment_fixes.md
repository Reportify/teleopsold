# Frontend-Backend Alignment Fixes Required

## 🔧 **1. Fix API Service (rbacAPI.ts)**

### **A. Fix Bulk Revoke Endpoint URL**

```typescript
// CURRENT (WRONG):
async bulkRevokePermissions(data: {
  permission_ids: number[];
  target_type: "users" | "designations" | "groups";
  target_ids: number[];
  reason?: string;
}): Promise<{ success: boolean; message: string; results: any[] }> {
  const response = await api.post(`${this.baseURL}/permissions/bulk-revoke/`, data);
  return response.data;
}

// SHOULD BE (CORRECT):
async bulkRevokePermissions(data: {
  permission_ids: number[];
  target_type: "users" | "designations" | "groups";
  target_ids: number[];
  reason?: string;
}): Promise<{ success: boolean; message: string; results: any[] }> {
  const response = await api.post(`${this.baseURL}/groups/bulk_revoke/`, data);
  return response.data;
}
```

### **B. Add Complete Deletion Method**

```typescript
// ADD THIS NEW METHOD:
async deletePermissionCompletely(id: number, reason?: string): Promise<{
  success: boolean;
  message: string;
  cleanup_results: {
    designations_cleaned: number;
    groups_cleaned: number;
    users_cleaned: number;
    overrides_cleaned: number;
  };
  permission_code: string;
}> {
  const response = await api.delete(`${this.baseURL}/permissions/${id}/delete_completely/`, {
    data: { reason: reason || 'Complete deletion requested' }
  });
  return response.data;
}
```

---

## 🎨 **2. Update Permission Registry Page**

### **A. Add Complete Deletion Option**

```tsx
// In PermissionRegistryPage.tsx, update the handleDelete function:

const handleDelete = async (permission: Permission) => {
  // Show deletion options dialog
  setDeletionOptionsDialog(true);
  setSelectedPermissionForDeletion(permission);
};

const handleSoftDelete = async (permission: Permission) => {
  if (window.confirm(`Soft delete "${permission.permission_name}"? (Can be restored later)`)) {
    try {
      await deletePermission(permission.id);
      setSnackbar({
        open: true,
        message: "Permission soft deleted successfully",
        severity: "success",
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete permission",
        severity: "error",
      });
    }
  }
};

const handleCompleteDelete = async (permission: Permission, reason: string) => {
  if (window.confirm(`PERMANENTLY delete "${permission.permission_name}"? This will remove it from ALL users, groups, and designations!`)) {
    try {
      const result = await rbacAPI.deletePermissionCompletely(permission.id, reason);
      setSnackbar({
        open: true,
        message: `Permission completely removed: ${result.cleanup_results.designations_cleaned} designations, ${result.cleanup_results.groups_cleaned} groups, ${result.cleanup_results.overrides_cleaned} overrides cleaned`,
        severity: "success",
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to completely delete permission",
        severity: "error",
      });
    }
  }
};
```

### **B. Add Deletion Options Dialog**

```tsx
const DeletionOptionsDialog = ({ permission, open, onClose, onSoftDelete, onCompleteDelete }) => {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Delete Permission: {permission?.permission_name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Choose deletion type:
          </Alert>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => {
                onSoftDelete(permission);
                onClose();
              }}
            >
              Soft Delete (Deactivate)
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                onCompleteDelete(permission, reason);
                onClose();
              }}
            >
              Complete Delete (Remove from System)
            </Button>
          </Stack>
        </Box>

        <TextField fullWidth label="Deletion Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you deleting this permission?" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
```

---

## 🏢 **3. Add Group Permission Management**

### **A. Update PermissionGroupsPage.tsx**

```tsx
// Add permission removal functionality to group details

const handleRemovePermissionFromGroup = async (groupId: number, permissionId: number, permissionName: string) => {
  if (window.confirm(`Remove permission "${permissionName}" from this group? Users in this group will lose this permission naturally.`)) {
    try {
      const result = await rbacAPI.bulkRevokePermissions({
        permission_ids: [permissionId],
        target_type: "groups",
        target_ids: [groupId],
        reason: `Removed permission from group via management interface`,
      });

      if (result.success) {
        const groupResult = result.results[0];
        setSnackbar({
          open: true,
          message: `Permission removed from group. ${groupResult.users_affected} users affected.`,
          severity: "success",
        });
        // Refresh group data
        loadPermissionGroups();
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to remove permission from group",
        severity: "error",
      });
    }
  }
};

// In group permissions list, add remove buttons:
{
  viewingGroup?.group_permissions?.map((perm) => (
    <ListItem key={perm.id}>
      <ListItemText primary={perm.permission_name} secondary={perm.permission_code} />
      <ListItemSecondaryAction>
        <IconButton edge="end" aria-label="remove" onClick={() => handleRemovePermissionFromGroup(viewingGroup.id, perm.permission, perm.permission_name)}>
          <Remove />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  ));
}
```

---

## 👥 **4. Add Designation Permission Management**

### **A. Create DesignationPermissionPage.tsx** (NEW FILE)

```tsx
// New page for managing designation permissions
import React, { useState, useEffect } from "react";
// ... imports

const DesignationPermissionPage: React.FC = () => {
  const [designations, setDesignations] = useState([]);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [designationPermissions, setDesignationPermissions] = useState([]);

  const handleRemovePermissionFromDesignation = async (designationId: number, permissionId: number) => {
    try {
      const result = await rbacAPI.bulkRevokePermissions({
        permission_ids: [permissionId],
        target_type: "designations",
        target_ids: [designationId],
        reason: "Removed via designation management",
      });

      if (result.success) {
        setSnackbar({
          open: true,
          message: "Permission removed from designation successfully",
          severity: "success",
        });
        // Refresh data
        loadDesignationPermissions(designationId);
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to remove permission from designation",
        severity: "error",
      });
    }
  };

  // ... rest of component
};
```

---

## 📊 **5. Enhanced ComprehensivePermissionDashboard**

### **A. Add Group and Designation Removal Support**

```tsx
// In ComprehensivePermissionDashboard.tsx, add new removal functions:

const handleRemovePermissionFromGroup = async (permissionId: number, groupId: number, groupName: string) => {
  if (window.confirm(`Remove permission from group "${groupName}"? All users in this group will naturally lose this permission.`)) {
    try {
      const result = await rbacAPI.bulkRevokePermissions({
        permission_ids: [permissionId],
        target_type: "groups",
        target_ids: [groupId],
        reason: "Removed via comprehensive dashboard",
      });

      if (result.success && result.results[0]) {
        const groupResult = result.results[0];
        setSnackbar({
          open: true,
          message: `Permission removed from group "${groupResult.group_name}". ${groupResult.users_affected} users affected.`,
          severity: "success",
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to remove permission from group",
        severity: "error",
      });
    }
  }
};

const handleRemovePermissionFromDesignation = async (permissionId: number, designationId: number, designationName: string) => {
  if (window.confirm(`Remove permission from designation "${designationName}"? All users with this designation will lose this permission.`)) {
    try {
      const result = await rbacAPI.bulkRevokePermissions({
        permission_ids: [permissionId],
        target_type: "designations",
        target_ids: [designationId],
        reason: "Removed via comprehensive dashboard",
      });

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Permission removed from designation "${designationName}"`,
          severity: "success",
        });
      }
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to remove permission from designation",
        severity: "error",
      });
    }
  }
};
```

---

## ✅ **6. Implementation Priority**

### **Phase 1: Critical Fixes (HIGH PRIORITY)**

1. ✅ Fix bulk revoke API endpoint URL
2. ✅ Add complete deletion API method
3. ✅ Update permission registry deletion options

### **Phase 2: Group Management (MEDIUM PRIORITY)**

1. ✅ Add group permission removal to PermissionGroupsPage
2. ✅ Add group removal support to comprehensive dashboard

### **Phase 3: Designation Management (MEDIUM PRIORITY)**

1. ✅ Create designation permission management page
2. ✅ Add designation removal support to comprehensive dashboard

### **Phase 4: Enhanced UX (LOW PRIORITY)**

1. ✅ Add impact preview dialogs
2. ✅ Add bulk operation status indicators
3. ✅ Add confirmation dialogs with detailed information

---

## 🎯 **Summary of Required Changes**

1. **API Service Fix**: Correct bulk revoke endpoint URL
2. **New API Method**: Add complete deletion support
3. **Permission Registry**: Add deletion options dialog
4. **Group Management**: Add permission removal from groups
5. **Designation Management**: Create designation permission page
6. **Dashboard Enhancement**: Support all removal types

**Once these updates are implemented, the frontend will be fully aligned with the backend permission removal architecture!** 🚀
