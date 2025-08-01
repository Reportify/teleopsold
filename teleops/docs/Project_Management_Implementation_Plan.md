# Project Management Implementation Plan

## Overview

This document outlines the complete implementation plan for the Project Management module in Teleops, including vendor chain relationships, client/customer management, and project creation workflow.

---

## Business Context & Relationships

### **Vendor Chain Example**

```yaml
Project: I&C L900
Vendor Chain: Vodafone (Circle)
  ↓ hires
  Ericsson (Circle)
  ↓ hires
  Verveland (Vendor)
  ↓ hires
  Sia Communication (Vendor)

Client-Customer Context at Each Level:
  At Vodafone level:
    - Client: Vodafone (owns the project)
    - Customer: Vodafone (infrastructure owner)

  At Ericsson level:
    - Client: Vodafone (who hired Ericsson)
    - Customer: Vodafone (infrastructure owner)

  At Verveland level:
    - Client: Ericsson (who hired Verveland)
    - Customer: Vodafone (infrastructure owner)

  At Sia Communication level:
    - Client: Verveland (who hired Sia)
    - Customer: Vodafone (infrastructure owner)
```

### **Key Business Rules**

1. **Project Ownership**: Each tenant can create projects they own OR work on client projects
2. **Client/Customer Logic**:
   - Client = Who hired me (immediate contractor)
   - Customer = Who owns the infrastructure (project owner)
3. **Vendor Independence**: Vendor invitations are independent of projects
4. **Multi-Tenant Isolation**: Each tenant maintains their own vendor and client lists
5. **Bidirectional Relationships**: When A invites B, A becomes B's client and B becomes A's vendor

---

## Database Schema Design

### **1. Client & Customer Models**

```python
class Client(models.Model):
    """Client model for tenant's client relationships"""
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'clients'
        unique_together = ['tenant', 'name']
        indexes = [
            models.Index(fields=['tenant', 'deleted_at']),
        ]

class Customer(models.Model):
    """Customer model for tenant's customer relationships"""
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'customers'
        unique_together = ['tenant', 'name']
        indexes = [
            models.Index(fields=['tenant', 'deleted_at']),
        ]
```

### **2. Vendor Relationship Model**

```python
class VendorRelationship(models.Model):
    """Tracks vendor-client relationships between tenants"""
    RELATIONSHIP_TYPE = (
        ('vendor', 'Vendor'),
        ('client', 'Client'),
    )

    STATUS = (
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('pending', 'Pending Approval'),
        ('rejected', 'Rejected'),
    )

    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='vendor_relationships')
    related_tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='client_relationships')
    relationship_type = models.CharField(max_length=10, choices=RELATIONSHIP_TYPE)
    status = models.CharField(max_length=10, choices=STATUS, default='pending')

    # Invitation details
    invited_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'vendor_relationships'
        unique_together = ['tenant', 'related_tenant', 'relationship_type']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['related_tenant', 'status']),
        ]
```

### **3. Updated Project Model**

```python
class Project(models.Model):
    """Enhanced project model with VLT-specific fields"""
    PROJECT_STATUS = (
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    PROJECT_TYPE = (
        ('dismantle', 'Dismantle'),
        ('other', 'Other'),
    )

    # Core relationships
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='projects')

    # VLT-specific fields
    project_name = models.CharField(max_length=255)
    project_type = models.CharField(max_length=20, choices=PROJECT_TYPE, default='other')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='projects')
    circle = models.CharField(max_length=100)  # Indian telecom circles
    activity = models.TextField()

    # Project ownership
    is_owned_by_tenant = models.BooleanField(default=False, help_text="True if tenant owns the infrastructure")

    # Project details
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=PROJECT_STATUS, default='planning')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Project team
    project_manager = models.ForeignKey(
        'apps_users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects'
    )
    team_members = models.ManyToManyField(
        'apps_users.User',
        through='ProjectTeamMember',
        related_name='project_assignments'
    )

    # Location and scope
    location = models.CharField(max_length=255, blank=True)
    scope = models.TextField(blank=True)

    # Audit fields
    created_by = models.ForeignKey('apps_users.User', on_delete=models.CASCADE, related_name='created_projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'projects'
        unique_together = ['tenant', 'project_name']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['project_type']),
            models.Index(fields=['circle']),
            models.Index(fields=['created_at']),
        ]
```

### **4. Project Assignment Model**

```python
class ProjectAssignment(models.Model):
    """Tracks project assignments to vendors"""
    STATUS = (
        ('invited', 'Invited'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    )

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='assignments')
    assigned_tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='project_assignments')

    # Client/Customer context for this assignment
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='project_assignments')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='project_assignments')

    # Assignment details
    status = models.CharField(max_length=20, choices=STATUS, default='invited')
    assigned_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    accepted_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'project_assignments'
        unique_together = ['project', 'assigned_tenant']
        indexes = [
            models.Index(fields=['assigned_tenant', 'status']),
            models.Index(fields=['project', 'status']),
        ]
```

