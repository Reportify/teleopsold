# Teleops Support & Ticketing System Documentation

> **Note:**
> This document is the authoritative, comprehensive reference for all Teleops support/ticketing system features, workflows, database schema, and APIs. Other documents (such as the Internal Portal specification) only summarize support features and refer here for all advanced details. For any support/ticketing implementation, integration, or analytics, always consult this document first.

## 1. Overview & Purpose

The Teleops Support & Ticketing System is designed to provide users, clients, and administrators with a robust, transparent, and efficient way to request help, report issues, and track resolutions. It ensures prompt, accountable, and high-quality support, aligning with industry standards for enterprise SaaS platforms.

---

## 2. User Roles & Access

- **End User:** Can create, view, and comment on their own tickets; receive notifications.
- **Support Agent:** Can view, assign, update, and resolve tickets; communicate with users; escalate as needed.
- **Support Admin:** Full access to all tickets, reporting, configuration, and automation rules.
- **Manager/Executive:** Read-only access to analytics, SLAs, and ticket trends.

---

## 3. Ticket Lifecycle & Statuses

### Ticket Lifecycle Stages

1. **New:** Ticket created, not yet assigned.
2. **Open:** Assigned to an agent, under investigation.
3. **In Progress:** Actively being worked on.
4. **Pending:** Awaiting user response or third-party input.
5. **Resolved:** Solution provided, pending user confirmation.
6. **Closed:** Confirmed resolved or auto-closed after timeout.
7. **Reopened:** User indicates issue persists after closure.

### Status Transitions

- Users and agents can comment at any stage.
- Only agents/admins can change status except for reopening (user-initiated).

---

## 4. Ticket Categories & Prioritization

- **Categories:** Onboarding, Access, Technical Issue, Billing, Feature Request, Security, Other
- **Priority Levels:**
  - Low (non-urgent)
  - Medium (standard)
  - High (business impact)
  - Critical (system down/security)
- **SLA Targets:** Defined per priority (e.g., Critical: 1h response, 4h resolution)

---

## 5. Communication & Notifications

- **Email Notifications:**
  - On ticket creation, assignment, status change, agent/user comment, resolution, closure
- **In-App Notifications:**
  - Real-time updates for assigned agents and ticket owners
- **Comment Threads:**
  - Chronological, with role-based visibility (public/private/internal notes)
- **@Mentions:**
  - Notify specific agents or users

---

## 6. Attachments & File Handling

- Users and agents can attach files (screenshots, logs, documents)
- File size and type restrictions (configurable)
- Virus/malware scanning on upload
- Secure, access-controlled storage

---

## 7. Admin & Agent Features

- **Dashboard:**
  - Ticket queue, filters (status, priority, category, assignee, SLA breach)
- **Bulk Actions:**
  - Assign, close, change priority/status for multiple tickets
- **Ticket Assignment:**
  - Manual or auto-assignment (round-robin, skill-based)
- **Internal Notes:**
  - Private comments visible only to agents/admins
- **Escalation:**
  - Escalate to higher tier or specialist
- **Merge/Duplicate Detection:**
  - Merge related tickets, flag duplicates

---

## 8. Automation & SLA Management

- **SLA Policies:**
  - Configurable per category/priority
  - Automated reminders/escalations for SLA breaches
- **Automation Rules:**
  - Auto-assign based on category, auto-close after inactivity, auto-respond with FAQs
- **Macros/Quick Replies:**
  - Predefined responses for common issues

---

## 9. Reporting & Analytics

- **Standard Reports:**
  - Ticket volume, resolution time, SLA compliance, agent performance, category trends
- **Custom Reports:**
  - Filter by date, user, category, priority, etc.
- **Export:**
  - CSV, Excel, PDF export options
- **Dashboards:**
  - Visual charts for open/closed tickets, SLA breaches, satisfaction ratings

---

## 10. Security, Privacy & Compliance

- **Authentication:** Only authenticated users can access support features
- **Authorization:** Role-based access to tickets and actions
- **Data Privacy:**
  - User data only visible to authorized roles
  - GDPR/industry compliance for data retention and deletion
- **Audit Logs:**
  - All actions (status changes, comments, assignments) are logged
- **File Security:**
  - All uploads scanned and access-controlled

---

## 11. Database Schema

### 11.1. Table Definitions

