import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (variant: ToastVariant, message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

/**
 * Auto-dismiss length. Each <ToastCard> owns its own countdown (so it can pause
 * on hover/focus/drag and animate out), while this store just holds the live
 * list. Keep in sync with `--toast-duration` in Toaster.module.css.
 */
export const TOAST_DURATION_MS = 5000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (variant, message) =>
    set((state) => ({ toasts: [...state.toasts, { id: ++seq, variant, message }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Imperative toast API — usable outside React (e.g. the queryClient error cache)
 * as well as via `useToast()` in components. All toasts stack bottom + inline-end.
 */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
  info: (message: string) => useToastStore.getState().push('info', message),
  warning: (message: string) => useToastStore.getState().push('warning', message),
};

export const useToast = () => toast;
