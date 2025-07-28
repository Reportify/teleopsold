// Comprehensive Permission Dashboard Types

export interface UserSummary {
  user_id: number;
  name: string;
  email: string;
  employee_id: string;
  job_title: string;
  department: string;
  is_active: boolean;
  last_login: string | null;
  total_permissions: number;
}

export interface PermissionSummary {
  permission_id: number;
  permission_name: string;
  permission_code: string;
  category: string;
  risk_level: "low" | "medium" | "high" | "critical";
  users_with_permission: number;
  assignment_sources: {
    designation: number;
    group: number;
    override: number;
  };
}

export interface PermissionMatrixEntry {
  has_permission: boolean;
  source: string;
  risk_level: string;
}

export interface OverviewDashboardData {
  view_type: "overview";
  summary: {
    total_users: number;
    total_permissions: number;
    total_assignments: number;
    average_permissions_per_user: number;
  };
  permission_matrix: {
    [userKey: string]: {
      [permissionCode: string]: PermissionMatrixEntry;
    };
  };
  user_summaries: {
    [userKey: string]: UserSummary;
  };
  permission_summaries: {
    [permissionCode: string]: PermissionSummary;
  };
  generated_at: string;
}

export interface UserAnalysisData {
  view_type: "user_analysis";
  user_summary?: UserSummary;
  user_analyses?: Array<{
    user_id: number;
    name: string;
    email: string;
    employee_id: string;
    job_title: string;
    total_permissions: number;
    high_risk_permissions: number;
    permission_sources_count: {
      designation: number;
      group: number;
      override: number;
    };
  }>;
  effective_permissions?: any;
  permission_sources?: any;
  assignment_history?: any[];
  conflicts?: any[];
  recommendations?: string[];
  generated_at: string;
}

export interface PermissionAnalysisData {
  view_type: "permission_analysis";
  permission_details?: {
    id: number;
    name: string;
    code: string;
    category: string;
    description: string;
    risk_level: string;
    is_system_permission: boolean;
  };
  permission_analyses?: Array<{
    permission_id: number;
    name: string;
    code: string;
    category: string;
    risk_level: string;
    assignment_counts: {
      designation_assignments: number;
      group_assignments: number;
      user_overrides: number;
      total: number;
    };
  }>;
  users_with_permission?: Array<{
    user_id: number;
    name: string;
    email: string;
    employee_id: string;
    source: string;
    level: string;
    scope_configuration: any;
  }>;
  assignment_breakdown?: {
    total_users: number;
    by_source: {
      designation: number;
      group: number;
      override: number;
    };
  };
  generated_at: string;
}

export interface AnalyticsDashboardData {
  view_type: "analytics";
  permission_usage: {
    top_permissions: Array<{
      permission_name: string;
      permission_code: string;
      category: string;
      risk_level: string;
      total_usage: number;
      usage_breakdown: {
        designation: number;
        group: number;
        override: number;
      };
    }>;
    least_used_permissions: Array<{
      permission_name: string;
      permission_code: string;
      total_usage: number;
    }>;
  };
  risk_analysis: {
    high_risk_permissions: number;
    permissions_by_risk: {
      [riskLevel: string]: number;
    };
    unused_permissions: number;
  };
  user_analytics: {
    users_by_permission_count: Array<{
      user_name: string;
      permission_count: number;
    }>;
    top_users: Array<{
      user_name: string;
      permission_count: number;
    }>;
    users_with_no_permissions: Array<{
      user_name: string;
      permission_count: number;
    }>;
  };
  trends: {
    recent_assignments: number;
    recent_revocations: number;
  };
  generated_at: string;
}

export interface SearchUsersResponse {
  permission_details: {
    code: string;
    name: string;
    category: string;
    risk_level: string;
  };
  search_criteria: {
    permission_code: string;
    source_type_filter?: string;
  };
  results: {
    total_users_found: number;
    users: Array<{
      user_id: number;
      name: string;
      email: string;
      employee_id: string;
      job_title: string;
      department: string;
      permission_source: string;
      permission_level: string;
      scope_configuration: any;
      last_login: string | null;
    }>;
  };
  breakdown_by_source: {
    designation: number;
    group: number;
    override: number;
  };
}

export interface UserPermissionsDetailedResponse {
  user_details: {
    user_id: number;
    name: string;
    email: string;
    employee_id: string;
    job_title: string;
    department: string;
    is_active: boolean;
    last_login: string | null;
  };
  search_criteria: {
    include_inactive: boolean;
    category_filter?: string;
  };
  permission_breakdown: {
    designation_permissions: any[];
    group_permissions: any[];
    override_permissions: any[];
    effective_permissions: Array<{
      permission_code: string;
      permission_name: string;
      permission_category: string;
      risk_level: string;
      source: string;
      level: string;
      scope_configuration: any;
    }>;
  };
  statistics: {
    total_effective_permissions: number;
    by_source: {
      designation: number;
      group: number;
      override: number;
    };
    by_risk_level: {
      [riskLevel: string]: number;
    };
    by_category: {
      [category: string]: number;
    };
  };
  scope_limitations: any;
  generated_at: string;
}

export type ComprehensiveDashboardData = OverviewDashboardData | UserAnalysisData | PermissionAnalysisData | AnalyticsDashboardData;
