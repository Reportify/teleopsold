# RBAC Developer Guide for Cursor AI Agents

## 🎯 **Overview**

This guide provides comprehensive instructions for implementing Role-Based Access Control (RBAC) compliant features in the TeleOps application. All new development MUST follow these patterns to ensure proper permission enforcement.

## 📋 **Table of Contents**

1. [Core RBAC Architecture](#core-rbac-architecture)
2. [Permission System Structure](#permission-system-structure)
3. [Frontend Implementation Guidelines](#frontend-implementation-guidelines)
4. [Backend Implementation Guidelines](#backend-implementation-guidelines)
5. [Adding New Features](#adding-new-features)
6. [Testing RBAC Compliance](#testing-rbac-compliance)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ **Core RBAC Architecture**

### **Permission Hierarchy**

```
1. Designation Base Permissions (lowest priority)
2. Designation Permissions (overrides base)
3. Group Permissions (overrides designation)
4. User Permission Overrides (highest priority)
```

### **Business Templates**

| Template       | Actions                                  | Permission Code Pattern              |
| -------------- | ---------------------------------------- | ------------------------------------ |
| `view_only`    | `["read"]`                               | `resource.read`                      |
| `creator_only` | `["read", "create"]`                     | `resource.read_create`               |
| `contributor`  | `["read", "create", "update"]`           | `resource.read_create_update`        |
| `full_access`  | `["read", "create", "update", "delete"]` | `resource.read_create_update_delete` |
| `custom`       | Custom actions                           | Any other pattern                    |

### **Administrator Logic**

- **Django Superusers**: Get all permissions automatically
- **Tenant Admins**: Get permissions through RBAC system with `full_access` business template

---

## 🎨 **Frontend Implementation Guidelines**

### **1. Feature Definition Registration**

**MANDATORY**: Every new feature MUST be registered in `useFeaturePermissions.ts`:

```typescript
// File: teleops_frontend/src/hooks/useFeaturePermissions.ts

const FRONTEND_FEATURES = {
  // Follow this pattern EXACTLY
  resource_action: {
    featureId: "resource_action",
    featureName: "Human Readable Name",
    resourceType: "resource", // Must match database permission prefix
    requiredActions: ["action"], // Single action only
    description: "What this feature does",
  },
};
```

**✅ Correct Examples:**

```typescript
vendor_create: {
  featureId: "vendor_create",
  featureName: "Create Vendors",
  resourceType: "vendor",
  requiredActions: ["create"], // Only create, not ["read", "create"]
  description: "Add new vendors and establish relationships",
},

user_delete: {
  featureId: "user_delete",
  featureName: "Delete Users",
  resourceType: "user",
  requiredActions: ["delete"], // Only delete
  description: "Remove users from the system",
},
```

**❌ Incorrect Examples:**

```typescript
// WRONG: Multiple actions
vendor_create: {
  requiredActions: ["read", "create"], // ❌ Redundant
},

// WRONG: Mismatched resourceType
vendor_create: {
  resourceType: "vendor_management", // ❌ Should be "vendor"
},
```

### **2. Component Protection with FeatureGate**

**MANDATORY**: All UI elements that perform actions MUST be wrapped with `FeatureGate`:

```typescript
import { FeatureGate } from "../hooks/useFeaturePermissions";

// Protect buttons
<FeatureGate featureId="resource_create">
  <Button onClick={handleCreate}>Create Resource</Button>
</FeatureGate>

// Protect menu items
<FeatureGate featureId="resource_edit">
  <MenuItem onClick={handleEdit}>Edit Resource</MenuItem>
</FeatureGate>

// Protect icon buttons
<FeatureGate featureId="resource_delete">
  <IconButton onClick={handleDelete}>
    <Delete />
  </IconButton>
</FeatureGate>
```

### **3. Page-Level Protection**

**MANDATORY**: Entire pages MUST be protected with feature access checks:

```typescript
// At the top of your page component
const { hasFeatureAccess } = useFeaturePermissions();

// Early return if no access
if (!hasFeatureAccess("resource_view")) {
  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Typography variant="h6" color="error">
        Access Denied: You don't have permission to view this page.
      </Typography>
    </Box>
  );
}
```

### **4. Import Requirements**

Always import FeatureGate when protecting UI elements:

```typescript
import { FeatureGate } from "../hooks/useFeaturePermissions";
```

---

## ⚙️ **Backend Implementation Guidelines**

### **1. Feature Registry Registration**

**MANDATORY**: Every feature MUST be registered in the backend feature registry:

```python
# File: teleops_backend/apps/tenants/services/feature_registry.py

def register_resource_features(self):
    """Register all resource-related features"""

    # View feature
    self.register_feature(FeatureDefinition(
        feature_id="resource_view",
        feature_name="View Resources",
        resource_type="resource",
        component_path="pages/ResourcePage",
        api_endpoints=["/api/v1/resources/"],
        required_actions=["read"],
        description="View resource listings and details"
    ))

    # Create feature
    self.register_feature(FeatureDefinition(
        feature_id="resource_create",
        feature_name="Create Resources",
        resource_type="resource",
        component_path="pages/ResourcePage",
        api_endpoints=["/api/v1/resources/create/"],
        required_actions=["create"], # Single action only
        description="Add new resources to the system"
    ))
```

### **2. API Endpoint Protection**

**MANDATORY**: All API endpoints MUST check permissions:

```python
from apps.tenants.services.rbac_service import RBACService

class ResourceViewSet(viewsets.ModelViewSet):
    def create(self, request):
        # Check permission before any action
        rbac_service = RBACService()
        profile = request.user.tenant_user_profile

        permissions = rbac_service.get_user_effective_permissions(profile)
        user_permissions = permissions.get('permissions', {})

        # Check if user has create permission for this resource
        has_create = any(
            'create' in perm.get('actions', [])
            for code, perm in user_permissions.items()
            if code.startswith('resource.')
        )

        if not has_create:
            return Response(
                {"detail": "You don't have permission to create resources."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Proceed with creation...
```

### **3. Permission Code Format**

**MANDATORY**: All permission codes MUST follow this exact format:

```
{resource_type}.{business_template_suffix}

Examples:
- vendor.read
- vendor.read_create
- vendor.read_create_update
- vendor.read_create_update_delete
- user.read
- user.read_create_update
```

---

## ➕ **Adding New Features**

### **Step-by-Step Checklist**

#### **1. Database Permissions (if needed)**

```sql
-- Only if new resource type
INSERT INTO permission_registry (
    permission_name,
    permission_code,
    permission_category,
    resource_type,
    business_template
) VALUES (
    'View Resources',
    'resource.read',
    'Resource Management',
    'resource',
    'view_only'
);
```

#### **2. Backend Feature Registry**

```python
# Add to teleops_backend/apps/tenants/services/feature_registry.py
self.register_feature(FeatureDefinition(
    feature_id="resource_action",
    feature_name="Action Resources",
    resource_type="resource",
    component_path="pages/ResourcePage",
    api_endpoints=["/api/v1/resources/action/"],
    required_actions=["action"],
    description="Perform action on resources"
))
```

#### **3. Frontend Feature Definition**

```typescript
// Add to teleops_frontend/src/hooks/useFeaturePermissions.ts
resource_action: {
  featureId: "resource_action",
  featureName: "Action Resources",
  resourceType: "resource",
  requiredActions: ["action"],
  description: "Perform action on resources",
},
```

#### **4. Component Protection**

```typescript
// In your React component
<FeatureGate featureId="resource_action">
  <Button onClick={handleAction}>Action</Button>
</FeatureGate>
```

#### **5. API Protection**

```python
# In your Django view
# Check permissions before allowing action
```

---

## 🧪 **Testing RBAC Compliance**

### **Manual Testing Checklist**

For each new feature, test with these user types:

#### **1. View-Only User** (`resource.read`)

- ✅ Can see: List pages, view details
- ❌ Cannot see: Create buttons, Edit menus, Delete buttons

#### **2. Creator User** (`resource.read_create`)

- ✅ Can see: List pages, view details, Create buttons
- ❌ Cannot see: Edit menus, Delete buttons

#### **3. Contributor User** (`resource.read_create_update`)

- ✅ Can see: List pages, view details, Create buttons, Edit menus
- ❌ Cannot see: Delete buttons

#### **4. Full Access User** (`resource.read_create_update_delete`)

- ✅ Can see: Everything

#### **5. No Permission User**

- ❌ Cannot see: Entire page/feature

### **Test User Creation**

Create test users with specific permissions:

```sql
-- View-only user permission
INSERT INTO user_permission_overrides (user_profile_id, permission_id, permission_level, is_granted)
SELECT up.id, pr.id, 'view_only', true
FROM tenant_user_profiles up, permission_registry pr
WHERE up.user_id = {USER_ID} AND pr.permission_code = 'resource.read';

-- Full access user permission
INSERT INTO user_permission_overrides (user_profile_id, permission_id, permission_level, is_granted)
SELECT up.id, pr.id, 'full_access', true
FROM tenant_user_profiles up, permission_registry pr
WHERE up.user_id = {USER_ID} AND pr.permission_code = 'resource.read_create_update_delete';
```

---

## 🔄 **Common Patterns**

### **Pattern 1: CRUD Resource Management**

```typescript
// Frontend features
const FRONTEND_FEATURES = {
  resource_view: { requiredActions: ["read"] },
  resource_create: { requiredActions: ["create"] },
  resource_edit: { requiredActions: ["update"] },
  resource_delete: { requiredActions: ["delete"] },
};

// Component implementation
<FeatureGate featureId="resource_create">
  <Button onClick={handleCreate}>Create</Button>
</FeatureGate>

<FeatureGate featureId="resource_edit">
  <MenuItem onClick={handleEdit}>Edit</MenuItem>
</FeatureGate>

<FeatureGate featureId="resource_delete">
  <IconButton onClick={handleDelete}><Delete /></IconButton>
</FeatureGate>
```

### **Pattern 2: Bulk Operations**

```typescript
// For bulk operations, use the highest required permission
bulk_delete_resources: {
  featureId: "bulk_delete_resources",
  requiredActions: ["delete"], // Highest permission needed
}
```

### **Pattern 3: Administrative Functions**

```typescript
// Administrative functions typically require update permissions
manage_resource_settings: {
  featureId: "manage_resource_settings",
  requiredActions: ["update"],
}
```

---

## 🔧 **Migration & Legacy Compatibility**

### **Permission Format Consistency**

**CRITICAL**: When adding new features, always check existing database permissions first!

#### **Common Issue: Resource Type Mismatch**

```sql
-- Check existing permissions before defining features
SELECT DISTINCT permission_code, resource_type
FROM permission_registry
WHERE permission_code LIKE 'resource_name%';
```

**Example Problem:**

- **Feature Registry**: `resource_type="site"` → expects `site.read`
- **Database Reality**: `site_management.view_sites`
- **Result**: ❌ Permission checks fail

**Solution:**

```python
# WRONG: Using new format when database has old format
resource_type="site"  # Expects site.read

# CORRECT: Match existing database format
resource_type="site_management"  # Matches site_management.view_sites
```

#### **Migration Strategy for Existing Systems:**

1. **Check Database First**: `SELECT permission_code FROM permission_registry WHERE permission_code LIKE 'resource%'`
2. **Update Feature Registry**: Match existing database format
3. **Update Permission Checks**: Ensure API views check correct format
4. **Test All Related Features**: Verify all CRUD operations work

#### **STANDARDIZED Resource Format (Current):**

**✅ All permissions now use consistent `resource.action` format:**

| Resource Type | Permission Examples                                                     | Feature Registry          |
| ------------- | ----------------------------------------------------------------------- | ------------------------- |
| User          | `user.read`, `user.create`, `user.update`, `user.delete`                | `resource_type="user"`    |
| Site          | `site.read`, `site.create`, `site.update`, `site.delete`                | `resource_type="site"`    |
| Project       | `project.read`, `project.create`, `project.update`                      | `resource_type="project"` |
| Vendor        | `vendor.read`, `vendor.read_create`, `vendor.read_create_update_delete` | `resource_type="vendor"`  |
| Task          | `task.read`, `task.create`, `task.assign`, `task.update`                | `resource_type="task"`    |
| RBAC          | `rbac.read`, `rbac.update`, `rbac.grant`, `rbac.audit`                  | `resource_type="rbac"`    |

#### **Migration from Legacy Format:**

**❌ Legacy (pre-standardization):**

- `user_management.view_users` → `user.read`
- `site_management.create_sites` → `site.create`
- `project_management.edit_projects` → `project.update`
- `rbac_management.view_permissions` → `rbac.read`

**🔧 Migration Command:**

```bash
# Preview changes
python manage.py standardize_permissions --dry-run

# Apply changes
python manage.py standardize_permissions
```

---

## 🚨 **Critical Rules**

### **❌ NEVER DO THESE:**

1. **Don't hardcode permissions in components**

   ```typescript
   // WRONG
   if (userPermissions.includes('vendor.edit')) {

   // CORRECT
   <FeatureGate featureId="vendor_edit">
   ```

2. **Don't use multiple actions in requiredActions**

   ```typescript
   // WRONG
   requiredActions: ["read", "create"];

   // CORRECT
   requiredActions: ["create"]; // "create" implies "read"
   ```

3. **Don't bypass FeatureGate for any interactive element**

   ```typescript
   // WRONG
   <Button onClick={handleCreate}>Create</Button>

   // CORRECT
   <FeatureGate featureId="resource_create">
     <Button onClick={handleCreate}>Create</Button>
   </FeatureGate>
   ```

4. **Don't forget backend permission checks**

   ```python
   # WRONG: No permission check
   def create(self, request):
       return self.perform_create()

   # CORRECT: Always check permissions
   def create(self, request):
       if not self.check_permission('create'):
           return Response(status=403)
       return self.perform_create()
   ```

### **✅ ALWAYS DO THESE:**

1. **Register features in BOTH frontend and backend**
2. **Use single action in requiredActions**
3. **Wrap ALL interactive elements with FeatureGate**
4. **Check permissions in ALL API endpoints**
5. **Test with different permission levels**
6. **Follow exact naming conventions**

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue**: Button shows for view-only user

**Solution**:

1. Check if feature is registered in `FRONTEND_FEATURES`
2. Verify `resourceType` matches permission code prefix
3. Ensure `FeatureGate` is properly wrapped around button

#### **Issue**: Permission check failing

**Solution**:

1. Verify permission exists in database with correct code format
2. Check user actually has the permission assigned
3. Verify `business_template` matches expected actions

#### **Issue**: Admin user blocked from action

**Solution**:

1. Check if admin has proper designation with `full_access` template
2. Verify RBAC service returns permissions for admin
3. Check `/auth/verify` API returns correct permissions

#### **Issue**: API returns 500 error on permission check

**Solution**:

1. Check backend feature is registered in `feature_registry.py`
2. Verify Django model permissions are correct
3. Check RBAC service is properly configured

---

## 📞 **Support & References**

### **Key Files to Reference:**

- `teleops_frontend/src/hooks/useFeaturePermissions.ts` - Frontend feature definitions
- `teleops_backend/apps/tenants/services/feature_registry.py` - Backend feature registry
- `teleops_backend/apps/tenants/services/rbac_service.py` - Permission calculation logic
- `teleops_backend/apps/tenants/constants.py` - Business template mappings

### **Database Tables:**

- `permission_registry` - All available permissions
- `designation_permissions` - Role-based permissions
- `user_permission_overrides` - User-specific overrides
- `tenant_user_profiles` - User profile information

### **Testing URLs:**

- `/auth/verify` - Check user permissions
- `/api/v1/tenants/rbac/permissions/` - View all permissions
- `/api/v1/tenants/rbac/user-dashboard/{user_id}/` - View user-specific permissions

---

## 🎯 **Final Checklist for New Features**

Before marking any feature complete, verify:

- [ ] **Use standardized permission format** - `resource.action` (e.g., `user.read`, `site.create`)
- [ ] **Resource type matches format** - Use clean resource names (e.g., `"user"`, `"site"`, not `"user_management"`)
- [ ] Feature registered in both frontend and backend
- [ ] All UI elements wrapped with FeatureGate
- [ ] API endpoints check permissions with correct resource prefix
- [ ] Tested with all permission levels (view/create/update/delete)
- [ ] Permission codes follow standardized naming convention
- [ ] Single action used in requiredActions
- [ ] Database permissions use consistent format
- [ ] No hardcoded permission checks in components
- [ ] TypeScript compilation passes without errors
- [ ] Manual testing completed with different user types
- [ ] **Migration verified** - If working with existing system, run standardization migration

**Remember: Every interactive element must be permission-gated. No exceptions!**

---

_This guide ensures all future development maintains proper RBAC compliance and security standards._
