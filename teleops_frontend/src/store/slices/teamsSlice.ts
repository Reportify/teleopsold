import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Team {
  id: string;
  name: string;
  team_leader_id: string;
  team_leader_name?: string;
  members_count?: number;
  status: "Active" | "Inactive";
}

interface TeamsState {
  teams: Team[];
  selectedTeam: Team | null;
  loading: boolean;
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  selectedTeam: null,
  loading: false,
  error: null,
};

const teamsSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    setTeams: (state, action: PayloadAction<Team[]>) => {
      state.teams = action.payload;
    },
    setSelectedTeam: (state, action: PayloadAction<Team | null>) => {
      state.selectedTeam = action.payload;
    },
  },
});

export const { setTeams, setSelectedTeam } = teamsSlice.actions;
export default teamsSlice.reducer;
