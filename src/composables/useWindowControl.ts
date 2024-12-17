import { computed, type Ref, ref, watch } from "vue";
import type {
  WindowPosition,
  WindowSize,
  WindowState,
} from "../components/types";
import { useFullscreen, useWindowSize } from "@vueuse/core";

// // Improve type safety for emit
type EmitFn = {
  (event: "move", x: number, y: number): void;
  (event: "resize", width: number, height: number): void;
  (event: "focus"): void;
  (event: "blur"): void;
  (event: "minimize"): void;
  (event: "maximize"): void;
  (event: "fullscreen"): void;
  (event: "restore"): void;
  (event: "close"): void;
};

interface WinBoxControlReturn {
  state: Ref<WindowState>;
  save: () => void;

  move: (
    x?: number,
    y?: number,
  ) => [boolean, boolean];
  resize: (
    width?: number,
    height?: number,
    minWidth?: number,
    minHeight?: number,
    maxWidth?: number,
    maxHeight?: number,
  ) => [boolean, boolean];

  focus: () => void;
  blur: () => void;

  minimize: (force?: boolean) => void;
  maximize: (force?: boolean) => void;
  fullscreen: (force?: boolean) => void;
  restore: (force?: boolean) => void;
  close: (force?: boolean) => void;
}

export function useWinBoxControl(
  windowRef: Ref<HTMLElement | null>,
  params: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    emit: EmitFn;
  },
): WinBoxControlReturn {
  const {
    width: windowWidth,
    height: windowHeight,
  } = useWindowSize();

  const {
    // minWidth = 200,
    // maxWidth = windowWidth.value,
    // maxHeight = windowHeight.value,
    minHeight = 100,
    emit,
  } = params;

  const {
    isFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
  } = useFullscreen(windowRef, {
    autoExit: true,
  });

  const state = ref<WindowState>({
    focused: false,
    status: "normal",
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  const saved = ref<WindowState>({
    focused: false,
    status: "normal",
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  const isNormal = computed(() => state.value.status === "normal");
  const isMinimized = computed(() => state.value.status === "min");
  const isMaximized = computed(() => state.value.status === "max");
  const isFocused = computed(() => state.value.focused);

  const setStateProperty = <T extends keyof WindowState>(
    property: T,
    value: WindowState[T],
  ) => {
    state.value[property] = value;
  };

  const setStatus = (status: WindowState["status"]) =>
    setStateProperty(
      "status",
      status,
    );
  const setPosition = (position: WindowPosition) =>
    setStateProperty(
      "position",
      position,
    );
  const setSize = (size: WindowSize) =>
    setStateProperty(
      "size",
      size,
    );
  const setFocused = (focused: boolean) =>
    setStateProperty(
      "focused",
      focused,
    );

  // Window state snapshot
  const save = () => {
    saved.value.focused = state.value.focused;

    if (isNormal.value) {
      saved.value.position = state.value.position;
      saved.value.size = state.value.size;
    }
  };

  const move = (x?: number, y?: number): [boolean, boolean] => {
    const { x: currentX, y: currentY } = state.value.position;
    const newX = typeof x === "number" ? x : currentX;
    const newY = typeof y === "number" ? y : currentY;

    const isXChanged = newX !== currentX;
    const isYChanged = newY !== currentY;

    if (isXChanged || isYChanged) {
      setPosition({ x: newX, y: newY });
      emit("move", newX, newY);
      return [isXChanged, isYChanged];
    }

    return [false, false];
  };

  const resize = (
    width?: number,
    height?: number,
    minWidth = 200,
    minHeight = 100,
    maxWidth = windowWidth.value,
    maxHeight = windowHeight.value,
  ): [boolean, boolean] => {
    const {
      width: currentWidth,
      height: currentHeight,
    } = state.value.size;

    const newWidth = Math.min(
      maxWidth,
      Math.max(
        minWidth,
        typeof width === "number" ? width : currentWidth,
      ),
    );
    const newHeight = Math.min(
      maxHeight,
      Math.max(
        minHeight,
        typeof height === "number" ? height : currentHeight,
      ),
    );

    const isWidthChanged = newWidth !== currentWidth;
    const isHeightChanged = newHeight !== currentHeight;

    if (isWidthChanged || isHeightChanged) {
      setSize({ width: newWidth, height: newHeight });
      emit("resize", newWidth, newHeight);
      return [isWidthChanged, isHeightChanged];
    }

    return [false, false];
  };

  const focus = () => {
    if (!isFocused.value) {
      setFocused(true);
      emit("focus");
    }

    save();
  };

  const blur = () => {
    if (isFocused.value) {
      setFocused(false);
      emit("blur");
    }

    save();
  };

  // Window control methods
  const minimize = async (force = false) => {
    if (!isNormal.value && !force) {
      const ok = isMinimized.value;
      await restore();

      if (ok) return;
    }

    save();
    setStatus("min");

    resize(0, minHeight);
    move(0, windowHeight.value - minHeight);

    emit("minimize");
  };

  const maximize = async (force = false) => {
    if (!isNormal.value && !force) {
      const ok = isMaximized.value;
      await restore();

      if (ok) return;
    }

    save();
    setStatus("max");

    resize(windowWidth.value, windowHeight.value);
    move(0, 0);

    emit("maximize");
  };

  const fullscreen = async (force = false) => {
    if (!isNormal.value && !force) {
      const ok = isFullscreen.value;
      await restore();

      if (ok) return;
    }

    save();
    setStatus("full");
    await enterFullscreen();
    emit("fullscreen");
  };

  const restore = async () => {
    if (isFullscreen.value) {
      await exitFullscreen();
    }

    const {
      size: { width: savedWidth, height: savedHeight },
      position: { x: savedX, y: savedY },
    } = saved.value;

    resize(savedWidth, savedHeight);
    move(savedX, savedY);

    setStatus("normal");
    emit("restore");
  };

  const close = () => {
    save();
    emit("close");
  };

  watch([windowWidth, windowHeight], () => {
    switch (state.value.status) {
      case "max":
        maximize(true);
        break;
      case "min":
        minimize(true);
        break;
    }
  });

  return {
    state,
    save,

    move,
    resize,

    focus,
    blur,

    minimize,
    maximize,
    fullscreen,
    restore,
    close,
  };
}
