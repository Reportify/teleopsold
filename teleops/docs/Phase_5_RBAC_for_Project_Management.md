# Phase 5: RBAC for Project Management

## Overview

This phase introduces project-specific permissions across Design, Inventory, and Task modules using the standardized `resource.action` format. It aligns with the unified RBAC architecture and provides a migration path from the current state (no project-based permissions) to full enforcement.

---

## Permission Model

```yaml
Resources & Actions (standardized):
  project:
    - read, create, update, delete
  design:
    - read, create, update, approve, delete
  inventory:
    - read, create, update, allocate, serial, bulk_upload, delete
  site:
    - read, create, update, delete
  task:
    - read, create, update, assign, verify, delete
```

### Permission Codes

```yaml
Examples:
  - project.read
  - project.create
  - design.read
  - design.update
  - design.approve
  - inventory.allocate
  - inventory.serial
  - task.assign
  - task.verify
```

---

## Backend Integration

### Feature Registry Entries

```python
# teleops_backend/apps/tenants/services/feature_registry.py
self.register_feature(FeatureDefinition(
  feature_id="project_view",
  feature_name="View Projects",
  resource_type="project",
  api_endpoints=["/api/v1/projects/"],
  required_actions=["read"],
))

self.register_feature(FeatureDefinition(
  feature_id="design_update",
  feature_name="Update Design",
  resource_type="design",
  api_endpoints=["/api/v1/projects/{id}/design/"],
  required_actions=["update"],
))

self.register_feature(FeatureDefinition(
  feature_id="inventory_allocate",
  feature_name="Allocate Inventory",
  resource_type="inventory",
  api_endpoints=["/api/v1/inventory/items/{id}/allocations/"],
  required_actions=["allocate"],
))

self.register_feature(FeatureDefinition(
  feature_id="task_verify",
  feature_name="Verify Task",
  resource_type="task",
  api_endpoints=["/api/v1/tasks/{id}/status/"],
  required_actions=["verify"],
))
```

### API Permission Checks

- Use unified `HasRBACPermission` for all endpoints
- Map endpoint → resource_type + required_action
- Deny with 403 and standardized payload on failure

---

## Frontend Integration

### Feature Definitions

```typescript
// teleops_frontend/src/hooks/useFeaturePermissions.ts
export const FRONTEND_FEATURES = {
  project_view: { featureId: "project_view", resourceType: "project", requiredActions: ["read"], featureName: "View Projects" },
  design_update: { featureId: "design_update", resourceType: "design", requiredActions: ["update"], featureName: "Update Design" },
  inventory_allocate: { featureId: "inventory_allocate", resourceType: "inventory", requiredActions: ["allocate"], featureName: "Allocate Inventory" },
  task_verify: { featureId: "task_verify", resourceType: "task", requiredActions: ["verify"], featureName: "Verify Task" },
};
```

### Component Protection

```tsx
<FeatureGate featureId="design_update">
  <Button onClick={handleSave}>Save Design</Button>
</FeatureGate>

<FeatureGate featureId="inventory_allocate">
  <Button onClick={openAllocateDialog}>Allocate</Button>
</FeatureGate>

<FeatureGate featureId="task_verify">
  <Button color="success" onClick={handleVerify}>Verify</Button>
</FeatureGate>
```

---

## Migration Plan (Current → RBAC)

```yaml
Phase A (Preparation):
  - Inventory existing endpoints
  - Define resource_type and action per endpoint
  - Seed permission_registry with standardized codes

Phase B (Registration):
  - Register features in backend registry
  - Define FRONTEND_FEATURES entries

Phase C (Soft Enforcement):
  - Enable permission checks with fallback logging
  - Monitor 403 patterns and fill missing mappings

Phase D (Hard Enforcement):
  - Enforce HasRBACPermission on all endpoints
  - Remove legacy bypasses
  - Update /auth/verify to reflect effective permissions
```

---

## Testing Strategy

- Matrix testing for view/create/update/delete per resource
- Page-level protection (no access without read)
- Button/menu protection (single-action required)
- API-level 403 with standardized payload
- Admin and non-admin scenarios, including overrides

---

## Success Criteria

- [ ] All project-related endpoints protected with standardized RBAC
- [ ] Feature gates applied to all interactive UI controls
- [ ] Permissions visible and verifiable via /auth/verify
- [ ] Soft → hard enforcement completed without regressions
- [ ] Audit trail for permission denials and grants
