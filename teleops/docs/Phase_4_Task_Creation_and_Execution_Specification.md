# Phase 4: Project Vendor Onboarding & Management Specification

## Overview

Phase 4 enables a client tenant to invite and manage vendors for a specific project. It relies on the already-implemented Client–Vendor relationships and adds project‑scoped vendor linking, invitations, and operational controls (hold, suspend, remove).

---

## Business Context

```yaml
Objectives:
  - Invite vendor organizations (from client’s vendor list) to collaborate on a project
  - Provide project‑level visibility of active and invited vendors
  - Control participation (Hold, Suspend, Remove)
  - Track invitation lifecycle (pending/accepted/declined/expired)
  - Ensure secure, auditable onboarding with tenant isolation
```

---

## Data Model (Logical)

Uses existing ClientVendorRelationship for the org‑level link.

```yaml
Tables:
  ProjectVendor:
    - id, project_id(FK)
    - relationship_id(FK -> ClientVendorRelationship)
    - vendor_tenant_id(FK, nullable until accepted)
    - scope_notes (text)
    - start_at(datetime, nullable), end_at(datetime, nullable)
    - status (active|hold|suspended|removed)
    - created_by, created_at, updated_at

  VendorInvitation:
    - id, project_id(FK)
    - relationship_id(FK -> ClientVendorRelationship)
    - invite_email (string)
    - token (unique), expires_at(datetime)
    - status (pending|accepted|declined|revoked|expired|discarded)
    - invited_by(user_id), invited_at, responded_at(nullable)
    - accepted_by_user_id(nullable)
```

State transitions

```yaml
Invitation: pending -> accepted|declined|revoked|expired|discarded
ProjectVendor: active <-> hold, active <-> suspended, removed (terminal)
```

---

## API Endpoints

```yaml
# Project vendor listing & controls
GET    /api/v1/projects/{project_id}/vendors/                    # List active vendors
POST   /api/v1/projects/{project_id}/vendors/                    # (Optional) Directly link relationship as active
PATCH  /api/v1/projects/{project_id}/vendors/{id}/status/        # Hold/Suspend/Remove

# Invitations
GET    /api/v1/projects/{project_id}/vendor-invitations/         # List invitations
POST   /api/v1/projects/{project_id}/vendor-invitations/         # Create invite {relationship_id, invite_email, expires_in_days?, scope_notes?}
POST   /api/v1/vendor-invitations/{id}/resend/                   # Resend invite
POST   /api/v1/vendor-invitations/{id}/discard/                  # Discard invite (revokes token)

# Vendor acceptance flow (public endpoints with signed token)
GET    /api/v1/vendor-invitations/{token}/                       # Preview invite status/details
POST   /api/v1/vendor-invitations/{token}/accept/                # Accept -> create/activate ProjectVendor
POST   /api/v1/vendor-invitations/{token}/decline/               # Decline
```

Notes

- Relationship CRUD already exists (org‑level). This phase scopes to project operations and invitations only.
- When an invitation is accepted, create `ProjectVendor(status=active)` and link `vendor_tenant_id` if known.

---

## UI/UX

### Project Details – Vendor Card

- Shows count of active vendors for the project (badge)
- “Details” button → navigates to Project Vendors page

### Project Vendors Page

- Sections/Tabs:
  1. Active Vendors
     - Table columns: Vendor Name, Scope, Status chip (active/hold/suspended/removed), Start/End, Actions
     - Actions per row: Hold, Resume, Suspend, Remove (with confirmation)
  2. Invitations
     - Invite Vendor modal: select from client’s vendor list (relationships), optional email override, scope notes, expiry
     - Table columns: Vendor Name, Invite Email, Status chip (pending/accepted/declined/expired/revoked/discarded), Expires, Actions
     - Actions: Resend, Copy Invitation Link, Discard

### Vendor Acceptance Page (Public)

- Token verification and summary (client + project + vendor org name)
- Optional NDA checkbox
- Accept / Decline actions with clear outcomes

---

## Validation & Security

```yaml
Invitations:
  - relationship_id must belong to the client tenant
  - invite_email required (default to vendor primary contact if empty)
  - token is single‑use and time‑bound
  - resend throttled (e.g., >= 60s per invite)

ProjectVendor:
  - one active record per (project, relationship) pair
  - status transitions validated (removed is terminal)

Security:
  - Tenant isolation enforced on all endpoints
  - Project‑scoped RBAC for vendor_admin/vendor_member
  - Full audit trail: who invited, accepted, status changes
```

---

## Reporting

- Project vendor count, pending invites, accept rate, time‑to‑accept
- Export CSV for vendor roster and invitations

---

## Implementation Checklist

- [ ] Models/migrations: `ProjectVendor`, `VendorInvitation`
- [ ] Endpoints/serializers for project vendors and invitations
- [ ] Email templates and background‑safe sending
- [ ] Project Details: Vendor card (count + Details)
- [ ] Project Vendors page: tabs (Active, Invitations), actions, Invite modal
- [ ] Public acceptance page (token‑based)
- [ ] Tests: token validation, transitions, permissions, throttling

---

## Success Criteria

- [ ] Client can invite vendors from its vendor list to a project
- [ ] Invitations track status and allow discard/resend/copy-link
- [ ] Accepted invitations automatically link vendor as active for the project
- [ ] Client can hold/suspend/remove vendors per project with full audit
