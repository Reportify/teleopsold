# Teleops Frontend - Circle-Based Multi-Tenant Platform

## 🚀 Internal Portal (Teleops Staff)

The Teleops Internal Portal is a modern, minimalistic admin interface for Teleops staff. It features:

- **Internal user login** (with @teleops.com email)
- **Role-based dashboard** with key metrics and quick access to:
  - Tenant Management
  - Billing & Invoices
  - Subscription Plans
  - Support Tickets
  - Analytics Dashboard
- **Navigation bar** for fast switching between modules
- **Modern UI**: Clean, whitespace-rich, responsive, and mobile-friendly
- **Protected routes**: Only internal users can access internal portal pages

### Internal Portal Quick Start

- Login at `/login` with your internal user credentials
- After login, you land on `/internal/dashboard` with navigation to all modules
- All internal portal pages use a dedicated layout and are protected from tenant users

## 🧩 MUI Grid Usage (Internal Portal)

Due to our current MUI version, always use:

```jsx
<Grid size={{ xs: 12, md: 4 }}> // for grid items
```

Instead of:

```jsx
<Grid item xs={12} md={4}>
```

This applies to all internal portal pages and avoids type errors.

## 🏗️ Project Architecture Overview

Teleops Frontend is a **React-based TypeScript application** designed for the Circle-Based Multi-Tenant Platform, supporting sophisticated Corporate → Circle → Vendor hierarchy with VLT-style equipment verification, GPS photo tagging, and comprehensive field operations.

// NOTE: Use <Grid size={{ xs: 12, md: 4 }}> instead of <Grid item xs={12} md={4}>
// This matches our current MUI version and avoids type errors.

### MUI Grid Usage

Due to our current MUI version, always use:
<Grid size={{ xs: 12, md: 4 }}> // for grid items
instead of:
<Grid item xs={12} md={4}>

## 📁 Project Structure

```
teleops_frontend/
├── public/                     # Static assets
├── src/
│   ├── layouts/
│   │   ├── MainLayout.tsx              # Main application layout
│   │   └── TeleopsInternalLayout.tsx   # Internal portal layout
│   ├── pages/
│   │   ├── InternalDashboardPage.tsx         # Internal portal: Dashboard
│   │   ├── InternalTenantManagementPage.tsx  # Internal portal: Tenant Management
│   │   ├── InternalBillingPage.tsx           # Internal portal: Billing
│   │   ├── InternalPlansPage.tsx             # Internal portal: Subscription Plans
│   │   ├── InternalSupportPage.tsx           # Internal portal: Support
│   │   ├── InternalAnalyticsPage.tsx         # Internal portal: Analytics
│   │   ├── LoginPage.tsx                     # Authentication page
│   │   ├── DashboardPage.tsx                 # Main dashboard (tenant)
│   │   ├── ProjectsPage.tsx                  # Project management
│   │   ├── SitesPage.tsx                     # Site operations
│   │   ├── TasksPage.tsx                     # Task management
│   │   ├── EquipmentPage.tsx                 # Equipment inventory
│   │   ├── TeamsPage.tsx                     # Team management
│   │   ├── WarehousePage.tsx                 # Warehouse operations
│   │   ├── TransportPage.tsx                 # Transportation management
│   │   ├── AnalyticsPage.tsx                 # Analytics & reporting (tenant)
│   │   ├── SettingsPage.tsx                  # Settings & configuration
│   │   ├── ProfilePage.tsx                   # User profile
│   │   └── NotFoundPage.tsx                  # 404 page
│   ├── services/
│   │   ├── api.ts                            # Base API service with axios
│   │   └── authService.ts                    # Auth and internal portal API logic
│   ├── types/                                # TypeScript type definitions
│   ├── hooks/                                # Custom React hooks
│   ├── utils/                                # Utility functions & helpers
│   ├── App.tsx                               # Main application component
│   └── index.tsx                             # Application entry point
├── package.json                              # Dependencies & scripts
├── tsconfig.json                             # TypeScript configuration
└── README.md                                 # This file
```