### **5. Project-Site Relationship Model**

```python
class ProjectSite(models.Model):
    """Many-to-many relationship between projects and sites"""
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_sites')
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE, related_name='project_sites')

    # Assignment metadata
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey('apps_users.User', on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'project_sites'
        unique_together = ['project', 'site']
        indexes = [
            models.Index(fields=['project']),
            models.Index(fields=['site']),
        ]
```

---

## API Endpoints Design

### **1. Vendor Management APIs**

```yaml
# Vendor relationship management
GET    /api/vendor-relationships/           # List vendor relationships
POST   /api/vendor-relationships/           # Invite vendor
PUT    /api/vendor-relationships/{id}/      # Update relationship
DELETE /api/vendor-relationships/{id}/      # Remove relationship

# Vendor invitation actions
POST   /api/vendor-relationships/{id}/accept/    # Accept vendor invitation
POST   /api/vendor-relationships/{id}/reject/    # Reject vendor invitation

# Vendor lists
GET    /api/vendors/                       # List my vendors
GET    /api/clients/                       # List my clients
```

### **2. Project Management APIs**

```yaml
# Core project CRUD
GET    /api/projects/                      # List projects (with client/customer context)
POST   /api/projects/                      # Create project
GET    /api/projects/{id}/                 # Get project details
PUT    /api/projects/{id}/                 # Update project
DELETE /api/projects/{id}/                 # Delete project

# Project assignments
GET    /api/projects/{id}/assignments/     # List project assignments
POST   /api/projects/{id}/assignments/     # Invite vendor to project
PUT    /api/projects/{id}/assignments/{assignment_id}/  # Update assignment
POST   /api/projects/{id}/assignments/{assignment_id}/accept/  # Accept assignment
POST   /api/projects/{id}/assignments/{assignment_id}/reject/  # Reject assignment

# Project sites
GET    /api/projects/{id}/sites/           # List project sites
POST   /api/projects/{id}/sites/           # Add sites to project
DELETE /api/projects/{id}/sites/{site_id}/ # Remove site from project
POST   /api/projects/{id}/bulk-upload-sites/ # Bulk upload sites

# Project statistics
GET    /api/projects/stats/                # Project statistics
```

### **3. Client/Customer Management APIs**

```yaml
# Client management
GET    /api/clients/                       # List clients
POST   /api/clients/                       # Create client
GET    /api/clients/{id}/                  # Get client details
PUT    /api/clients/{id}/                  # Update client
DELETE /api/clients/{id}/                  # Delete client

# Customer management
GET    /api/customers/                     # List customers
POST   /api/customers/                     # Create customer
GET    /api/customers/{id}/                # Get customer details
PUT    /api/customers/{id}/                # Update customer
DELETE /api/customers/{id}/                # Delete customer
```

---

## Implementation Phases

### **Phase 1: Core Models & Database (Week 1)**

1. **Create Client & Customer Models**

   - Implement models with proper relationships
   - Add database migrations
   - Create admin interfaces

2. **Create Vendor Relationship Model**

   - Implement vendor-client relationship tracking
   - Add invitation workflow
   - Create status management

3. **Update Project Model**

   - Add VLT-specific fields (client, customer, circle, activity)
   - Update project types to match specification
   - Add project ownership logic

4. **Create Project Assignment Model**
   - Implement project assignment workflow
   - Add client/customer context per assignment
   - Create assignment status management

### **Phase 2: API Implementation (Week 2)**

1. **Vendor Management APIs**

   - Vendor relationship CRUD operations
   - Vendor invitation workflow
   - Vendor/client list management

2. **Project Management APIs**

   - Enhanced project CRUD with client/customer
   - Project assignment workflow
   - Project statistics and reporting

3. **Client/Customer Management APIs**
   - Client and customer CRUD operations
   - Multi-tenant isolation
   - Data validation and business rules

### **Phase 3: Frontend Implementation (Week 3-4)**

1. **Vendor Management Interface**

   - Vendor invitation forms
   - Vendor/client list views
   - Relationship status management

2. **Project Creation Interface**

   - VLT-style project creation form
   - Client/customer selection
   - Project type and circle selection

3. **Project Management Interface**
   - Project listing with client/customer context
   - Project assignment workflow
   - Site association interface

### **Phase 4: Advanced Features (Week 5-6)**

1. **Project-Site Integration**

   - Site association interface
   - Bulk site upload functionality
   - Site management within projects

2. **Advanced Project Features**
   - Project statistics and analytics
   - Project assignment workflow
   - Multi-vendor project coordination

---

## Business Logic Implementation

