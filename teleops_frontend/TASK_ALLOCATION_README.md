# Task Allocation Frontend Implementation

## Overview

The Task Allocation functionality provides a comprehensive interface for managing the allocation of tasks to vendors and teams. This implementation includes a modern, responsive UI built with Material-UI and React.

## Features

### 1. Task Allocation Dashboard

- **Overview Cards**: Display key metrics including pending allocations, in-progress tasks, completed tasks, and available vendors
- **Tabbed Interface**: Organized into three main sections:
  - Pending Allocation: Tasks ready for vendor assignment
  - Allocated Tasks: Currently assigned tasks in progress
  - Vendor Overview: Vendor performance and availability metrics

### 2. Task Management

- **Task Cards**: Comprehensive display of task information including:
  - Task name and type
  - Project and client details
  - Site count and estimated duration
  - Multi-site coordination indicators
  - Status and allocation actions

### 3. Vendor Selection Workflow

- **Step-by-Step Process**: Guided allocation workflow with:
  - Vendor selection with detailed information
  - Allocation review and confirmation
  - Real-time status updates

### 4. Mock Data Integration

- **Sample Tasks**: Includes realistic examples of:

  - 2G Dismantling tasks (single-site)
  - MW Dismantling tasks (multi-site coordination)
  - Various project types and complexities

- **Sample Vendors**: Demonstrates vendor selection with:
  - Company information and contact details
  - Specialization types
  - Performance metrics

## Components

### TaskAllocationPage

Main page component that orchestrates the allocation workflow.

### TaskAllocationCard

Reusable card component for displaying task information and allocation actions.

### VendorSelectionDialog

Modal dialog for vendor selection and allocation confirmation.

## Usage

### Accessing the Page

Navigate to `/tasks/allocation` in the application.

### Allocating a Task

1. View tasks in the "Pending Allocation" tab
2. Click "Allocate Task" on any available task
3. Select a vendor from the available options
4. Review allocation details
5. Confirm allocation

### Viewing Allocated Tasks

Switch to the "Allocated Tasks" tab to see currently assigned work.

### Vendor Performance

Check the "Vendor Overview" tab for vendor metrics and availability.

## Technical Implementation

### State Management

- Uses React hooks for local state management
- Mock data for demonstration purposes
- Ready for API integration

### UI Components

- Material-UI components for consistent design
- Responsive grid layouts
- Modern card-based design patterns

### Navigation Integration

- Added to main navigation menu
- Protected route with authentication
- Breadcrumb navigation support

## Future Enhancements

### API Integration

- Replace mock data with real API calls
- Implement real-time updates
- Add error handling and validation

### Advanced Features

- Bulk allocation capabilities
- Vendor recommendation algorithms
- Performance analytics dashboard
- Notification system for allocations

### Mobile Support

- Responsive design improvements
- Touch-friendly interactions
- Mobile-specific workflows

## Mock Data Structure

### Task Object

```typescript
interface Task {
  id: number;
  task_name: string;
  task_type: TaskType;
  project_id: number;
  project_name: string;
  client_name: string;
  status: TaskStatus;
  progress_percentage: number;
  sites_count: number;
  requires_coordination: boolean;
  estimated_duration_hours: number;
  created_at: string;
  created_by: string;
}
```

### Vendor Object

```typescript
interface Vendor {
  id: number;
  name: string;
  type: string;
  contact_info?: {
    email?: string;
    phone?: string;
  };
}
```

## Dependencies

- React 18+
- Material-UI (MUI) v5+
- TypeScript
- React Router for navigation

## File Structure

```
src/
├── pages/
│   └── TaskAllocationPage.tsx
├── components/
│   ├── TaskAllocationCard.tsx
│   └── VendorSelectionDialog.tsx
└── types/
    └── task.ts
```

## Getting Started

1. Ensure all dependencies are installed
2. Navigate to the task allocation page
3. Use the mock data to explore the functionality
4. Customize components as needed for your use case

## Notes

- This is a frontend-only implementation with mock data
- Ready for backend API integration
- Follows Material-UI design patterns
- Implements responsive design principles
- Uses TypeScript for type safety
