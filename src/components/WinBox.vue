<template>
    <div :id="id" :class="['winbox', ...classNames]" ref="windowRef" :style="windowStyle">
        <div class="wb-header">
            <div class="wb-control">
                <span v-if="!noMin" class="wb-min"
                    @click.prevent="() => { if (min) { restore() } else { minimize() } }"></span>
                <span v-if="!noMax" class="wb-max"
                    @click.prevent="() => { if (max) { restore() } else { maximize() } }"></span>
                <span v-if="!noFull" class="wb-full"
                    @click.prevent="() => { if (full) { restore() } else { fullscreen() } }"></span>
                <span class="wb-close" @click.prevent="close"></span>
            </div>
            <div class="wb-drag">
                <div v-if="icon" class="wb-icon" :style="iconStyle"></div>
                <div class="wb-title">{{ title }}</div>
            </div>
        </div>
        <div class="wb-body" :style="bodyStyle">
            <slot></slot>
        </div>
        <!-- Resize handles -->
        <div v-for="dir in RESIZE_DIRECTIONS" :key="dir" :class="`wb-${dir}`"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { addListener, removeListener, preventEvent } from '../helper'

// Constants
const EVENT_OPTIONS = { capture: true, passive: true }
const STACK_MIN: any[] = []
const RESIZE_DIRECTIONS = ['n', 's', 'w', 'e', 'nw', 'ne', 'se', 'sw']

let dblclick_timer = 0

// Helper functions
const cancel_fullscreen = () => {
    if (document.fullscreenElement) {
        document.exitFullscreen()
        return true
    }
    return false
}
const move = (x?: number, y?: number, save?: boolean) => {
    console.log('move', { x, y, save })

    if (save) {
        savedPosition.value = {
            x: position.value.x,
            y: position.value.y
        }
    }

    position.value = { x: x || 0, y: y || 0 }
    emit('move', position.value.x, position.value.y)
}

const resize = (w?: number, h?: number, save?: boolean) => {
    console.log('resize', { w, h, save })

    if (save) {
        savedSize.value = {
            width: size.value.width,
            height: size.value.height
        }
    }

    size.value = {
        width: Math.max(w || size.value.width, props.minWidth || 200),
        height: Math.max(h || size.value.height, props.minHeight || 100)
    }
    emit('resize', size.value.width, size.value.height)
}

// Event handlers
const handler_mousemove = (evt: Event) => {
    const e = evt as MouseEvent | TouchEvent
    const { pageX, pageY } = 'touches' in e ? e.touches[0] : e as MouseEvent
    const deltaX = pageX - x
    const deltaY = pageY - y

    if (dir === 'drag') {
        position.value = {
            x: startPosX + deltaX,
            y: startPosY + deltaY
        }
        emit('move', position.value.x, position.value.y)
    } else {
        // Handle resize
        let newWidth = startWidth
        let newHeight = startHeight
        let newX = startPosX
        let newY = startPosY

        if (dir.includes('e')) {
            newWidth = startWidth + deltaX
        }
        if (dir.includes('w')) {
            newWidth = startWidth - deltaX
            newX = startPosX + deltaX
        }
        if (dir.includes('s')) {
            newHeight = startHeight + deltaY
        }
        if (dir.includes('n')) {
            newHeight = startHeight - deltaY
            newY = startPosY + deltaY
        }

        // Apply constraints
        newWidth = Math.max(Math.min(newWidth, props.maxWidth || Infinity), props.minWidth || 200)
        newHeight = Math.max(Math.min(newHeight, props.maxHeight || Infinity), props.minHeight || 100)

        position.value = { x: newX, y: newY }
        size.value = { width: newWidth, height: newHeight }
        emit('resize', newWidth, newHeight)
    }
}

const handler_mouseup = () => {
    document.body.classList.remove('wb-lock')
    removeListener(window, 'mousemove', handler_mousemove)
    removeListener(window, 'mouseup', handler_mouseup)
    removeListener(window, 'touchmove', handler_mousemove)
    removeListener(window, 'touchend', handler_mouseup)
}

// Update emits to include fullscreen
const emit = defineEmits<{
    (e: 'close'): void
    (e: 'focus'): void
    (e: 'blur'): void
    (e: 'minimize'): void
    (e: 'maximize'): void
    (e: 'restore'): void
    (e: 'fullscreen'): void
    (e: 'move', x: number, y: number): void
    (e: 'resize', width: number, height: number): void
}>()

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
    mount?: HTMLElement
    class?: string | string[]
    index?: number
}

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

// State
const windowRef = ref<HTMLElement>()
const id = ref(`winbox-${Math.random().toString(36).substr(2, 9)}`)
const min = ref(false)
const max = ref(false)
const full = ref(false)
const focused = ref(false)
const position = ref({ x: 0, y: 0 })
const size = ref({ width: 0, height: 0 })
const savedPosition = ref({ x: 0, y: 0 })
const savedSize = ref({ width: 0, height: 0 })

// Window management
const root_w = ref(window.innerWidth)
const root_h = ref(window.innerHeight)
let prefix_request: string | null = null
let is_fullscreen: any = null

// Add state variables for drag/resize operations
let dir = ''
let x = 0
let y = 0
let startPosX = 0
let startPosY = 0
let startWidth = 0
let startHeight = 0