### **1. Vendor Invitation Workflow**

```python
class VendorService:
    def invite_vendor(self, tenant, vendor_tenant, invited_by):
        """Invite a vendor to become a client"""
        # Create bidirectional relationship
        vendor_rel = VendorRelationship.objects.create(
            tenant=tenant,
            related_tenant=vendor_tenant,
            relationship_type='vendor',
            invited_by=invited_by
        )

        client_rel = VendorRelationship.objects.create(
            tenant=vendor_tenant,
            related_tenant=tenant,
            relationship_type='client',
            invited_by=invited_by
        )

        return vendor_rel, client_rel

    def accept_vendor_invitation(self, relationship_id, accepted_by):
        """Accept vendor invitation"""
        relationship = VendorRelationship.objects.get(id=relationship_id)
        relationship.status = 'active'
        relationship.accepted_at = timezone.now()
        relationship.accepted_by = accepted_by
        relationship.save()

        # Update corresponding relationship
        corresponding = VendorRelationship.objects.get(
            tenant=relationship.related_tenant,
            related_tenant=relationship.tenant,
            relationship_type='client' if relationship.relationship_type == 'vendor' else 'vendor'
        )
        corresponding.status = 'active'
        corresponding.accepted_at = timezone.now()
        corresponding.accepted_by = accepted_by
        corresponding.save()
```

### **2. Project Creation Workflow**

```python
class ProjectService:
    def create_project(self, tenant, project_data, created_by):
        """Create project with client/customer context"""
        # Determine client and customer based on ownership
        if project_data.get('is_owned_by_tenant'):
            # Tenant owns the project
            client = self.get_or_create_client(tenant, tenant.organization_name)
            customer = self.get_or_create_customer(tenant, tenant.organization_name)
        else:
            # Working on client's project
            client = project_data['client']
            customer = project_data['customer']

        project = Project.objects.create(
            tenant=tenant,
            client=client,
            customer=customer,
            created_by=created_by,
            **project_data
        )

        return project

    def invite_vendor_to_project(self, project, vendor_tenant, invited_by):
        """Invite vendor to work on project"""
        # Get client context for this vendor
        vendor_client = self.get_vendor_client_context(project.tenant, vendor_tenant)

        assignment = ProjectAssignment.objects.create(
            project=project,
            assigned_tenant=vendor_tenant,
            client=vendor_client,
            customer=project.customer,  # Customer stays the same
            assigned_by=invited_by
        )

        return assignment
```

### **3. Project Context Logic**

```python
class ProjectContextService:
    def get_project_context_for_tenant(self, project, tenant):
        """Get client/customer context for specific tenant"""
        assignment = ProjectAssignment.objects.get(
            project=project,
            assigned_tenant=tenant
        )

        return {
            'client': assignment.client,
            'customer': assignment.customer,
            'status': assignment.status
        }

    def list_projects_for_tenant(self, tenant):
        """List projects with proper client/customer context"""
        # Get projects where tenant is assigned
        assignments = ProjectAssignment.objects.filter(
            assigned_tenant=tenant
        ).select_related('project', 'client', 'customer')

        projects = []
        for assignment in assignments:
            project_data = ProjectSerializer(assignment.project).data
            project_data['client'] = ClientSerializer(assignment.client).data
            project_data['customer'] = CustomerSerializer(assignment.customer).data
            project_data['assignment_status'] = assignment.status
            projects.append(project_data)

        return projects
```

---

## Frontend Implementation Plan

### **1. TypeScript Interfaces**

```typescript
interface Client {
  id: number;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: number;
  name: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface VendorRelationship {
  id: number;
  related_tenant: Tenant;
  relationship_type: "vendor" | "client";
  status: "active" | "inactive" | "pending" | "rejected";
  invited_at: string;
  accepted_at?: string;
  notes?: string;
}

interface Project {
  id: number;
  project_name: string;
  project_type: "dismantle" | "other";
  client: Client;
  customer: Customer;
  circle: string;
  activity: string;
  is_owned_by_tenant: boolean;
  status: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
}

interface ProjectAssignment {
  id: number;
  project: Project;
  assigned_tenant: Tenant;
  client: Client;
  customer: Customer;
  status: "invited" | "accepted" | "rejected" | "completed";
  assigned_at: string;
  accepted_at?: string;
  notes?: string;
}
```

### **2. API Services**

