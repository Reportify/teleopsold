# Phase 4: Task Creation & Execution Specification

## Overview

Phase 4 implements Task Management for executing dismantling and other project activities. Supports single-site and multi-site tasks (e.g., MW far-end/near-end coordination), VLT-style verification (GPS photo tagging), checklists, SLA tracking, and field execution via mobile-friendly flows.

---

## Business Context

```yaml
Objectives:
  - Create and assign tasks to teams and field users
  - Support single-site and multi-site workflows
  - Provide checklists and dynamic forms
  - Capture GPS-tagged photo evidence
  - Track SLAs, status, and progress
  - Enable audit-ready verification and sign-off
```

---

## Data Model (Logical)

```yaml
Tables:
  Task:
    - id, project_id(FK), created_by, assigned_to(optional)
    - task_type (survey|dismantle|transport|install|verification|custom)
    - scope_notes (text)
    - priority (low|medium|high|critical)
    - status (new|assigned|in_progress|on_hold|completed|rejected)
    - sla_due_at (datetime)
    - created_at, updated_at

  TaskSite:
    - id, task_id(FK), project_site_id(FK)
    - role_label (near_end|far_end|primary|secondary|other)

  TaskChecklistItem:
    - id, task_id(FK)
    - title, description
    - is_mandatory (bool)
    - order_index (int)

  TaskChecklistResponse:
    - id, checklist_item_id(FK), user_id(FK)
    - response (boolean|string|number|json)
    - responded_at (datetime)

  TaskEvidence:
    - id, task_id(FK), user_id(FK)
    - evidence_type (photo|doc|note|location)
    - file_path (nullable), file_name, file_size
    - gps_lat, gps_lng, captured_at
    - remarks (text)
```

---

## API Endpoints

```yaml
# Core task management
GET    /api/v1/projects/{project_id}/tasks/                 # List tasks
POST   /api/v1/projects/{project_id}/tasks/                 # Create task
GET    /api/v1/tasks/{task_id}/                             # Task details
PUT    /api/v1/tasks/{task_id}/                             # Update task
POST   /api/v1/tasks/{task_id}/assign/                      # Assign user/team
POST   /api/v1/tasks/{task_id}/status/                      # Update status

# Sites & roles within tasks
GET    /api/v1/tasks/{task_id}/sites/                       # List task sites
POST   /api/v1/tasks/{task_id}/sites/                       # Add site with role
DELETE /api/v1/task-sites/{id}/                              # Remove task site

# Checklists
GET    /api/v1/tasks/{task_id}/checklist/                   # List checklist
POST   /api/v1/tasks/{task_id}/checklist/                   # Create checklist items (bulk)
POST   /api/v1/checklist/{item_id}/response/                # Submit response

# Evidence
GET    /api/v1/tasks/{task_id}/evidence/                    # List evidence
POST   /api/v1/tasks/{task_id}/evidence/                    # Upload evidence (multipart), supports GPS
DELETE /api/v1/evidence/{evidence_id}/                      # Delete evidence
```

---

## Detailed API Specifications

### Create Task (Multi-site example)

```yaml
POST /api/v1/projects/{project_id}/tasks/
Auth: JWT
Permissions: task.create
Payload:
{
  "task_type": "dismantle",
  "scope_notes": "Dismantle MW link",
  "priority": "high",
  "sla_due_at": "2025-01-20T18:00:00Z",
  "sites": [
    { "project_site_id": 101, "role_label": "near_end" },
    { "project_site_id": 102, "role_label": "far_end" }
  ],
  "checklist": [
    { "title": "Power off equipment", "is_mandatory": true },
    { "title": "Remove cables", "is_mandatory": true }
  ]
}

201 Response:
{
  "id": 44,
  "project_id": 5,
  "task_type": "dismantle",
  "priority": "high",
  "status": "new",
  "sites": [
    { "id": 1001, "project_site_id": 101, "role_label": "near_end" },
    { "id": 1002, "project_site_id": 102, "role_label": "far_end" }
  ],
  "checklist": [
    { "id": 2001, "title": "Power off equipment", "is_mandatory": true },
    { "id": 2002, "title": "Remove cables", "is_mandatory": true }
  ]
}
```

### Submit Evidence (GPS + Photo)

```yaml
POST /api/v1/tasks/{task_id}/evidence/
Auth: JWT
Permissions: task.update
Multipart:
  - file: photo.jpg
  - gps_lat: 23.0234
  - gps_lng: 72.5714
  - captured_at: 2025-01-18T12:30:00Z
  - remarks: "Antenna removed"

201 Response:
{
  "id": 600,
  "task_id": 44,
  "evidence_type": "photo",
  "file_name": "photo.jpg",
  "gps_lat": 23.0234,
  "gps_lng": 72.5714,
  "captured_at": "2025-01-18T12:30:00Z"
}
```

### Update Status

```yaml
POST /api/v1/tasks/{task_id}/status/
Auth: JWT
Permissions: task.update
Payload:
{
  "status": "completed",
  "remarks": "Verified and complete"
}

200 Response:
{
  "id": 44,
  "status": "completed",
  "completed_at": "2025-01-18T17:00:00Z"
}
```

---

## Validation Rules

```yaml
Task:
  - task_type: required (enum)
  - priority: enum
  - sla_due_at: must be >= now
  - status transitions validated (new→assigned→in_progress→completed)

TaskSite:
  - project_site_id must belong to project
  - role_label: near_end/far_end/primary/secondary/other

Checklist:
  - title: required
  - is_mandatory: boolean

Evidence:
  - file max size 20MB
  - gps_lat/gps_lng: valid coordinates
  - captured_at within project timeline
```

---

## Workflow

```yaml
Flow: 1) Create task with sites and checklist
  2) Assign to user/team; notify assignee(s)
  3) Field execution with mobile-friendly UI
  4) Capture evidence (GPS/photos/notes)
  5) Complete checklist; submit for verification
  6) Supervisor verifies; task completed
  7) SLA and KPI reporting
```

---

## Security & Audit

- Tenant isolation on task, sites, evidence
- Feature gating (Phase 5)
- Audit trail for status changes, assignments, evidence
- Optional geofence validation for GPS

---

## Implementation Checklist

- [ ] Models/migrations for tasks, sites, checklists, evidence
- [ ] Endpoints/serializers and permissions
- [ ] Evidence storage and signed URLs
- [ ] Mobile-first components and offline-friendly patterns
- [ ] Notifications for assignments and status changes
- [ ] Dashboards/KPI reports
- [ ] Tests: transitions, evidence validation, SLA metrics

---

## Success Criteria

- [ ] Tasks support single-site/multi-site operations
- [ ] Checklists and evidence capture complete the verification loop
- [ ] SLA tracking and reporting implemented
- [ ] Secure storage and audit-complete records
