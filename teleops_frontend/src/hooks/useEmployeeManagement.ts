// Employee Management Hook for Circle Portal
import { useState, useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { userManagementAPI } from "../services/userAPI";
import { errorHandler } from "../services/api";
import {
  // Employee Types
  EnhancedUserProfile,
  UserCreateData,
  UserUpdateData,
  UserListResponse,
  UserSearchFilters,

  // Team Types
  Team,
  TeamMembership,
  TeamCreateData,
  TeamUpdateData,
  TeamMemberAddData,

  // Operations Types
  BulkUserOperation,
  BulkOperationResponse,
  UserInvitationData,
  UserRegistration,

  // Statistics
  UserManagementStats,

  // Designation Types
  Designation,
  Department,
} from "../types/user";

// =====================================================
// HOOK STATE INTERFACES
// =====================================================

interface EmployeeListState {
  employees: EnhancedUserProfile[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: UserSearchFilters;
  pagination: {
    page: number;
    pageSize: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

interface EmployeeOperationsState {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  bulkOperating: boolean;
  inviting: boolean;
  error: string | null;
}

interface TeamManagementState {
  teams: Team[];
  selectedTeam: Team | null;
  teamMembers: TeamMembership[];
  loading: boolean;
  error: string | null;
}

interface EmployeeStatsState {
  stats: UserManagementStats | null;
  loading: boolean;
  error: string | null;
}

// =====================================================
// MAIN HOOK
// =====================================================

export const useEmployeeManagement = () => {
  // ==================
  // STATE MANAGEMENT
  // ==================

  // Employee List State
  const [employeeList, setEmployeeList] = useState<EmployeeListState>({
    employees: [],
    total: 0,
    loading: false,
    error: null,
    filters: {},
    pagination: {
      page: 1,
      pageSize: 20,
      hasNext: false,
      hasPrevious: false,
    },
  });

  // Employee Operations State
  const [operations, setOperations] = useState<EmployeeOperationsState>({
    creating: false,
    updating: false,
    deleting: false,
    bulkOperating: false,
    inviting: false,
    error: null,
  });

  // Team Management State
  const [teamManagement, setTeamManagement] = useState<TeamManagementState>({
    teams: [],
    selectedTeam: null,
    teamMembers: [],
    loading: false,
    error: null,
  });

  // Statistics State
  const [statsState, setStatsState] = useState<EmployeeStatsState>({
    stats: null,
    loading: false,
    error: null,
  });

  // Additional State
  const [selectedEmployee, setSelectedEmployee] = useState<EnhancedUserProfile | null>(null);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invitations, setInvitations] = useState<UserRegistration[]>([]);

  // ==================
  // EMPLOYEE CRUD OPERATIONS
  // ==================

  // Load employees list with filters
  const loadEmployees = useCallback(async (filters: UserSearchFilters = {}, page: number = 1, pageSize: number = 20) => {
    setEmployeeList((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response: UserListResponse = await userManagementAPI.users.list({
        ...filters,
        page,
        page_size: pageSize,
      });

      setEmployeeList((prev) => ({
        ...prev,
        employees: response.results,
        total: response.count,
        loading: false,
        filters,
        pagination: {
          page,
          pageSize,
          hasNext: !!response.next,
          hasPrevious: !!response.previous,
        },
      }));
    } catch (error) {
      setEmployeeList((prev) => ({
        ...prev,
        loading: false,
        error: errorHandler.getErrorMessage(error),
      }));
    }
  }, []);

  // Get single employee by ID
  const getEmployee = useCallback(async (id: string) => {
    try {
      const employee = await userManagementAPI.users.get(id);
      setSelectedEmployee(employee);
      return employee;
    } catch (error) {
      const errorMsg = errorHandler.getErrorMessage(error);
      setOperations((prev) => ({ ...prev, error: errorMsg }));
      throw error;
    }
  }, []);

  // Create new employee
  const createEmployee = useCallback(async (employeeData: UserCreateData) => {
    setOperations((prev) => ({ ...prev, creating: true, error: null }));

    try {
      const newEmployee = await userManagementAPI.users.create(employeeData);

      // Update local state
      setEmployeeList((prev) => ({
        ...prev,
        employees: [newEmployee, ...prev.employees],
        total: prev.total + 1,
      }));

      setOperations((prev) => ({ ...prev, creating: false }));
      return newEmployee;
    } catch (error) {
      setOperations((prev) => ({
        ...prev,
        creating: false,
        error: errorHandler.getErrorMessage(error),
      }));
      throw error;
    }
  }, []);

  // Update employee
  const updateEmployee = useCallback(
    async (id: string, employeeData: UserUpdateData) => {
      setOperations((prev) => ({ ...prev, updating: true, error: null }));

      try {
        const updatedEmployee = await userManagementAPI.users.update(id, employeeData);

        // Update local state
        setEmployeeList((prev) => ({
          ...prev,
          employees: prev.employees.map((emp) => (emp.id === parseInt(id) ? updatedEmployee : emp)),
        }));

        if (selectedEmployee?.id === parseInt(id)) {
          setSelectedEmployee(updatedEmployee);
        }

        setOperations((prev) => ({ ...prev, updating: false }));
        return updatedEmployee;
      } catch (error) {
        setOperations((prev) => ({
          ...prev,
          updating: false,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [selectedEmployee]
  );

  // Delete employee
  const deleteEmployee = useCallback(
    async (id: string) => {
      setOperations((prev) => ({ ...prev, deleting: true, error: null }));

      try {
        await userManagementAPI.users.delete(id);

        // Update local state
        setEmployeeList((prev) => ({
          ...prev,
          employees: prev.employees.filter((emp) => emp.id !== parseInt(id)),
          total: prev.total - 1,
        }));

        if (selectedEmployee?.id === parseInt(id)) {
          setSelectedEmployee(null);
        }

        setOperations((prev) => ({ ...prev, deleting: false }));
      } catch (error) {
        setOperations((prev) => ({
          ...prev,
          deleting: false,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [selectedEmployee]
  );

  // Activate employee
  const activateEmployee = useCallback(
    async (id: string) => {
      try {
        await userManagementAPI.users.activate(id);

        // Update local state
        setEmployeeList((prev) => ({
          ...prev,
          employees: prev.employees.map((emp) => (emp.id === parseInt(id) ? { ...emp, is_active: true } : emp)),
        }));

        if (selectedEmployee?.id === parseInt(id)) {
          setSelectedEmployee((prev) => (prev ? { ...prev, is_active: true } : null));
        }
      } catch (error) {
        setOperations((prev) => ({
          ...prev,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [selectedEmployee]
  );

  // Deactivate employee
  const deactivateEmployee = useCallback(
    async (id: string) => {
      try {
        await userManagementAPI.users.deactivate(id);

        // Update local state
        setEmployeeList((prev) => ({
          ...prev,
          employees: prev.employees.map((emp) => (emp.id === parseInt(id) ? { ...emp, is_active: false } : emp)),
        }));

        if (selectedEmployee?.id === parseInt(id)) {
          setSelectedEmployee((prev) => (prev ? { ...prev, is_active: false } : null));
        }
      } catch (error) {
        setOperations((prev) => ({
          ...prev,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [selectedEmployee]
  );

  // ==================
  // BULK OPERATIONS
  // ==================

  const executeBulkOperation = useCallback(
    async (operation: BulkUserOperation) => {
      setOperations((prev) => ({ ...prev, bulkOperating: true, error: null }));

      try {
        const result = await userManagementAPI.bulkOperations.execute(operation);

        // Refresh employees list after bulk operation
        await loadEmployees(employeeList.filters, employeeList.pagination.page);

        setOperations((prev) => ({ ...prev, bulkOperating: false }));
        return result;
      } catch (error) {
        setOperations((prev) => ({
          ...prev,
          bulkOperating: false,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [loadEmployees, employeeList.filters, employeeList.pagination.page]
  );

  // ==================
  // TEAM MANAGEMENT
  // ==================

  // Load teams
  const loadTeams = useCallback(async () => {
    setTeamManagement((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await userManagementAPI.teams.list();
      setTeamManagement((prev) => ({
        ...prev,
        teams: response.results,
        loading: false,
      }));
    } catch (error) {
      setTeamManagement((prev) => ({
        ...prev,
        loading: false,
        error: errorHandler.getErrorMessage(error),
      }));
    }
  }, []);

  // Create team
  const createTeam = useCallback(async (teamData: TeamCreateData) => {
    try {
      const newTeam = await userManagementAPI.teams.create(teamData);
      setTeamManagement((prev) => ({
        ...prev,
        teams: [newTeam, ...prev.teams],
      }));
      return newTeam;
    } catch (error) {
      setTeamManagement((prev) => ({
        ...prev,
        error: errorHandler.getErrorMessage(error),
      }));
      throw error;
    }
  }, []);

  // Add employee to team
  const addEmployeeToTeam = useCallback(
    async (teamId: string, memberData: TeamMemberAddData) => {
      try {
        const membership = await userManagementAPI.teams.addMember(teamId, memberData);

        // Update team members if current team is selected
        if (teamManagement.selectedTeam?.id === parseInt(teamId, 10)) {
          setTeamManagement((prev) => ({
            ...prev,
            teamMembers: [membership, ...prev.teamMembers],
          }));
        }

        return membership;
      } catch (error) {
        setTeamManagement((prev) => ({
          ...prev,
          error: errorHandler.getErrorMessage(error),
        }));
        throw error;
      }
    },
    [teamManagement.selectedTeam]
  );

  // ==================
  // EMPLOYEE INVITATIONS
  // ==================

  // Send employee invitation
  const inviteEmployee = useCallback(async (invitationData: UserInvitationData) => {
    setOperations((prev) => ({ ...prev, inviting: true, error: null }));

    try {
      const invitation = await userManagementAPI.invitations.create(invitationData);
      setInvitations((prev) => [invitation, ...prev]);
      setOperations((prev) => ({ ...prev, inviting: false }));
      return invitation;
    } catch (error) {
      setOperations((prev) => ({
        ...prev,
        inviting: false,
        error: errorHandler.getErrorMessage(error),
      }));
      throw error;
    }
  }, []);

  // Load invitations
  const loadInvitations = useCallback(async () => {
    try {
      const invitations = await userManagementAPI.invitations.list();
      setInvitations(invitations);
    } catch (error) {
      setOperations((prev) => ({
        ...prev,
        error: errorHandler.getErrorMessage(error),
      }));
    }
  }, []);

  // ==================
  // STATISTICS & ANALYTICS
  // ==================

  const loadEmployeeStats = useCallback(async () => {
    setStatsState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const stats = await userManagementAPI.users.getStats();
      setStatsState((prev) => ({
        ...prev,
        stats,
        loading: false,
      }));
    } catch (error) {
      setStatsState((prev) => ({
        ...prev,
        loading: false,
        error: errorHandler.getErrorMessage(error),
      }));
    }
  }, []);

  // ==================
  // DESIGNATIONS
  // ==================

  const loadDesignations = useCallback(async () => {
    try {
      const response = await userManagementAPI.designations.list();
      const designationsArray = response.designations || [];
      setDesignations(designationsArray);
    } catch (error) {
      console.error("loadDesignations: Failed to load designations:", error);
      setDesignations([]);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const response = await userManagementAPI.departments.list();
      const departmentsArray = response.departments || [];
      setDepartments(departmentsArray);
    } catch (error) {
      console.error("loadDepartments: Failed to load departments:", error);
      setDepartments([]);
    }
  }, []);

  // ==================
  // UTILITY FUNCTIONS
  // ==================

  // Clear errors
  const clearErrors = useCallback(() => {
    setOperations((prev) => ({ ...prev, error: null }));
    setEmployeeList((prev) => ({ ...prev, error: null }));
    setTeamManagement((prev) => ({ ...prev, error: null }));
    setStatsState((prev) => ({ ...prev, error: null }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    loadEmployees({}, 1, 20);
  }, [loadEmployees]);

  // Search employees
  const searchEmployees = useCallback(
    (searchTerm: string) => {
      const filters: UserSearchFilters = {
        ...employeeList.filters,
        search: searchTerm,
      };
      loadEmployees(filters, 1, employeeList.pagination.pageSize);
    },
    [loadEmployees, employeeList.filters, employeeList.pagination.pageSize]
  );

  // Filter by designation
  const filterByDesignation = useCallback(
    (designationId: string) => {
      const filters: UserSearchFilters = {
        ...employeeList.filters,
        designation: designationId,
      };
      loadEmployees(filters, 1, employeeList.pagination.pageSize);
    },
    [loadEmployees, employeeList.filters, employeeList.pagination.pageSize]
  );

  // Filter by active status
  const filterByActiveStatus = useCallback(
    (isActive: boolean) => {
      const filters: UserSearchFilters = {
        ...employeeList.filters,
        is_active: isActive,
      };
      loadEmployees(filters, 1, employeeList.pagination.pageSize);
    },
    [loadEmployees, employeeList.filters, employeeList.pagination.pageSize]
  );

  // ==================
  // INITIALIZE DATA
  // ==================

  useEffect(() => {
    loadDesignations();
    loadDepartments();
  }, [loadDesignations, loadDepartments]);

  // ==================
  // RETURN HOOK API
  // ==================

  return {
    // Employee List State
    employees: employeeList.employees,
    total: employeeList.total,
    loading: employeeList.loading,
    error: employeeList.error || operations.error || teamManagement.error || statsState.error,
    filters: employeeList.filters,
    pagination: employeeList.pagination,

    // Selected Employee
    selectedEmployee,
    setSelectedEmployee,

    // Employee Operations
    loadEmployees,
    getEmployee,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    activateEmployee,
    deactivateEmployee,

    // Operation States
    creating: operations.creating,
    updating: operations.updating,
    deleting: operations.deleting,
    bulkOperating: operations.bulkOperating,
    inviting: operations.inviting,

    // Bulk Operations
    executeBulkOperation,
    bulkActivate: userManagementAPI.bulkOperations.activate,
    bulkDeactivate: userManagementAPI.bulkOperations.deactivate,
    bulkAssignDesignation: userManagementAPI.bulkOperations.assignDesignation,

    // Team Management
    teams: teamManagement.teams,
    selectedTeam: teamManagement.selectedTeam,
    setSelectedTeam: (team: Team | null) => setTeamManagement((prev) => ({ ...prev, selectedTeam: team })),
    teamMembers: teamManagement.teamMembers,
    loadTeams,
    createTeam,
    addEmployeeToTeam,

    // Invitations
    invitations,
    inviteEmployee,
    loadInvitations,

    // Statistics
    stats: statsState.stats,
    statsLoading: statsState.loading,
    loadEmployeeStats,

    // Designations
    designations,
    loadDesignations,

    // Departments
    departments,
    loadDepartments,

    // Utility Functions
    clearErrors,
    resetFilters,
    searchEmployees,
    filterByDesignation,
    filterByActiveStatus,

    // Export functionality
    exportEmployees: userManagementAPI.users.export,
  };
};

export default useEmployeeManagement;