```typescript
// Vendor management
export const vendorAPI = {
  getVendorRelationships: () => api.get("/vendor-relationships/"),
  inviteVendor: (data: InviteVendorRequest) => api.post("/vendor-relationships/", data),
  acceptInvitation: (id: number) => api.post(`/vendor-relationships/${id}/accept/`),
  rejectInvitation: (id: number) => api.post(`/vendor-relationships/${id}/reject/`),
  getVendors: () => api.get("/vendors/"),
  getClients: () => api.get("/clients/"),
};

// Project management
export const projectAPI = {
  getProjects: (params?: ProjectFilters) => api.get("/projects/", { params }),
  createProject: (data: CreateProjectRequest) => api.post("/projects/", data),
  getProject: (id: number) => api.get(`/projects/${id}/`),
  updateProject: (id: number, data: UpdateProjectRequest) => api.put(`/projects/${id}/`, data),
  deleteProject: (id: number) => api.delete(`/projects/${id}/`),

  // Project assignments
  getProjectAssignments: (projectId: number) => api.get(`/projects/${projectId}/assignments/`),
  inviteVendorToProject: (projectId: number, data: InviteVendorToProjectRequest) => api.post(`/projects/${projectId}/assignments/`, data),
  acceptProjectAssignment: (projectId: number, assignmentId: number) => api.post(`/projects/${projectId}/assignments/${assignmentId}/accept/`),
  rejectProjectAssignment: (projectId: number, assignmentId: number) => api.post(`/projects/${projectId}/assignments/${assignmentId}/reject/`),

  // Project sites
  getProjectSites: (projectId: number) => api.get(`/projects/${projectId}/sites/`),
  addSitesToProject: (projectId: number, siteIds: number[]) => api.post(`/projects/${projectId}/sites/`, { site_ids: siteIds }),
  bulkUploadSites: (projectId: number, file: File) => api.post(`/projects/${projectId}/bulk-upload-sites/`, { file }),

  // Statistics
  getProjectStats: () => api.get("/projects/stats/"),
};

// Client/Customer management
export const clientAPI = {
  getClients: () => api.get("/clients/"),
  createClient: (data: CreateClientRequest) => api.post("/clients/", data),
  updateClient: (id: number, data: UpdateClientRequest) => api.put(`/clients/${id}/`, data),
  deleteClient: (id: number) => api.delete(`/clients/${id}/`),
};

export const customerAPI = {
  getCustomers: () => api.get("/customers/"),
  createCustomer: (data: CreateCustomerRequest) => api.post("/customers/", data),
  updateCustomer: (id: number, data: UpdateCustomerRequest) => api.put(`/customers/${id}/`, data),
  deleteCustomer: (id: number) => api.delete(`/customers/${id}/`),
};
```

### **3. React Components Structure**

```typescript
// Vendor Management
<VendorManagementPage>
  <VendorList />
  <ClientList />
  <InviteVendorForm />
</VendorManagementPage>

// Project Management
<ProjectManagementPage>
  <ProjectList />
  <CreateProjectForm />
  <ProjectDetails />
  <ProjectAssignments />
</ProjectManagementPage>

// Project Creation
<CreateProjectPage>
  <ProjectBasicInfo />
  <ClientCustomerSelection />
  <ProjectTypeSelection />
  <VendorInvitation />
</CreateProjectPage>
```

---

## Testing Strategy

### **1. Backend Testing**

```python
# Test vendor invitation workflow
def test_vendor_invitation_workflow():
    # Test bidirectional relationship creation
    # Test invitation acceptance/rejection
    # Test relationship status updates

# Test project creation workflow
def test_project_creation_workflow():
    # Test owned project creation
    # Test client project creation
    # Test client/customer context

# Test project assignment workflow
def test_project_assignment_workflow():
    # Test vendor invitation to project
    # Test assignment acceptance/rejection
    # Test client/customer context inheritance
```

### **2. Frontend Testing**

```typescript
// Test vendor management
describe("Vendor Management", () => {
  test("should invite vendor successfully");
  test("should accept vendor invitation");
  test("should reject vendor invitation");
});

// Test project creation
describe("Project Creation", () => {
  test("should create owned project");
  test("should create client project");
  test("should invite vendors to project");
});
```

---

## Success Criteria

### **Phase 1 Success Criteria:**

- [ ] Client and Customer models implemented
- [ ] Vendor relationship workflow working
- [ ] Project model updated with VLT fields
- [ ] Project assignment model implemented
- [ ] All database migrations applied successfully

### **Phase 2 Success Criteria:**

- [ ] Vendor management APIs working
- [ ] Project management APIs working
- [ ] Client/Customer management APIs working
- [ ] All API endpoints tested and documented

### **Phase 3 Success Criteria:**

- [ ] Vendor management interface implemented
- [ ] Project creation interface implemented
- [ ] Project management interface implemented
- [ ] All frontend components tested

### **Phase 4 Success Criteria:**

- [ ] Project-site integration working
- [ ] Advanced project features implemented
- [ ] Complete end-to-end workflow tested
- [ ] Performance optimized

---

This implementation plan provides a comprehensive roadmap for building the Project Management module with proper vendor chain support, client/customer relationships, and VLT-compatible project creation workflow.
