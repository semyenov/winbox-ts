<template>
  <div :id="id" :class="['winbox', ...classNames]" ref="windowRef" :style="windowStyle">
    <!-- Header -->
    <div class="wb-header">
      <!-- Controls -->
      <div class="wb-control">
        <span v-if="!noMin" class="wb-min" @click.prevent="minimize(false)" />
        <span v-if="!noMax" class="wb-max" @click.prevent="maximize(false)" />
        <span v-if="!noFull" class="wb-full" @click.prevent="fullscreen(false)" />
        <span v-if="!noClose" class="wb-close" @click.prevent="close(false)" />
      </div>
      <!-- Drag -->
      <div class="wb-drag" @mousedown="mousedownHandler('drag', $event)" @touchstart="mousedownHandler('drag', $event)">
        <!-- Icon -->
        <div v-if="icon" class="wb-icon" :style="iconStyle" />
        <!-- Title -->
        <div class="wb-title">
          <slot v-if="$slots.title" name="title" :title="title" />
          <span v-else v-text="title" />
        </div>
      </div>
    </div>
    <!-- Body -->
    <div class="wb-body" :style="bodyStyle">
      <slot v-if="$slots.default" name="default" />
    </div>
    <!-- Resize handles -->
    <div v-for="dir in RESIZE_DIRECTIONS" :key="dir" :class="`wb-${dir}`" @mousedown="mousedownHandler(dir, $event)"
      @touchstart="mousedownHandler(dir, $event)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onScopeDispose } from 'vue'
import { RESIZE_DIRECTIONS } from './constants'
import { useWindowControl } from '../composables/useWindowControl'
import type { WinBoxProps, DragState, ResizeDirection } from './types'

// Improve type safety with proper event types
type DragEvent = MouseEvent | TouchEvent

// Extract handler creation to a separate function for better organization
const getPagePosition = (e: DragEvent) => {
  const { pageX, pageY } = 'touches' in e
    ? e.touches[0]
    : e as MouseEvent
  return { pageX, pageY }
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

// Improve ID generation with a more reliable method
const id = ref(`winbox-${crypto.randomUUID()}`)
const windowRef = ref<HTMLElement | null>(null)

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
} = useWindowControl(windowRef, emit)

// Drag state with proper typing
const dragState = ref<DragState>({
  direction: 'drag',
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0,
  startWidth: 0,
  startHeight: 0,
  dblClickTimer: 0,
})

// Computed properties
const windowStyle = computed(() => ({
  width: `${state.value.size.width}px`,
  height: `${state.value.size.height}px`,
  left: `${state.value.position.x}px`,
  top: `${state.value.position.y}px`,
  background: props.background,
  zIndex: props.index
}))

const bodyStyle = computed(() => ({
  height: 'calc(100% - 35px)'
}))

const iconStyle = computed(() =>
  props.icon ? { backgroundImage: `url(${props.icon})` } : {}
)

const classNames = computed(() => {
  const classes: string[] = []
  if (props.modal) classes.push('modal')
  if (state.value.status !== 'normal') classes.push(state.value.status)
  if (state.value.active) classes.push('focus')
  return classes
})

// Improve mousedown handler with better type safety
const mousedownHandler = (direction: ResizeDirection | 'drag', evt: Event) => {
  const e = evt as DragEvent
  e.stopPropagation()
  e.preventDefault()
  focus()

  if (direction === "drag" && handleDragStart()) {
    return
  }

  if (state.value.status === 'normal') {
    initializeDragState(direction, e)
  }
}

// Extract drag initialization logic
const initializeDragState = (direction: ResizeDirection | 'drag', e: DragEvent) => {
  document.body.classList.add('wb-lock')
  dragState.value.direction = direction
  const { pageX, pageY } = getPagePosition(e)
  Object.assign(dragState.value, {
    startX: pageX,
    startY: pageY,
    startPosX: state.value.position.x,
    startPosY: state.value.position.y,
    startWidth: state.value.size.width,
    startHeight: state.value.size.height
  })

  addDragListeners()
}

// Event handlers
const mousemoveHandler = (evt: Event) => {
  const e = evt as MouseEvent | TouchEvent
  const { pageX, pageY } = getPagePosition(e)

  const deltaX = pageX - dragState.value.startX
  const deltaY = pageY - dragState.value.startY

  if (dragState.value.direction === 'drag') {
    move(dragState.value.startPosX + deltaX, dragState.value.startPosY + deltaY)
    return
  }

  // Handle resize
  let newX = dragState.value.startPosX
  let newY = dragState.value.startPosY
  let newWidth = dragState.value.startWidth
  let newHeight = dragState.value.startHeight

  if (dragState.value.direction.includes('e')) {
    newWidth = dragState.value.startWidth + deltaX
  }
  if (dragState.value.direction.includes('w')) {
    newWidth = dragState.value.startWidth - deltaX
    newX = dragState.value.startPosX + deltaX
  }
  if (dragState.value.direction.includes('s')) {
    newHeight = dragState.value.startHeight + deltaY
  }
  if (dragState.value.direction.includes('n')) {
    newHeight = dragState.value.startHeight - deltaY
    newY = dragState.value.startPosY + deltaY
  }

  resize(newWidth, newHeight)
  move(newX, newY)
}

// Add these missing functions
const handleDragStart = () => {
  if (!props.noMax) {
    const now = Date.now()
    const diff = now - dragState.value.dblClickTimer
    dragState.value.dblClickTimer = now

    if (diff < 300) {
      maximize()
      return true
    }
  }

  if (state.value.status !== 'normal') {
    restore()
    return true
  }

  return false
}

const addDragListeners = () => {
  window.addEventListener('mousemove', mousemoveHandler)
  window.addEventListener('mouseup', mouseupHandler)
  window.addEventListener('touchmove', mousemoveHandler)
  window.addEventListener('touchend', mouseupHandler)
}

const mouseupHandler = () => {
  document.body.classList.remove('wb-lock')
  window.removeEventListener('mousemove', mousemoveHandler)
  window.removeEventListener('mouseup', mouseupHandler)
  window.removeEventListener('touchmove', mousemoveHandler)
  window.removeEventListener('touchend', mouseupHandler)
}

// Lifecycle hooks
onMounted(() => {
  state.value.position = {
    x: typeof props.x === 'number' ? props.x : window.innerWidth / 2 - Number(props.width) / 2,
    y: typeof props.y === 'number' ? props.y : window.innerHeight / 2 - Number(props.height) / 2
  }

  state.value.size = {
    width: Number(props.width),
    height: Number(props.height)
  }

  resize()
  move()
})

onScopeDispose(() => {
  window.removeEventListener('mousemove', mousemoveHandler)
  window.removeEventListener('mouseup', mouseupHandler)
  window.removeEventListener('touchmove', mousemoveHandler)
  window.removeEventListener('touchend', mouseupHandler)
})
</script>
