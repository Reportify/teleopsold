# Phase 5: RBAC for Project Management

## Overview

This phase introduces project-specific permissions across Design, Inventory, Sites, and Vendors using the standardized `resource.action` format. It aligns with the unified RBAC architecture and provides a migration path from the current state (limited checks) to full enforcement.

Important scope notes (from Phase 4 – Vendors & Associated Projects):

- Vendors can access only basic Project details (name, circle, description, scope, dates, status). They must not see Sites or Inventory.
- Visibility is scoped: the Client (project owner) sees only their direct vendors; a Vendor sees only its own sub‑vendors (and related invitations). Public invite preview/accept/decline remain unauthenticated and outside RBAC.

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
  vendor:
    - read, create, update, delete
  vendor_invitation:
    - read, create, resend, discard
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

# Vendors & Invitations (Phase 4/5)
self.register_feature(FeatureDefinition(
  feature_id="vendor_view",
  feature_name="View Project Vendors",
  resource_type="vendor",
  api_endpoints=["/api/v1/projects/{id}/vendors/"],
  required_actions=["read"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_create",
  feature_name="Create Project Vendor",
  resource_type="vendor",
  api_endpoints=["/api/v1/projects/{id}/vendors/"],
  required_actions=["create"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_update",
  feature_name="Update Project Vendor Status",
  resource_type="vendor",
  api_endpoints=["/api/v1/projects/{id}/vendors/{vendor_id}/status/"],
  required_actions=["update"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_invitation_view",
  feature_name="View Vendor Invitations",
  resource_type="vendor_invitation",
  api_endpoints=["/api/v1/projects/{id}/vendor-invitations/"],
  required_actions=["read"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_invitation_create",
  feature_name="Create Vendor Invitation",
  resource_type="vendor_invitation",
  api_endpoints=["/api/v1/projects/{id}/vendor-invitations/"],
  required_actions=["create"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_invitation_resend",
  feature_name="Resend Vendor Invitation",
  resource_type="vendor_invitation",
  api_endpoints=["/api/v1/projects/{id}/vendor-invitations/{invite_id}/resend/"],
  required_actions=["resend"],
))

self.register_feature(FeatureDefinition(
  feature_id="vendor_invitation_discard",
  feature_name="Discard Vendor Invitation",
  resource_type="vendor_invitation",
  api_endpoints=["/api/v1/projects/{id}/vendor-invitations/{invite_id}/discard/"],
  required_actions=["discard"],
))
```

### API Permission Checks

- Use unified `HasRBACPermission` for all endpoints.
- Map endpoint → resource_type + required_action (see mapping below).
- Enforce owner/vendor scoping in addition to RBAC:
  - Owner (client) sees only direct vendors (`relationship.client_tenant == project.client_tenant`).
  - Vendor sees only sub‑vendors (`relationship.client_tenant == current tenant`).
  - Vendors cannot access Sites/Inventory endpoints.
- Public routes excluded from RBAC: `/api/v1/projects/invitations/{token}/` preview/accept/decline.

Endpoint → permission mapping (non‑exhaustive):

```yaml
/api/v1/projects/ (GET)                     -> project.read
/api/v1/projects/ (POST)                    -> project.create
/api/v1/projects/{id}/ (GET)                -> project.read (vendor gets slim payload)
/api/v1/projects/{id}/ (PATCH/PUT)          -> project.update

/api/v1/projects/{id}/sites/**              -> site.read|create|update|delete
/api/v1/projects/{id}/inventory/**          -> inventory.read|create|update|allocate|serial|bulk_upload|delete
/api/v1/projects/{id}/design/**             -> design.read|create|update|approve|delete

/api/v1/projects/{id}/vendors/ (GET)        -> vendor.read (scoped by role)
/api/v1/projects/{id}/vendors/ (POST)       -> vendor.create (scoped by role)
/api/v1/projects/{id}/vendors/{vid}/status/ -> vendor.update (scoped by role)

/api/v1/projects/{id}/vendor-invitations/ (GET)               -> vendor_invitation.read (scoped by role)
/api/v1/projects/{id}/vendor-invitations/ (POST)              -> vendor_invitation.create (scoped by role)
/api/v1/projects/{id}/vendor-invitations/{iid}/resend/ (POST) -> vendor_invitation.resend (scoped by role)
/api/v1/projects/{id}/vendor-invitations/{iid}/discard/ (POST)-> vendor_invitation.discard (scoped by role)
```

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
  vendor_view: { featureId: "vendor_view", resourceType: "vendor", requiredActions: ["read"], featureName: "View Project Vendors" },
  vendor_create: { featureId: "vendor_create", resourceType: "vendor", requiredActions: ["create"], featureName: "Create Vendor" },
  vendor_update: { featureId: "vendor_update", resourceType: "vendor", requiredActions: ["update"], featureName: "Update Vendor Status" },
  vendor_invitation_view: { featureId: "vendor_invitation_view", resourceType: "vendor_invitation", requiredActions: ["read"], featureName: "View Vendor Invitations" },
  vendor_invitation_create: { featureId: "vendor_invitation_create", resourceType: "vendor_invitation", requiredActions: ["create"], featureName: "Create Vendor Invitation" },
  vendor_invitation_resend: { featureId: "vendor_invitation_resend", resourceType: "vendor_invitation", requiredActions: ["resend"], featureName: "Resend Vendor Invitation" },
  vendor_invitation_discard: { featureId: "vendor_invitation_discard", resourceType: "vendor_invitation", requiredActions: ["discard"], featureName: "Discard Vendor Invitation" },
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

// Project Details
<FeatureGate featureId="site_view">
  {/* Sites card + navigation */}
</FeatureGate>
<FeatureGate featureId="inventory_view">
  {/* Inventory card + navigation */}
</FeatureGate>
<FeatureGate featureId="vendor_view">
  {/* Project Vendors card + navigation */}
</FeatureGate>

// Project Vendors Page
<FeatureGate featureId="vendor_invitation_create">
  <Button onClick={openInvite}>Invite Vendor</Button>
</FeatureGate>
<FeatureGate featureId="vendor_update">
  <Button onClick={handleHold}>Hold</Button>
</FeatureGate>
<FeatureGate featureId="vendor_invitation_resend">
  <Button onClick={handleResend}>Resend</Button>
</FeatureGate>
<FeatureGate featureId="vendor_invitation_discard">
  <Button onClick={handleDiscard}>Discard</Button>
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
  - Verify owner/vendor scoping for vendors & invitations
  - Confirm Vendors cannot access Sites/Inventory endpoints

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
- Owner vs Vendor scenarios (scoping): direct vendors vs sub‑vendors, vendor project details without Sites/Inventory

---

## Success Criteria

- [ ] All project-related endpoints protected with standardized RBAC
- [ ] Vendor and Vendor Invitation features registered and enforced
- [ ] Owner/vendor scoping enforced for vendor and invitation endpoints
- [ ] Vendors cannot access Sites/Inventory endpoints; vendor detail returns slim payload
- [ ] Feature gates applied to all interactive UI controls
- [ ] Permissions visible and verifiable via /auth/verify
- [ ] Soft → hard enforcement completed without regressions
- [ ] Audit trail for permission denials and grants
