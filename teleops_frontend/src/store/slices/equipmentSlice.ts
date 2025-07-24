import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface EquipmentCategory {
  id: string;
  name: string;
  description?: string;
}

export interface EquipmentModel {
  id: string;
  category_id: string;
  name: string;
  description?: string;
}

interface EquipmentState {
  categories: EquipmentCategory[];
  models: EquipmentModel[];
  loading: boolean;
  error: string | null;
}

const initialState: EquipmentState = {
  categories: [],
  models: [],
  loading: false,
  error: null,
};

const equipmentSlice = createSlice({
  name: "equipment",
  initialState,
  reducers: {
    setCategories: (state, action: PayloadAction<EquipmentCategory[]>) => {
      state.categories = action.payload;
    },
    setModels: (state, action: PayloadAction<EquipmentModel[]>) => {
      state.models = action.payload;
    },
  },
});

export const { setCategories, setModels } = equipmentSlice.actions;
export default equipmentSlice.reducer;
