import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface EquipmentItem {
  id: number;
  name: string;
  material_code?: string;
  category?: string;
  sub_category?: string;
  manufacturer?: string;
  unit_of_measurement?: string;
  technologies?: string[];
}

interface EquipmentState {
  items: EquipmentItem[];
  loading: boolean;
  error: string | null;
}

const initialState: EquipmentState = {
  items: [],
  loading: false,
  error: null,
};

const equipmentSlice = createSlice({
  name: "equipment",
  initialState,
  reducers: {
    setItems: (state, action: PayloadAction<EquipmentItem[]>) => {
      state.items = action.payload;
    },
  },
});

export const { setItems } = equipmentSlice.actions;
export default equipmentSlice.reducer;