## 🏛️ Architecture Principles

### 1. Circle-Based Multi-Tenant Design

- **Tenant Context**: Complete tenant awareness throughout the application
- **Circle Hierarchy**: Corporate → Circle → Vendor relationship support
- **Permission-Based Access**: Role-based access control with tenant scoping
- **Data Isolation**: Complete separation of tenant data

### 2. Component Architecture

- **Reusable Components**: Modular, composable UI components
- **TypeScript First**: Full type safety with comprehensive interfaces
- **Material-UI**: Consistent design system with custom theming
- **Responsive Design**: Mobile-first approach with responsive layouts

### 3. State Management

- **React Context**: Global state management for authentication and tenant context
- **React Query**: Server state management with caching and synchronization
- **Local State**: Component-level state for UI interactions
- **Persistent Storage**: LocalStorage for authentication tokens and tenant context

### 4. API Integration

- **Axios**: HTTP client with interceptors for authentication
- **Automatic Token Refresh**: JWT token management with automatic refresh
- **Error Handling**: Comprehensive error handling and user feedback
- **Type-Safe APIs**: Full TypeScript support for API responses

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see backend README)

### Local Development Setup

```bash
# Clone repository
git clone <repository-url>
cd teleops_frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm start
```

### Environment Configuration

Create a `.env` file in the root directory:

```bash
# API Configuration
REACT_APP_API_URL=http://localhost:8000/api/v1
REACT_APP_WEBSOCKET_URL=ws://localhost:8000/ws

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_NOTIFICATIONS=true

# Development
REACT_APP_ENVIRONMENT=development
REACT_APP_DEBUG=true
```

## 🔧 Available Scripts

```bash
# Development
npm start              # Start development server
npm run build          # Build for production
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run type-check     # Run TypeScript type checking

# Build & Deploy
npm run build          # Build production bundle
npm run build:analyze  # Analyze bundle size
npm run deploy         # Deploy to production
```

## 🎨 UI/UX Design System

### Material-UI Theme

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2", // Teleops Blue
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#dc004e", // Teleops Red
      light: "#ff5983",
      dark: "#9a0036",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
  },
});
```

### Component Guidelines

- **Consistent Spacing**: Use theme spacing units (8px grid)
- **Typography Scale**: Follow Material-UI typography variants
- **Color Usage**: Use theme colors for consistency
- **Responsive Design**: Mobile-first approach with breakpoints

## 🔐 Authentication & Authorization

### Authentication Flow

```typescript
// Login
const { login } = useAuth();
await login(email, password);

// Protected Routes
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <MainLayout>{children}</MainLayout>;
};
```

### Tenant Context

```typescript
// Get current tenant
const currentTenant = useCurrentTenant();

// Get primary circle
const primaryCircle = usePrimaryCircle();

