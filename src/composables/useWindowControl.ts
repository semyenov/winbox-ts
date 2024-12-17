import { ref } from "vue";
import type {
  WindowPosition,
  WindowSize,
  WindowState,
} from "../components/types";

export function useWindowControl(emit: any) {
  const windowState = ref<WindowState>({
    status: "normal",
    active: false,
  });

  const position = ref<WindowPosition>({ x: 0, y: 0 });
  const size = ref<WindowSize>({ width: 0, height: 0 });
  const savedPosition = ref<WindowPosition>({ x: 0, y: 0 });
  const savedSize = ref<WindowSize>({ width: 0, height: 0 });

  const move = (x?: number, y?: number) => {
    const newX = typeof x === "number" ? x : position.value.x;
    const newY = typeof y === "number" ? y : position.value.y;
    if (newX !== position.value.x || newY !== position.value.y) {
      position.value = { x: newX, y: newY };
      emit("move", newX, newY);
    }
  };

  const resize = (
    w?: number,
    h?: number,
    minWidth = 200,
    minHeight = 100,
    maxWidth = Infinity,
    maxHeight = Infinity,
  ) => {
    const newWidth = Math.min(
      Math.max(typeof w === "number" ? w : size.value.width, minWidth),
      maxWidth,
    );
    const newHeight = Math.min(
      Math.max(typeof h === "number" ? h : size.value.height, minHeight),
      maxHeight,
    );
    if (newWidth !== size.value.width || newHeight !== size.value.height) {
      size.value = { width: newWidth, height: newHeight };
      emit("resize", size.value.width, size.value.height);
    }
  };

  return {
    windowState,
    position,
    size,
    savedPosition,
    savedSize,
    move,
    resize,
  };
}
