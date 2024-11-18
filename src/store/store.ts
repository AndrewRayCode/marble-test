import { create } from 'zustand';

export interface Store {
  debug: boolean;
}

export const useStore = create<Store>((set) => ({
  debug: false,
}));
