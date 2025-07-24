import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Task {
  id: string;
  name: string;
  project_id: string;
  site_id: string;
  status: "Created" | "Allocated" | "Assigning" | "Assigned" | "In_Progress" | "Done";
  assigned_team_id?: string;
  equipment_verified?: number;
  equipment_total?: number;
  created_at: string;
}

interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  loading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,
};

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },
  },
});

export const { setTasks, setSelectedTask } = tasksSlice.actions;
export default tasksSlice.reducer;
