<template>
  <div :id="id" :class="['winbox', ...classNames]" ref="windowRef" :style="windowStyle">
    <!-- Header -->
    <div class="wb-header">
      <!-- Controls -->
      <div class="wb-control">
        <span v-if="!noMin" class="wb-min" @click.prevent="minimize" />
        <span v-if="!noMax" class="wb-max" @click.prevent="maximize" />
        <span v-if="!noFull" class="wb-full" @click.prevent="fullscreen" />
        <span class="wb-close" @click.prevent="close" />
      </div>
      <!-- Drag -->
      <div class="wb-drag" @mousedown="(e) => mousedownHandler('drag')(e)"
        @touchstart="(e) => mousedownHandler('drag')(e)">
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
    <div v-for="dir in RESIZE_DIRECTIONS" :key="dir" :class="`wb-${dir}`" @mousedown="(e) => mousedownHandler(dir)(e)"
      @touchstart="(e) => mousedownHandler(dir)(e)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onScopeDispose, useTemplateRef } from 'vue'
import { RESIZE_DIRECTIONS, STACK_MIN } from './constants'
import { useWindowControl } from '../composables/useWindowControl'
import type { WinBoxProps, DragState, WinBoxEmits, ResizeDirection } from './types'

// Add root state
const root = ref({ width: window.innerWidth, height: window.innerHeight })

// Add fullscreen variables
let fullscreenRequest: string | null = null
let fullscreenExit: string | null = null

// Props with proper TypeScript interface
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

// Define emits
const emit = defineEmits<WinBoxEmits>()

// Use window control composable
const {
  windowState,
  position,
  size,
  savedPosition,
  savedSize,
  move,
  resize
} = useWindowControl(emit)

// State management using refs
const id = ref(`winbox-${Math.random().toString(36).substr(2, 9)}`)
const windowRef = useTemplateRef('windowRef')

// Drag state with proper typing
const dragState = ref<DragState>({
  direction: 'drag',
  startX: 0,
  startY: 0,
  startPosX: 0,
  startPosY: 0,
  startWidth: 0,
  startHeight: 0,
  dblClickTimer: 0
})

