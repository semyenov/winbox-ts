import { computed, type Ref, ref, watch } from "vue";
import type { WindowState } from "../components/types";
import { useFullscreen, useWindowSize } from "@vueuse/core";

// Improve type safety for emit
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

interface WindowControlReturn {
  state: Ref<WindowState>;
  save: () => void;

  move: (x?: number, y?: number) => void;
  resize: (
    w?: number,
    h?: number,
    minWidth?: number,
    minHeight?: number,
    maxWidth?: number,
    maxHeight?: number,
  ) => void;
  focus: () => void;
  blur: () => void;
  minimize: (force?: boolean) => void;
  maximize: (force?: boolean) => void;
  fullscreen: (force?: boolean) => void;
  restore: (force?: boolean) => void;
  close: (force?: boolean) => void;
}

export function useWindowControl(
  windowRef: Ref<HTMLElement | null>,
  emit: EmitFn,
): WindowControlReturn {
  const {
    width: rootWidth,
    height: rootHeight,
  } = useWindowSize();
  const {
    isFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
  } = useFullscreen(windowRef);

  const state = ref<WindowState>({
    active: false,
    status: "normal",
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  const saved = ref<WindowState>({
    active: false,
    status: "normal",
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  });

  // Window state
  const isMinimized = computed(() => state.value.status === "min");
  const isMaximized = computed(() => state.value.status === "max");
  const isNormal = computed(() => state.value.status === "normal");
  const setStatus = (status: WindowState["status"]) => {
    state.value.status = status;
  };

  // Window active state
  const isActive = computed(() => state.value.active);
  const setActive = (active: boolean) => {
    state.value.active = active;
  };

  const setPosition = (position: WindowPosition) => {
    state.value.position = position;
  };

  const setSize = (size: WindowSize) => {
    state.value.size = size;
  };

  // Add window state snapshot utility
  const save = () => {
    if (isNormal.value) saved.value = { ...state.value };
  };

  const move = (x?: number, y?: number) => {
    const newPosition = {
      x: typeof x === "number" ? x : state.value.position.x,
      y: typeof y === "number" ? y : state.value.position.y,
    };

    if (
      newPosition.x !== state.value.position.x ||
      newPosition.y !== state.value.position.y
    ) {
      setPosition(newPosition);
      emit("move", newPosition.x, newPosition.y);
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
    const newSize = {
      width: Math.min(
        maxWidth,
        Math.max(
          minWidth,
          typeof w === "number" ? w : state.value.size.width,
        ),
      ),
      height: Math.min(
        maxHeight,
        Math.max(
          minHeight,
          typeof h === "number" ? h : state.value.size.height,
        ),
      ),
    };

    if (
      newSize.width !== state.value.size.width ||
      newSize.height !== state.value.size.height
    ) {
      setSize(newSize);
      emit("resize", newSize.width, newSize.height);
    }
  };

  // Add focus method
  const focus = () => {
    if (!isActive.value) {
      setActive(true);
      emit("focus");
    }

    save();
  };

  // Add blur method
  const blur = () => {
    if (isActive.value) {
      setActive(false);
      emit("blur");
    }

    save();
  };

  // Window control methods
  const minimize = (force = false) => {
    if (isMinimized.value && !force) {
      restore();
      return;
    }

    save();
    setStatus("min");

    const minHeight = 35;
    resize(0, minHeight);
    move(
      rootWidth.value / 2,
      rootHeight.value - minHeight,
    );

    emit("minimize");
  };

  const maximize = (force = false) => {
    if (isMaximized.value && !force) {
      restore();
      return;
    }

    save();
    setStatus("max");

    // Account for potential taskbar/dock
    const maxHeight = rootHeight.value - 5;
    resize(rootWidth.value, maxHeight);
    move(0, 0);

    emit("maximize");
  };

  const fullscreen = (force = false) => {
    if (isFullscreen.value && !force) {
      restore();
      return;
    }

    save();
    setStatus("full");

    enterFullscreen();
    emit("fullscreen");

    return;
  };

  const restore = (force = false) => {
    if (isNormal.value && !force) {
      return;
    }

    switch (state.value.status) {
      case "max":
      case "min":
        resize(saved.value.size.width, saved.value.size.height);
        move(saved.value.position.x, saved.value.position.y);
        break;
      case "full":
        exitFullscreen();
        break;
    }

    setStatus("normal");
    emit("restore");
  };

  const close = () => {
    emit("close");
  };

  watch([rootWidth, rootHeight], () => {
    switch (state.value.status) {
      case "max":
        maximize(true);
        break;
      case "min":
        minimize(true);
        break;
    }
  });

  watch([isFullscreen], ([newIsFullscreen]) => {
    if (newIsFullscreen) state.value.status = "full";
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
