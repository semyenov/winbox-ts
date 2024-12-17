<template>
  <div :id="id" :class="{
    'winbox': true,
    modal: modal,
    focus: state.focused,
    min: state.status === 'min',
    max: state.status === 'max',
    full: state.status === 'full',
    normal: state.status === 'normal',
  }" ref="winbowRef" :style="winbowStyle">
    <!-- Header -->
    <div class="wb-header">
      <!-- Controls -->
      <div class="wb-control">
        <span v-if="!noMin" class="wb-min" @click="minimize(false)" />
        <span v-if="!noMax" class="wb-max" @click="maximize(false)" />
        <span v-if="!noFull" class="wb-full" @click="fullscreen(false)" />
        <span v-if="!noClose" class="wb-close" @click="close(false)" />
      </div>
      <!-- Drag -->
      <div class="wb-drag" @mousedown="(e: DragEvent) => dragStart('drag', undefined, e)"
        @touchstart="(e: DragEvent) => dragStart('drag', undefined, e)">
        <div v-if="icon" class="wb-icon" />
        <div class="wb-title">
          <slot v-if="slots.title" name="title" :title="title" />
          <span v-else v-text="title" />
        </div>
      </div>
    </div>
    <!-- Body -->
    <div class="wb-body">
      <slot />
    </div>
    <!-- Resize handles -->
    <div v-for="dir in RESIZE_DIRECTIONS" :key="dir" :class="`wb-${dir}`"
      @mousedown="(e: DragEvent) => dragStart('resize', dir, e)"
      @touchstart="(e: DragEvent) => dragStart('resize', dir, e)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onScopeDispose, type VNode, useTemplateRef } from 'vue'

import { useWinBoxControl } from '../composables/useWindowControl'
import { parse } from '../utils/parse'

import type { WinBoxProps, DragState, DragStateType, DragStateDirection, DragStateParams } from './types'

type DragEvent = MouseEvent | TouchEvent

const EVENT_OPTIONS = { passive: false } as const;
const RESIZE_DIRECTIONS: DragStateDirection[] = [
  "n",
  "s",
  "w",
  "e",
  "nw",
  "ne",
  "se",
  "sw",
] as const;

// Extract handler creation to a separate function for better organization
const getDragEventPosition = (e: DragEvent) => {
  const { pageX: x, pageY: y } = 'touches' in e
    ? e.touches[0]
    : e as MouseEvent
  return { x, y }
}

// Props with proper TypeScript interface and validation
const props = withDefaults(defineProps<WinBoxProps>(), {
  title: '',
  width: 500,
  height: 300,
  minWidth: 200,
  minHeight: 100,
  noMin: false,
  noMax: false,
  noFull: false,
  noClose: false,
  modal: false,
})

// Define emits with proper typing
const emit = defineEmits<{
  close: [],
  minimize: [],
  maximize: [],
  restore: [],
  fullscreen: [],
  focus: [],
  blur: [],
  move: [number, number],
  resize: [number, number],
}>()

const slots = defineSlots<{
  default?: () => VNode
  title?: (props: { title: string }) => VNode
}>()

const id = ref(`winbox-${crypto.randomUUID()}`)
const winbowRef = useTemplateRef('winbowRef')

const {
  innerWidth: windowWidth,
  innerHeight: windowHeight
} = window

const maxHeight = props.maxHeight ? parse(props.maxHeight, windowHeight) : Infinity;
const maxWidth = props.maxWidth ? parse(props.maxWidth, windowWidth) : Infinity;
const minHeight = props.minHeight ? parse(props.minHeight, maxHeight) : 100;
const minWidth = props.minWidth ? parse(props.minWidth, maxWidth) : 200;

const startWidth = Math.max(
  Math.min(props.width ? parse(props.width, maxWidth) : 500, maxWidth),
  minWidth
);
const startHeight = Math.max(
  Math.min(props.height ? parse(props.height, maxHeight) : 300, maxHeight),
  minHeight
);

const startPosX = props.x
  ? parse(props.modal ? "center" : props.x, windowWidth, maxWidth)
  : windowWidth / 2;
const startPosY = props.y
  ? parse(props.modal ? "center" : props.y, windowHeight, maxHeight)
  : windowHeight / 2;

// Use window control composable with proper emit typing
const {
  state,
  focus,
  minimize,
  maximize,
  restore,
  close,
  fullscreen,
  move,
  resize
} = useWinBoxControl(winbowRef, {
  maxHeight,
  maxWidth,
  minHeight,
  minWidth,
  emit
})

