export type ResizeDirection = "n" | "s" | "w" | "e" | "nw" | "ne" | "se" | "sw";

export interface WindowState {
  status: "normal" | "min" | "max" | "full";
  active: boolean;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface DragState {
  direction: ResizeDirection | "drag";
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
  startWidth: number;
  startHeight: number;
  dblClickTimer: number;
}

export interface WinBoxProps {
  title?: string;
  width?: number | string;
  height?: number | string;
  x?: number | string;
  y?: number | string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  noMin?: boolean;
  noMax?: boolean;
  noFull?: boolean;
  noClose?: boolean;
  modal?: boolean;
  background?: string;
  icon?: string;
  index?: number;
}

export interface WinBoxEmits {
  close: [];
  focus: [];
  blur: [];
  minimize: [];
  maximize: [];
  restore: [];
  fullscreen: [];
  move: [x: number, y: number];
  resize: [width: number, height: number];
}
