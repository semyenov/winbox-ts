// Window resize directions
export const RESIZE_DIRECTIONS = [
  "n",
  "s",
  "w",
  "e",
  "nw",
  "ne",
  "se",
  "sw",
] as const;

export type ResizeDirection = typeof RESIZE_DIRECTIONS[number];

// Event options for listeners
export const EVENT_OPTIONS = { passive: false } as const;

// Stack for minimized windows
export const STACK_MIN: HTMLElement[] = [];

// Type definitions
export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export type WindowStatus = "normal" | "min" | "max" | "full";
export interface WindowState {
  status: WindowStatus;
  active: boolean;
}