// Drag state with proper typing
const dragState = ref<DragState>({
  type: 'drag',
  params: 'n',
  startX: 0,
  startY: 0,
  startPosX,
  startPosY,
  startWidth,
  startHeight,
  dblClickTimer: 0,
})

// Computed properties
const winbowStyle = computed(() => ({
  width: `${state.value.size.width}px`,
  height: `${state.value.size.height}px`,
  left: `${state.value.position.x}px`,
  top: `${state.value.position.y}px`,
  background: props.background,
  zIndex: props.index
}))

// Event handlers
const dragMove = (evt: Event) => {
  const e = evt as MouseEvent | TouchEvent

  const {
    startX,
    startY
  } = dragState.value
  const {
    x,
    y
  } = getDragEventPosition(e)

  const deltaX = x - startX
  const deltaY = y - startY

  const {
    type,
    params,
    startPosX,
    startPosY,
    startWidth,
    startHeight
  } = dragState.value

  if (type === 'drag') {
    move(
      startPosX + deltaX,
      startPosY + deltaY
    )

    return
  }

  let newX = startPosX
  let newY = startPosY
  let newWidth = startWidth
  let newHeight = startHeight

  const dir = params as DragStateDirection

  if (dir.indexOf('e') !== -1) {
    newWidth = startWidth + deltaX
  }
  if (dir.indexOf('w') !== -1) {
    newWidth = startWidth - deltaX
    newX = startPosX + deltaX
  }
  if (dir.indexOf('s') !== -1) {
    newHeight = startHeight + deltaY
  }
  if (dir.indexOf('n') !== -1) {
    newHeight = startHeight - deltaY
    newY = startPosY + deltaY
  }

  const {
    x: currentX,
    y: currentY
  } = state.value.position;

  const [
    isWidthResized,
    isHeightResized
  ] = resize(
    newWidth,
    newHeight
  )
  move(
    isWidthResized
      ? newX
      : currentX,
    isHeightResized
      ? newY
      : currentY
  )
}

const dragStop = () => {
  document.body.classList.remove('wb-lock')

  // Remove mouse events
  window.removeEventListener('mousemove', dragMove)
  window.removeEventListener('mouseup', dragStop)

  // Remove touch events
  window.removeEventListener('touchmove', dragMove)
  window.removeEventListener('touchend', dragStop)
}

const dragStart = <T extends DragStateType>(
  type: T,
  params: DragStateParams<T>,
  evt: DragEvent
) => {
  evt.stopPropagation()
  evt.preventDefault()

  focus()

  if (type === "drag") {
    if (!props.noMax) {
      const now = Date.now()
      const diff = now - dragState.value.dblClickTimer
      dragState.value.dblClickTimer = now

      if (diff < 300) {
        maximize()
        return
      }
    }

    if (state.value.status !== 'normal') {
      restore()
      return
    }
  }

  const {
    position: { x: startPosX, y: startPosY },
    size: { width: startWidth, height: startHeight }
  } = state.value
  const {
    x: startX,
    y: startY
  } = getDragEventPosition(evt)

  Object.assign<DragState, Partial<DragState>>(dragState.value, {
    type,
    params,
    startX,
    startY,
    startPosX,
    startPosY,
    startWidth,
    startHeight,
  })

  document.body.classList.add('wb-lock')

  // Add mouse events
  window.addEventListener('mousemove', dragMove, EVENT_OPTIONS)
  window.addEventListener('mouseup', dragStop, EVENT_OPTIONS)

  // Add touch events
  window.addEventListener('touchmove', dragMove, EVENT_OPTIONS)
  window.addEventListener('touchend', dragStop, EVENT_OPTIONS)
}

// Lifecycle hooks
onMounted(() => {
  const size = {
    width: parse(props.width, windowWidth),
    height: parse(props.height, windowHeight)
  }
  const position = {
    x: typeof props.x === 'number'
      ? parse(props.x, windowWidth - size.width, size.width)
      : parse(props.x || 'center', windowWidth, size.width),
    y: typeof props.y === 'number'
      ? parse(props.y, windowHeight - size.height, size.height)
      : parse(props.y || 'center', windowHeight, size.height)
  }

  const [
    isWidthResized,
    isHeightResized
  ] = resize(size.width, size.height)
  move(
    isWidthResized
      ? position.x
      : startPosX,
    isHeightResized
      ? position.y
      : startPosY
  )
})

onScopeDispose(dragStop)
</script>
