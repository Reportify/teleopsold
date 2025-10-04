// Team Service for Real Backend Integration
import { api } from "./api";
import { Team, TeamMember, TeamMembership, TeamCreateData, TeamUpdateData, TeamMemberAddData, TeamListResponse } from "../types/user";

// Team API Endpoints
const TEAM_ENDPOINTS = {
  LIST: "/teams/",
  CREATE: "/teams/",
  DETAIL: (id: string) => `/teams/${id}/`,
  UPDATE: (id: string) => `/teams/${id}/`,
  DELETE: (id: string) => `/teams/${id}/`,
  MEMBERS: (id: string) => `/teams/${id}/members/`,
  ADD_MEMBER: (id: string) => `/teams/${id}/add_member/`,
  REMOVE_MEMBER: (id: string) => `/teams/${id}/remove_member/`,
};

export const teamService = {
  // List all teams
  list: async (): Promise<TeamListResponse> => {
    try {
      const response = await api.get(TEAM_ENDPOINTS.LIST);
      // Handle paginated response from backend
      return {
        count: response.data.count || 0,
        results: response.data.results || [],
        next: response.data.next,
        previous: response.data.previous,
      };
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw error;
    }
  },

  // Get single team
  get: async (id: number): Promise<Team> => {
    try {
      const response = await api.get(TEAM_ENDPOINTS.DETAIL(id.toString()));
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${id}:`, error);
      throw error;
    }
  },

  // Create team
  create: async (teamData: TeamCreateData): Promise<Team> => {
    try {
      const response = await api.post(TEAM_ENDPOINTS.CREATE, teamData);
      return response.data;
    } catch (error) {
      console.error("Error creating team:", error);
      throw error;
    }
  },

  // Update team
  update: async (id: number, teamData: TeamUpdateData): Promise<Team> => {
    try {
      const response = await api.put(TEAM_ENDPOINTS.UPDATE(id.toString()), teamData);
      return response.data;
    } catch (error) {
      console.error(`Error updating team ${id}:`, error);
      throw error;
    }
  },

  // Delete team
  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(TEAM_ENDPOINTS.DELETE(id.toString()));
    } catch (error) {
      console.error(`Error deleting team ${id}:`, error);
      throw error;
    }
  },

  // Get team members
  getMembers: async (id: number): Promise<TeamMember[]> => {
    try {
      const response = await api.get(TEAM_ENDPOINTS.MEMBERS(id.toString()));
      return response.data;
    } catch (error) {
      console.error(`Error fetching team ${id} members:`, error);
      throw error;
    }
  },

  // Add team member
  addMember: async (id: number, memberData: TeamMemberAddData): Promise<TeamMembership> => {
    try {
      const response = await api.post(TEAM_ENDPOINTS.ADD_MEMBER(id.toString()), memberData);
      return response.data;
    } catch (error) {
      console.error(`Error adding member to team ${id}:`, error);
      throw error;
    }
  },

  // Remove team member
  removeMember: async (id: number, userId: string): Promise<void> => {
    try {
      await api.post(TEAM_ENDPOINTS.REMOVE_MEMBER(id.toString()), { user_id: userId });
    } catch (error) {
      console.error(`Error removing member from team ${id}:`, error);
      throw error;
    }
  },
};

export default teamService;