// Create a reference to the mousedown handler
const handleResize = () => {
    root_w.value = window.innerWidth
    root_h.value = window.innerHeight
}
const mousedownHandler = (direction: string) => (evt: Event) => {
    const e = evt as MouseEvent | TouchEvent
    preventEvent(e)
    focus()

    if (dir === "drag") {
        if (min.value) {
            restore();
            return;
        }
        if (!props.noMax) {
            const now = Date.now();
            const diff = now - dblclick_timer;
            dblclick_timer = now;
            if (diff < 300) {
                max.value ? restore() : maximize();
                return;
            }
        }
    }

    if (!max.value && !min.value) {
        document.body.classList.add('wb-lock')
        dir = direction

        const { pageX, pageY } = 'touches' in e ? e.touches[0] : e as MouseEvent
        x = pageX
        y = pageY
        startPosX = position.value.x
        startPosY = position.value.y
        startWidth = size.value.width
        startHeight = size.value.height

        addListener(window, 'mousemove', handler_mousemove)
        addListener(window, 'mouseup', handler_mouseup)
        addListener(window, 'touchmove', handler_mousemove)
        addListener(window, 'touchend', handler_mouseup)
    }
}

// Computed styles and classes
const windowStyle = computed(() => ({
    width: `${size.value.width}px`,
    height: `${size.value.height}px`,
    transform: `translate(${position.value.x}px, ${position.value.y}px)`,
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
    const classes = []
    if (props.class) {
        if (typeof props.class === 'string') {
            classes.push(props.class)
        } else {
            classes.push(...props.class)
        }
    }
    if (props.modal) classes.push('modal')
    if (min.value) classes.push('min')
    if (max.value) classes.push('max')
    if (focused.value) classes.push('focus')
    return classes
})

// Window control methods
const minimize = () => {
    if (is_fullscreen) {
        cancel_fullscreen()
    }
    if (max.value) {
        max.value = false
    }
    if (!min.value) {
        STACK_MIN.push(windowRef.value)
        min.value = true
        emit('minimize')
    }
}

const maximize = () => {
    console.log('maximize')
    if (is_fullscreen) {
        cancel_fullscreen()
    }
    if (min.value) {
        // remove_min_stack()
    }
    if (!max.value) {
        max.value = true
        resize(root_w.value, root_h.value, true)
        move(0, 0, true)
        emit('maximize')
    }
}

const restore = () => {
    console.log('restore')
    if (min.value) {
        resize(savedSize.value.width, savedSize.value.height, false)
        move(savedPosition.value.x, savedPosition.value.y, false)
        emit('restore')
    }
    if (max.value) {
        max.value = false
        resize(savedSize.value.width, savedSize.value.height, false)
        move(savedPosition.value.x, savedPosition.value.y, false)
        emit('restore')
    }
}

const fullscreen = () => {
    if (min.value) {
        resize()
        move()
    }
    if (!is_fullscreen && prefix_request && windowRef.value) {
        const requestMethod = prefix_request as keyof HTMLElement
        if (typeof windowRef.value[requestMethod] === 'function') {
            (windowRef.value[requestMethod] as Function).call(windowRef.value)
            is_fullscreen = windowRef.value
            full.value = true
            emit('fullscreen')
        }
    }
}

const close = () => {
    emit('close')
}

// Window movement and resize methods
function addWindowListener(direction: string) {
    const node = windowRef.value?.querySelector(`.wb-${direction}`)
    if (!node) return

    const handler = mousedownHandler(direction)
    addListener(node, 'mousedown', handler, EVENT_OPTIONS)
    addListener(node, 'touchstart', handler, EVENT_OPTIONS)
}

// Lifecycle hooks
onMounted(() => {
    setup()
    register()

    // Initialize position and size
    position.value = {
        x: typeof props.x === 'number' ? props.x : root_w.value / 2 - Number(props.width) / 2,
        y: typeof props.y === 'number' ? props.y : root_h.value / 2 - Number(props.height) / 2
    }

    size.value = {
        width: Number(props.width),
        height: Number(props.height)
    }

    if (props.mount && windowRef.value) {
        props.mount.appendChild(windowRef.value)
    }
})

onBeforeUnmount(() => {
    if (windowRef.value) {
        const node = windowRef.value
        const controls = node.querySelectorAll('.wb-control span')
        controls.forEach(control => {
            removeListener(control, 'click', preventEvent)
        })

        RESIZE_DIRECTIONS.forEach(dir => {
            const handle = node.querySelector(`.wb-${dir}`)
            if (handle) {
                const handler = mousedownHandler(dir)
                removeListener(handle, 'mousedown', handler)
                removeListener(handle, 'touchstart', handler)
            }
        })
    }

    removeListener(window, 'resize', handleResize)
})

// Helper functions
function setup() {
    prefix_request = ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullscreen', 'msRequestFullscreen']
        .find(req => document.documentElement[req as keyof HTMLElement]) || null

    addListener(window, 'resize', handleResize)
}

const register = () => {
    if (!windowRef.value) return

    addWindowListener('drag')
    addWindowListener('n')
    addWindowListener('s')
    addWindowListener('w')
    addWindowListener('e')
    addWindowListener('nw')
    addWindowListener('ne')
    addWindowListener('se')
    addWindowListener('sw')
}
</script>

<style>
@import '../assets/css/winbox.css';
</style>