// Computed properties
const windowStyle = computed(() => ({
  width: `${size.value.width}px`,
  height: `${size.value.height}px`,
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
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
  if (windowState.value.status !== 'normal') classes.push(windowState.value.status)
  if (windowState.value.active) classes.push('focus')
  return classes
})

// Add focus method
const focus = () => {
  if (!windowState.value.active) {
    windowState.value.active = true
    emit('focus')
  }
}

// Add blur method
const blur = () => {
  if (windowState.value.active) {
    windowState.value.active = false
    emit('blur')
  }
}

// Window control methods
const minimize = () => {
  if (windowState.value.status !== 'normal') {
    restore()
    return
  }

  // Save state before minimizing
  savedPosition.value = { ...position.value }
  savedSize.value = { ...size.value }

  blur()
  STACK_MIN.push(windowRef.value as HTMLElement)
  windowState.value.status = 'min'

  resize(0, 35)
  move(root.value.width / 2 - 0 / 2, root.value.height / 2 - 35 / 2)

  emit('minimize')
}

const maximize = () => {
  if (windowState.value.status !== 'normal') {
    restore()
    return
  }

  // Save state before maximizing
  savedPosition.value = { ...position.value }
  savedSize.value = { ...size.value }

  windowState.value.status = 'max'

  resize(root.value.width, root.value.height)
  move(0, 0)

  emit('maximize')
}

const fullscreen = () => {
  if (windowState.value.status !== 'normal') {
    restore()
    return
  }

  if (fullscreenRequest && windowRef.value) {
    const requestMethod = fullscreenRequest as keyof HTMLElement
    if (typeof windowRef.value[requestMethod] === 'function') {
      (windowRef.value[requestMethod] as Function).call(windowRef.value)

      windowState.value.status = 'full'
      emit('fullscreen')

      return
    }
  }
}

const restore = () => {
  if (windowState.value.status === 'full') {
    if (fullscreenExit && windowRef.value) {
      const exitMethod = fullscreenExit as keyof Document
      if (typeof document[exitMethod] === 'function') {
        (document[exitMethod] as Function)()
      }
    }
  }

  if (windowState.value.status !== 'normal') {
    resize(savedSize.value.width, savedSize.value.height)
    move(savedPosition.value.x, savedPosition.value.y)
  }

  windowState.value.status = 'normal'
  emit('restore')
}

const close = () => {
  emit('close')
}

// Methods
const windowResizeHandler = () => {
  root.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
}

const windowFullscreenHandler = () => {
  windowState.value.status = document.fullscreenElement === windowRef.value
    ? 'full'
    : 'normal'
}

// Create a reference to the mousedown handler
const mousedownHandler = (direction: ResizeDirection | 'drag') => (evt: Event) => {
  const e = evt as MouseEvent | TouchEvent
  e.stopPropagation()
  e.preventDefault()

  focus()

  if (direction === "drag") {
    if (!props.noMax) {
      const now = Date.now();
      const diff = now - dragState.value.dblClickTimer;
      dragState.value.dblClickTimer = now;
      if (diff < 300) {
        maximize()
        return;
      }
    }

    if (windowState.value.status !== 'normal') {
      restore()
      return
    }
  }

  if (windowState.value.status === 'normal') {
    document.body.classList.add('wb-lock')
    dragState.value.direction = direction

    const { pageX, pageY } = 'touches' in e
      ? e.touches[0]
      : e as MouseEvent

    dragState.value.startX = pageX
    dragState.value.startY = pageY
    dragState.value.startPosX = position.value.x
    dragState.value.startPosY = position.value.y
    dragState.value.startWidth = size.value.width
    dragState.value.startHeight = size.value.height

    window.addEventListener('mousemove', mousemoveHandler)
    window.addEventListener('mouseup', mouseupHandler)
    window.addEventListener('touchmove', mousemoveHandler)
    window.addEventListener('touchend', mouseupHandler)
  }
}

// Event handlers
const mousemoveHandler = (evt: Event) => {
  const e = evt as MouseEvent | TouchEvent

  const { pageX, pageY } = 'touches' in e
    ? e.touches[0]
    : e as MouseEvent

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

const mouseupHandler = () => {
  document.body.classList.remove('wb-lock')
  window.removeEventListener('mousemove', mousemoveHandler)
  window.removeEventListener('mouseup', mouseupHandler)
  window.removeEventListener('touchmove', mousemoveHandler)
  window.removeEventListener('touchend', mouseupHandler)
}

// Lifecycle hooks
onMounted(() => {
  const requestMethods = ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullscreen', 'msRequestFullscreen'];
  fullscreenRequest = requestMethods.find(req => document.body[req as keyof HTMLElement]) || null;

  const cancelMethods = ["exitFullscreen", "webkitExitFullscreen", "mozCancelFullScreen", "msExitFullscreen",];
  fullscreenExit = cancelMethods.find(req => document[req as keyof Document]) || null;

  position.value = {
    x: typeof props.x === 'number' ? props.x : root.value.width / 2 - Number(props.width) / 2,
    y: typeof props.y === 'number' ? props.y : root.value.height / 2 - Number(props.height) / 2
  }

  size.value = {
    width: Number(props.width),
    height: Number(props.height)
  }

  resize(size.value.width, size.value.height)
  move(position.value.x, position.value.y)

  window.addEventListener('resize', windowResizeHandler);
  document.addEventListener('fullscreenchange', windowFullscreenHandler);
})

onScopeDispose(() => {
  window.removeEventListener('resize', windowResizeHandler)
  document.removeEventListener('fullscreenchange', windowFullscreenHandler)
})
</script>
