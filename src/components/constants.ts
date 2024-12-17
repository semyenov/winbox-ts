import type { DragStateDirection } from "./types";

// Window resize directions
export const EVENT_OPTIONS = { passive: false } as const;
export const STACK_MIN: HTMLElement[] = [];
export const RESIZE_DIRECTIONS: DragStateDirection[] = [
  "n",
  "s",
  "w",
  "e",
  "nw",
  "ne",
  "se",
  "sw",
] as const;
