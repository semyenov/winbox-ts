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
  focused: boolean;
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

export type DragStateType = "resize" | "drag";
export type DragStateParams<T extends DragStateType> = T extends "resize"
  ? DragStateDirection
  : undefined;

export interface DragState<T extends DragStateType = DragStateType> {
  type: T;
  params: DragStateParams<T>;

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
