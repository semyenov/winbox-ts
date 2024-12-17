export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowState {
  status: "normal" | "min" | "max" | "full";
  active: boolean;
  position: WindowPosition;
  size: WindowSize;
}

export type DragStateDirection =
  | "n"
  | "s"
  | "w"
  | "e"
  | "nw"
  | "ne"
  | "se"
  | "sw";

export type DragStateResizeType = `resize`;
export type DragStateDragType = `drag`;

export type DragStateType = DragStateResizeType | DragStateDragType;

export interface DragState {
  type: DragStateType;
  direction: DragStateDirection;
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
