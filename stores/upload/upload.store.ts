// store/useUploadStore.ts
import { create } from "zustand";

interface UploadState {
  // Track multiple uploads with their IDs
  uploads: Record<
    string,
    {
      progress: number;
      status: "idle" | "uploading" | "completed" | "error";
      error?: Error | null;
    }
  >;

  // Actions
  startUpload: (id: string) => void;
  updateProgress: (id: string, progress: number) => void;
  completeUpload: (id: string) => void;
  setError: (id: string, error: Error) => void;
  resetUpload: (id: string) => void;
}

const useUploadStore = create<UploadState>((set) => ({
  uploads: {},

  startUpload: (id: string) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: {
          progress: 0,
          status: "uploading",
          error: null,
        },
      },
    })),

  updateProgress: (id: string, progress: number) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: {
          ...state.uploads[id],
          progress,
        },
      },
    })),

  completeUpload: (id: string) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: {
          ...state.uploads[id],
          progress: 100,
          status: "completed",
        },
      },
    })),

  setError: (id: string, error: Error) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: {
          ...state.uploads[id],
          status: "error",
          error,
        },
      },
    })),

  resetUpload: (id: string) =>
    set((state) => {
      const { [id]: _, ...rest } = state.uploads;
      return { uploads: rest };
    }),
}));

export default useUploadStore;
