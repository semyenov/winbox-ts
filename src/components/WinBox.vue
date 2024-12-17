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
      <div class="wb-drag" @mousedown.prevent="(e) => mousedownHandler('drag')(e)"
        @touchstart.prevent="(e) => mousedownHandler('drag')(e)">
        <!-- Icon -->
        <div v-if="icon" class="wb-icon" :style="iconStyle" />
        <!-- Title -->
        <div class="wb-title">
          <slot v-if="slots.title" name="title" :title="title" />
          <span v-else v-text="title" />
        </div>
      </div>
    </div>
    <!-- Body -->
    <div class="wb-body" :style="bodyStyle">
      <slot v-if="slots.default" name="default" />
    </div>
    <!-- Resize handles -->
    <div v-for="dir in RESIZE_DIRECTIONS" :key="dir" :class="`wb-${dir}`"
      @mousedown.prevent="(e) => mousedownHandler(dir)(e)" @touchstart.prevent="(e) => mousedownHandler(dir)(e)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, VNode } from 'vue'
import {
  RESIZE_DIRECTIONS,
  STACK_MIN,
  type WindowPosition,
  type WindowSize,
  type WindowState,
  type ResizeDirection
} from './constants'

// Props with proper TypeScript interface
interface Props {
  title?: string
  width?: number | string
  height?: number | string
  x?: number | string
  y?: number | string
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  noMin?: boolean
  noMax?: boolean
  noFull?: boolean
  noClose?: boolean
  modal?: boolean
  background?: string
  icon?: string
  index?: number
}

// Define emits with TypeScript types
interface Emits {
  (e: 'close'): void
  (e: 'focus'): void
  (e: 'blur'): void
  (e: 'minimize'): void
  (e: 'maximize'): void
  (e: 'restore'): void
  (e: 'fullscreen'): void
  (e: 'move', x: number, y: number): void
  (e: 'resize', width: number, height: number): void
}

// Window management
let fullscreenRequest: string | null = null
let fullscreenExit: string | null = null

const props = withDefaults(defineProps<Props>(), {
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

const emit = defineEmits<Emits>()

const slots = defineSlots<{
  title?(props: { title: string }): VNode
  default?(): VNode
}>()

// State management using refs
const windowRef = ref<HTMLElement>()
const id = ref(`winbox-${Math.random().toString(36).substr(2, 9)}`)

const windowState = ref<WindowState>({
  status: 'normal',
  active: false
})

const position = ref<WindowPosition>({ x: 0, y: 0 })
const size = ref<WindowSize>({ width: 0, height: 0 })
const savedPosition = ref<WindowPosition>({ x: 0, y: 0 })
const savedSize = ref<WindowSize>({ width: 0, height: 0 })

// Window dimensions
const root = ref({
  width: window.innerWidth,
  height: window.innerHeight
})

// Drag state
const dragState = ref({
  direction: '',
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


// Move functions
const move = (x?: number, y?: number) => {
  const newX = typeof x === 'number' ? x : position.value.x
  const newY = typeof y === 'number' ? y : position.value.y
  if (newX !== position.value.x || newY !== position.value.y) {
    position.value = { x: newX, y: newY }
    emit('move', newX, newY)
  }
}

const resize = (w?: number, h?: number) => {
  const newWidth = Math.min(Math.max(typeof w === 'number' ? w : size.value.width, props.minWidth || 200), props.maxWidth || Infinity)
  const newHeight = Math.min(Math.max(typeof h === 'number' ? h : size.value.height, props.minHeight || 100), props.maxHeight || Infinity)
  if (newWidth !== size.value.width || newHeight !== size.value.height) {
    size.value = { width: newWidth, height: newHeight }
    emit('resize', size.value.width, size.value.height)
  }
}

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
  const { pageX, pageY } = 'touches' in e ? e.touches[0] : e as MouseEvent
  const deltaX = pageX - dragState.value.startX
  const deltaY = pageY - dragState.value.startY

  if (dragState.value.direction === 'drag') {
    move(
      dragState.value.startPosX + deltaX,
      dragState.value.startPosY + deltaY
    )
  } else {
    // Handle resize
    let newWidth = dragState.value.startWidth
    let newHeight = dragState.value.startHeight
    let newX = dragState.value.startPosX
    let newY = dragState.value.startPosY

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

    move(newX, newY)
    resize(newWidth, newHeight)
  }
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

  move(position.value.x, position.value.y)
  resize(size.value.width, size.value.height)

  window.addEventListener('resize', windowResizeHandler);
  document.addEventListener('fullscreenchange', windowFullscreenHandler);
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', windowResizeHandler)
  document.removeEventListener('fullscreenchange', windowFullscreenHandler)
})
</script>