// Check permissions
const hasPermission = useHasPermission("projects.create");
```

## 📊 State Management

### React Query Integration

```typescript
// Data fetching with caching
const {
  data: projects,
  isLoading,
  error,
} = useQuery({
  queryKey: ["projects", tenantId],
  queryFn: () => api.get(API_ENDPOINTS.PROJECTS.LIST),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations
const createProject = useMutation({
  mutationFn: (data) => api.post(API_ENDPOINTS.PROJECTS.CREATE, data),
  onSuccess: () => {
    queryClient.invalidateQueries(["projects"]);
  },
});
```

### Context Providers

```typescript
// App structure
<QueryClientProvider client={queryClient}>
  <ThemeProvider theme={theme}>
    <AuthProvider>
      <Router>
        <Routes>{/* Application routes */}</Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

## 🧪 Testing Strategy

### Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **MSW**: API mocking for integration tests
- **Cypress**: End-to-end testing (planned)

### Test Structure

```typescript
// Component test example
describe("ProjectCard", () => {
  it("renders project information correctly", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
  });
});
```

## 📱 Responsive Design

### Breakpoints

```typescript
// Material-UI breakpoints
xs: 0px      // Extra small devices
sm: 600px    // Small devices
md: 900px    // Medium devices
lg: 1200px   // Large devices
xl: 1536px   // Extra large devices
```

### Mobile-First Approach

- **Mobile Navigation**: Collapsible sidebar with hamburger menu
- **Touch-Friendly**: Large touch targets and gestures
- **Offline Support**: Service worker for offline functionality (planned)
- **Progressive Web App**: PWA features for mobile experience

## 🚀 Performance Optimization

### Bundle Optimization

- **Code Splitting**: Route-based code splitting
- **Tree Shaking**: Remove unused code
- **Lazy Loading**: Load components on demand
- **Bundle Analysis**: Monitor bundle size

### Runtime Performance

- **React Query**: Intelligent caching and background updates
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtualization**: For large lists and data grids
- **Image Optimization**: Lazy loading and compression

## 🔧 Development Tools

### Code Quality

- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Husky**: Git hooks for pre-commit checks

### Development Experience

- **Hot Reload**: Fast development with hot module replacement
- **Error Boundaries**: Graceful error handling
- **React DevTools**: Component inspection and debugging
- **Redux DevTools**: State management debugging

## 📚 API Integration

### API Service Structure

```typescript
// Base API configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
    }
    return Promise.reject(error);
  }
);
```

### API Endpoints

```typescript
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login/",
    REFRESH: "/auth/refresh/",
    LOGOUT: "/auth/logout/",
  },
  PROJECTS: {
    LIST: "/projects/",
    CREATE: "/projects/",
    DETAIL: (id) => `/projects/${id}/`,
  },
  // ... more endpoints
};
```

## 🚀 Deployment

### Build Process

```bash
# Production build
npm run build

# Build analysis
npm run build:analyze
```

### Deployment Options

- **Static Hosting**: Netlify, Vercel, AWS S3
- **Container**: Docker with nginx
- **CDN**: CloudFront, Cloudflare
- **CI/CD**: GitHub Actions, GitLab CI

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**: `git checkout -b feature/project-management`
2. **Make Changes**: Follow coding standards and write tests
3. **Run Tests**: `npm test` and `npm run lint`
4. **Create Pull Request**: With detailed description and screenshots
5. **Code Review**: Address feedback and merge

### Coding Standards

- **TypeScript**: Strict mode with no any types
- **ESLint**: Follow configured rules
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standard commit message format

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issue with detailed description
- **Discussions**: Use GitHub Discussions for questions
- **Email**: frontend-support@teleops.com

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Architecture**: Circle-Based Multi-Tenant Platform  
**Framework**: React 18 + TypeScript  
**UI Library**: Material-UI v5  
**State Management**: React Query + Context API  
**Build Tool**: Create React App

## 🎯 Next Steps

1. **Implement Login Page**: Complete authentication UI
2. **Build Dashboard**: Circle-based analytics dashboard
3. **Project Management**: Complete project CRUD operations
4. **Equipment Verification**: VLT-style equipment verification UI
5. **Mobile App**: React Native mobile application
6. **Advanced Features**: Real-time notifications, offline support

The frontend is now ready for feature development with a solid foundation for the Circle-Based Multi-Tenant Platform! 🚀

## 🔐 Dual Login System

Teleops Frontend supports two distinct login flows:

- **Tenant Login**: For external users (corporate, circle, vendor) at `/login`.
- **Internal Login**: For Teleops staff at `/internal/login`.

Each login page uses its own authentication logic and API base URL, configured via environment variables:

```
REACT_APP_API_BASE_URL=http://localhost:8000/api/v1
REACT_APP_INTERNAL_API_BASE_URL=http://localhost:8000/internal
```

Update your `.env` files for each environment as needed.