```sql
-- Support Tickets
CREATE TABLE support_tickets (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL, -- For multi-tenancy
    created_by INTEGER NOT NULL REFERENCES auth_user(id),
    assigned_to INTEGER REFERENCES auth_user(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'New',
    sla_due_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    satisfaction_rating INTEGER, -- 1-5 (CSAT)
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CHECK (status IN ('New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Reopened'))
);

-- Ticket Comments
CREATE TABLE support_comments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES auth_user(id),
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal note
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Attachments
CREATE TABLE support_attachments (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    uploaded_by INTEGER NOT NULL REFERENCES auth_user(id),
    file_path VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SLA Logs
CREATE TABLE support_sla_logs (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    event VARCHAR(50) NOT NULL, -- e.g., 'SLA_BREACH', 'SLA_WARNING'
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details TEXT
);

-- Ticket Audit Log
CREATE TABLE support_ticket_audit (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- e.g., 'Status Change', 'Assignment', 'Comment Added'
    performed_by INTEGER REFERENCES auth_user(id),
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 11.2. Entity Relationship Diagram (ERD)

- **support_tickets** ←→ **support_comments** (1-to-many)
- **support_tickets** ←→ **support_attachments** (1-to-many)
- **support_tickets** ←→ **support_sla_logs** (1-to-many)
- **support_tickets** ←→ **support_ticket_audit** (1-to-many)

---

## 12. API Endpoints & Examples

- `POST /api/v1/support/tickets/` — Create a new support ticket
- `GET /api/v1/support/tickets/` — List tickets (user: own, agent/admin: all)
- `GET /api/v1/support/tickets/{id}/` — Get ticket details
- `PATCH /api/v1/support/tickets/{id}/` — Update ticket (status, priority, assignment)
- `POST /api/v1/support/tickets/{id}/comment/` — Add comment to ticket
- `POST /api/v1/support/tickets/{id}/attachment/` — Upload attachment
- `GET /api/v1/support/tickets/{id}/attachments/` — List/download attachments
- `GET /api/v1/support/reports/` — Access analytics and reports
- `GET /api/v1/support/slas/` — SLA policy details

See [API_Documentation_Template.md](./API_Documentation_Template.md) for full request/response formats.

### 12.1. Sample API Requests/Responses

#### Create Ticket

```json
POST /api/v1/support/tickets/
{
  "subject": "Cannot access dashboard",
  "description": "I get a 403 error when trying to access the dashboard.",
  "category": "Access",
  "priority": "High"
}

Response:
{
  "id": 1234,
  "status": "New",
  "created_at": "2024-12-28T10:00:00Z"
}
```

#### Add Comment

```json
POST /api/v1/support/tickets/1234/comment/
{
  "comment": "Can you please provide a screenshot?"
}

Response:
{
  "id": 5678,
  "ticket_id": 1234,
  "user_id": 42,
  "comment": "Can you please provide a screenshot?",
  "created_at": "2024-12-28T10:05:00Z"
}
```

#### Upload Attachment

```http
POST /api/v1/support/tickets/1234/attachment/
Content-Type: multipart/form-data

file: screenshot.png

Response:
{
  "id": 7890,
  "ticket_id": 1234,
  "file_name": "screenshot.png",
  "file_size": 204800,
  "created_at": "2024-12-28T10:06:00Z"
}
```

---

## 13. UI/UX Guidelines

- **Accessibility:** WCAG 2.1 compliance, keyboard navigation, screen reader support
- **Responsiveness:** Mobile-friendly, adaptive layouts
- **Clarity:** Clear status indicators, color-coded priorities, progress bars
- **Self-Service:** FAQ/knowledge base integration, suggested articles on ticket creation
- **User Empowerment:** Allow users to view ticket history, filter/search, and provide feedback

---

## 14. Integration Points

- **Knowledge Base:** Link to relevant articles based on ticket content
- **Email:** Inbound email-to-ticket conversion, outbound notifications
- **Chatbot:** Optional integration for instant answers and ticket creation
- **Third-Party Tools:** Slack, Teams, PagerDuty, JIRA for escalations/alerts

---

## 15. User Satisfaction & Feedback (CSAT)

- After a ticket is resolved or closed, users are prompted to rate their experience (1-5 stars or thumbs up/down).
- Optional feedback text box for additional comments.
- CSAT scores are tracked per agent, per category, and overall.
- Reports and dashboards show satisfaction trends and agent performance.
- Feedback is used for continuous improvement and agent training.

---

## 16. Example Workflows & Screenshots

### Example Workflow: Ticket Resolution

1. User submits a ticket (category: Technical Issue, priority: High)
2. System auto-assigns to available agent
3. Agent investigates, requests more info (status: Pending)
4. User responds, agent resolves (status: Resolved)
5. User confirms, ticket auto-closes after 48h if no response

### Example Workflow: SLA Breach

1. Ticket (priority: Critical) not updated within 1h
2. System sends escalation to admin
3. Admin reassigns or intervenes

_(Add screenshots of the support form, ticket list, ticket detail, and analytics dashboard here)_

---

## 17. FAQ

**Q: Who can raise a support ticket?**  
A: Any authenticated user with platform access.

**Q: How will I know when my ticket is resolved?**  
A: You will receive email and in-app notifications, and can check status in your dashboard.

**Q: Can I attach files to my ticket?**  
A: Yes, you can attach screenshots, logs, or documents (subject to size/type limits).

**Q: What happens if my ticket is not resolved in time?**  
A: The system will escalate overdue tickets according to SLA policies.

**Q: Can I view all my past tickets?**  
A: Yes, your dashboard shows your ticket history and status.

**Q: How is my feedback used?**  
A: Feedback is used to improve support quality and agent training.

---

## 18. Related Documents

- [Teleops_Internal_Portal_Specification.md](./Teleops_Internal_Portal_Specification.md)
- [API_Documentation_Template.md](./API_Documentation_Template.md)
- [User_Management_Specification.md](./User_Management_Specification.md)

---

_Last Updated: 2024-12-28_
