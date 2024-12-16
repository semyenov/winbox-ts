import {
  addClass,
  addListener,
  getByClass,
  hasClass,
  preventEvent,
  removeClass,
  removeListener,
  setStyle,
  setText,
} from "./helper";
import template from "./template";

// const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window["MSStream"];

// use passive for touch and mouse wheel
const EVENT_OPTIONS = { capture: true, passive: true };
// use RequestAnimationFrame for move and resize
const USE_RAF = false;
// stack of minimized winboxes
const STACK_MIN: WinBox[] = [];

let body: HTMLElement;
let id_counter = 0;
let index_counter = 10;
let is_fullscreen: WinBox | null = null;
let last_focus: WinBox | null = null;
let prefix_request: string | null = null;
let prefix_exit: string | null = null;
let root_w = 0;
let root_h = 0;

interface WinBoxElement extends HTMLElement {
  _backstore?: HTMLElement;
  winbox?: WinBox | null;
}

type WinBoxOptions = Partial<{
  id: string;
  index: number;
  root: WinBoxElement;
  template: HTMLElement;
  title: string | HTMLElement;
  icon: string;
  mount: HTMLElement;
  html: string;
  url: string;
  width: number | string;
  height: number | string;
  minwidth: number | string;
  minheight: number | string;
  maxwidth: number | string;
  maxheight: number | string;
  autosize: boolean;
  overflow: boolean;
  x: number | string;
  y: number | string;
  top: number | string;
  left: number | string;
  bottom: number | string;
  right: number | string;
  min: boolean;
  max: boolean;
  hidden: boolean;
  modal: boolean;
  background: string;
  border: number;
  header: number;
  class: string | string[];
  oncreate: (params: WinBoxOptions) => void;
  onclose: (force?: boolean) => boolean;
  onfocus: (this: WinBox) => void;
  onblur: (this: WinBox) => void;
  onmove: (this: WinBox, x: number, y: number) => void;
  onresize: (this: WinBox, w: number, h: number) => void;
  onfullscreen: (this: WinBox) => void;
  onmaximize: (this: WinBox) => void;
  onminimize: (this: WinBox) => void;
  onrestore: (this: WinBox) => void;
  onhide: (this: WinBox) => void;
  onshow: (this: WinBox) => void;
  onload: (this: WinBox) => void;
}>;

export default class WinBox {
  id!: string;
  title!: string;

  dom!: WinBoxElement;
  body!: HTMLElement;

  min: boolean = false;
  max: boolean = false;
  full: boolean = false;
  hidden: boolean = false;
  focused: boolean = false;
  overflow: boolean = false;

  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  minwidth: number = 0;
  minheight: number = 0;
  maxwidth: number = 0;
  maxheight: number = 0;
  header: number = 0;
  top: number = 0;
  right: number = 0;
  bottom: number = 0;
  left: number = 0;
  index: number = 0;

  onclose?: (this: WinBox, force?: boolean) => boolean;
  onfocus?: (this: WinBox) => void;
  onblur?: (this: WinBox) => void;
  onmove?: (this: WinBox, x: number, y: number) => void;
  onresize?: (this: WinBox, w: number, h: number) => void;
  onfullscreen?: (this: WinBox) => void;
  onmaximize?: (this: WinBox) => void;
  onminimize?: (this: WinBox) => void;
  onrestore?: (this: WinBox) => void;
  onhide?: (this: WinBox) => void;
  onshow?: (this: WinBox) => void;

  constructor(params?: WinBoxOptions | string, _title?: any) {
    if (params === undefined || typeof params === "string") {
      params = {
        title: params,
        ...(_title as WinBoxOptions),
      };
    }

    if (!(this instanceof WinBox)) {
      return new WinBox(params, _title);
    }

    body || setup();
    this.id = params.id || `winbox-${++id_counter}`;

    this.dom = template(params.template);
    this.dom.id = this.id;
    this.dom.className = "winbox" +
      (params.class
        ? ` ${
          typeof params.class === "string"
            ? params.class
            : params.class.join(" ")
        }`
        : "") +
      (params.modal ? " modal" : "");
    this.dom.winbox = this;
    this.body = getByClass(this.dom, "wb-body") as HTMLElement;
    this.header = params.header || 35;

    if (params.background) {
      this.setBackground(params.background);
    }

    if (params.border) {
      setStyle(
        this.body,
        "margin",
        params.border + (isNaN(+params.border) ? "" : "px"),
      );
    } else {
      params.border = 0;
    }

    if (params.header) {
      const node = getByClass(this.dom, "wb-header");
      setStyle(node, "height", params.header + "px");
      setStyle(node, "line-height", params.header + "px");
      setStyle(this.body, "top", params.header + "px");
    }

    if (params.title) {
      this.setTitle(params.title);
    }

    if (params.icon) {
      this.setIcon(params.icon);
    }

    if (params.mount) {
      this.mount(params.mount);
    } else if (params.html) {
      this.body.innerHTML = params.html;
    } else if (params.url) {
      this.setUrl(params.url, params.onload);
    }

    this.top = params.top ? parse(params.top, root_h) : 0;
    this.bottom = params.bottom ? parse(params.bottom, root_h) : 0;
    this.left = params.left ? parse(params.left, root_w) : 0;
    this.right = params.right ? parse(params.right, root_w) : 0;

    const viewport_w = root_w - this.left - this.right;
    const viewport_h = root_h - this.top - this.bottom;

    this.maxwidth = params.maxwidth
      ? parse(params.maxwidth, viewport_w)
      : viewport_w;
    this.maxheight = params.maxheight
      ? parse(params.maxheight, viewport_h)
      : viewport_h;
    this.minwidth = params.minwidth
      ? parse(params.minwidth, this.maxwidth)
      : 150;
    this.minheight = params.minheight
      ? parse(params.minheight, this.maxheight)
      : this.header;

    if (params.autosize) {
      (params.root || body).appendChild(this.body);
      this.width = Math.max(
        Math.min(
          this.body.clientWidth +
            (isNaN(+params.border!) ? 0 : +params.border! * 2) + 1,
          this.maxwidth,
        ),
        this.minwidth,
      );
      this.height = Math.max(
        Math.min(
          this.body.clientHeight + this.header + params.border! + 1,
          this.maxheight,
        ),
        this.minheight,
      );
      this.dom.appendChild(this.body);
    } else {
      this.width = params.width
        ? parse(params.width, this.maxwidth)
        : Math.max(this.maxwidth / 2, this.minwidth) | 0;
      this.height = params.height
        ? parse(params.height, this.maxheight)
        : Math.max(this.maxheight / 2, this.minheight) | 0;
    }

    this.x = parse(
      params.modal ? "center" : params.x ?? this.left,
      viewport_w,
      this.width,
    );

    this.y = parse(
      params.modal ? "center" : params.y ?? this.top,
      viewport_h,
      this.height,
    );

    this.overflow = params.overflow || false;
    this.min = false;
    this.max = false;
    this.full = false;
    this.hidden = false;
    this.focused = false;

    this.onclose = params.onclose;
    this.onfocus = params.onfocus;
    this.onblur = params.onblur;
    this.onmove = params.onmove;
    this.onresize = params.onresize;
    this.onfullscreen = params.onfullscreen;
    this.onmaximize = params.onmaximize;
    this.onminimize = params.onminimize;
    this.onrestore = params.onrestore;
    this.onhide = params.onhide;
    this.onshow = params.onshow;

    if (params.max) {
      this.maximize();
    } else if (params.min) {
      this.minimize();
    } else {
      this.resize().move();
    }

    if (params.hidden) {
      this.hide();
    } else {
      this.focus();
      if (params.index !== undefined) {
        this.index = params.index;
        setStyle(this.dom, "z-index", params.index.toString());
        if (params.index > index_counter) index_counter = params.index;
      }
    }

    register(this);
    (params.root || body).appendChild(this.dom);
    params.oncreate && params.oncreate(params as WinBoxOptions);
  }

  static new(params: WinBoxOptions): WinBox {
    return new WinBox(params);
  }

  mount(src: WinBoxElement): this {
    src._backstore || (src._backstore = src.parentNode as HTMLElement);
    this.body.textContent = "";
    this.body.appendChild(src);
    return this;
  }

  unmount(dest?: WinBoxElement): this {
    const node = this.body.firstChild as WinBoxElement;
    if (node) {
      const root = dest || node._backstore;
      root && root.appendChild(node);
      node._backstore = dest;
    }
    return this;
  }

  setTitle(title: string | HTMLElement): this {
    const node = getByClass(this.dom, "wb-title") as HTMLElement;
    setText(node, this.title = title as string);
    return this;
  }

  setIcon(src: string): this {
    const img = getByClass(this.dom, "wb-icon") as HTMLElement;
    setStyle(img, "background-image", `url(${src})`);
    setStyle(img, "display", "inline-block");
    return this;
  }

  setBackground(background: string): this {
    setStyle(this.dom, "background", background);
    return this;
  }

  setUrl(url: string, onload?: () => void): this {
    const node = this.body.firstChild as HTMLIFrameElement;
    if (node && node.tagName.toLowerCase() === "iframe") {
      node.src = url;
    } else {
      this.body.innerHTML = `<iframe src="${url}"></iframe>`;
      if (onload && this.body.firstChild) {
        (this.body.firstChild as HTMLIFrameElement).onload = onload;
      }
    }
    return this;
  }

  focus(state?: boolean): this {
    if (state === false) {
      return this.blur();
    }
    if (last_focus !== this && this.dom) {
      last_focus && last_focus.blur();
      setStyle(this.dom, "z-index", (++index_counter).toString());
      this.index = index_counter;
      addClass(this.dom, "focus");
      last_focus = this;
      this.focused = true;
      this.onfocus && this.onfocus();
    }
    return this;
  }

  blur(state?: boolean): this {
    if (state === false) {
      return this.focus();
    }
    if (last_focus === this) {
      removeClass(this.dom, "focus");
      this.focused = false;
      this.onblur && this.onblur();
      last_focus = null;
    }
    return this;
  }

  hide(state?: boolean): this {
    if (state === false) {
      return this.show();
    }
    if (!this.hidden) {
      this.onhide && this.onhide();
      this.hidden = true;
      addClass(this.dom, "hide");
    }
    return this;
  }

  show(state?: boolean): this {
    if (state === false) {
      return this.hide();
    }
    if (this.hidden) {
      this.onshow && this.onshow();
      this.hidden = false;
      removeClass(this.dom, "hide");
    }
    return this;
  }

  minimize(state?: boolean): this {
    if (state === false) {
      return this.restore();
    }
    if (is_fullscreen) {
      cancel_fullscreen();
    }
    if (this.max) {
      removeClass(this.dom, "max");
      this.max = false;
    }
    if (!this.min) {
      STACK_MIN.push(this);
      update_min_stack();
      this.dom.title = this.title || "";
      addClass(this.dom, "min");
      this.min = true;
      this.onminimize && this.onminimize();
    }
    return this;
  }

  restore(): this {
    if (is_fullscreen) {
      cancel_fullscreen();
    }
    if (this.min) {
      remove_min_stack(this);
      this.resize().move();
      this.onrestore && this.onrestore();
    }
    if (this.max) {
      removeClass(this.dom, "max");
      this.max = false;
      this.resize().move();
      this.onrestore && this.onrestore();
    }
    return this;
  }

  maximize(state?: boolean): this {
    if (state === false) {
      return this.restore();
    }
    if (is_fullscreen) {
      cancel_fullscreen();
    }
    if (this.min) {
      remove_min_stack(this);
    }
    if (!this.max) {
      addClass(this.dom, "max");
      this.resize(
        root_w - this.left - this.right,
        root_h - this.top - this.bottom,
        true,
      ).move(this.left, this.top, true);
      this.max = true;
      this.onmaximize && this.onmaximize();
    }
    return this;
  }

  fullscreen(state?: boolean): this {
    if (this.min) {
      remove_min_stack(this);
      this.resize().move();
    }
    if (!is_fullscreen || !cancel_fullscreen()) {
      if (
        prefix_request &&
        this.body[prefix_request as keyof HTMLElement] instanceof Function
      ) {
        (this.body[prefix_request as keyof HTMLElement] as Function).call(
          this.body,
        );
        is_fullscreen = this;
        this.full = true;
        this.onfullscreen && this.onfullscreen();
      }
    } else if (state === false) {
      return this.restore();
    }
    return this;
  }

  close(force?: boolean): boolean {
    if (this.onclose && this.onclose(force)) {
      return true;
    }
    if (this.min) {
      remove_min_stack(this);
    }
    this.unmount();
    this.dom.remove();
    this.dom.textContent = "";
    this.dom.winbox = null;
    this.body = null!;
    this.dom = null!;
    if (last_focus === this) {
      last_focus = null;
    }
    return false;
  }

  move(x?: number | string, y?: number | string, skip_update?: boolean): this {
    if (!x && x !== 0) {
      x = this.x;
      y = this.y;
    } else if (!skip_update) {
      x = x ? parse(x, root_w - this.left - this.right, this.width) : this.left;
      y = y ? parse(y, root_h - this.top - this.bottom, this.height) : this.top;
      this.x = x;
      this.y = y;
    }
    setStyle(this.dom, "left", x + "px");
    setStyle(this.dom, "top", y + "px");
    this.onmove && this.onmove(this.x, this.y);
    return this;
  }

  resize(
    w?: number | string,
    h?: number | string,
    skip_update?: boolean,
  ): this {
    if (!w && w !== 0) {
      w = this.width;
      h = this.height;
    } else if (!skip_update) {
      this.width = w ? parse(w, this.maxwidth) : 0;
      this.height = h ? parse(h, this.maxheight) : 0;
      w = Math.max(this.width, this.minwidth);
      h = Math.max(this.height, this.minheight);
    }
    setStyle(this.dom, "width", w + "px");
    setStyle(this.dom, "height", h + "px");
    this.onresize && this.onresize(this.width, this.height);
    return this;
  }

  addControl(control: {
    class?: string;
    image?: string;
    click?: (event: Event, self: WinBox) => void;
    index?: number;
  }): this {
    const classname = control.class;
    const image = control.image;
    const click = control.click;
    const index = control.index;
    const node = document.createElement("span");
    const icons = getByClass(this.dom, "wb-control") as HTMLElement;
    if (classname) node.className = classname;
    if (image) setStyle(node, "background-image", `url(${image})`);
    if (click) node.onclick = (event) => click!(event, this);
    icons.insertBefore(node, icons.childNodes[index || 0]);
    return this;
  }

  removeControl(control: string): this {
    const controlElement = getByClass(this.dom, control) as HTMLElement;
    controlElement && controlElement.remove();
    return this;
  }

  addClass(classname: string): this {
    addClass(this.dom, classname);
    return this;
  }

  removeClass(classname: string): this {
    removeClass(this.dom, classname);
    return this;
  }

  hasClass(classname: string): boolean {
    return hasClass(this.dom, classname);
  }

  toggleClass(classname: string): this {
    hasClass(this.dom, classname)
      ? removeClass(this.dom, classname)
      : addClass(this.dom, classname);
    return this;
  }
}

function setup() {
  body = document.body;
  body[(prefix_request = "requestFullscreen") as keyof HTMLElement] ||
    body[(prefix_request = "msRequestFullscreen") as keyof HTMLElement] ||
    body[(prefix_request = "webkitRequestFullscreen") as keyof HTMLElement] ||
    body[(prefix_request = "mozRequestFullscreen") as keyof HTMLElement] ||
    (prefix_request = null);
  prefix_exit = prefix_request &&
    prefix_request
      .replace("request", "exit")
      .replace("mozRequest", "mozCancel")
      .replace("Request", "Exit");
  addListener(window, "resize", function () {
    update_root();
    update_min_stack();
  });
  update_root();
}

function parse(num: number | string, base: number, center?: number): number {
  if (typeof num === "string") {
    if (num === "center") {
      num = ((base - center!) / 2) | 0;
    } else if (num === "right" || num === "bottom") {
      num = base - center!;
    } else {
      const value = parseFloat(num);
      const unit = "" + value !== num && num.substring(("" + value).length);
      if (unit === "%") {
        num = ((base / 100) * value) | 0;
      } else {
        num = value;
      }
    }
  }
  return num as number;
}

function register(self: WinBox) {
  addWindowListener(self, "drag");
  addWindowListener(self, "n");
  addWindowListener(self, "s");
  addWindowListener(self, "w");
  addWindowListener(self, "e");
  addWindowListener(self, "nw");
  addWindowListener(self, "ne");
  addWindowListener(self, "se");
  addWindowListener(self, "sw");
  addListener(
    getByClass(self.dom, "wb-min") as HTMLElement,
    "click",
    function (event: Event) {
      preventEvent(event);
      self.min ? self.restore().focus() : self.minimize();
    },
  );
  addListener(
    getByClass(self.dom, "wb-max") as HTMLElement,
    "click",
    function (event: Event) {
      preventEvent(event);
      self.max ? self.restore() : self.maximize();
    },
  );
  addListener(
    getByClass(self.dom, "wb-close") as HTMLElement,
    "click",
    function (event: Event) {
      preventEvent(event);
      self.close() || (self = null!);
    },
  );
  if (prefix_request) {
    addListener(
      getByClass(self.dom, "wb-full") as HTMLElement,
      "click",
      function (event: Event) {
        preventEvent(event);
        self.fullscreen().focus();
      },
    );
  } else {
    self.addClass("no-full");
  }
  addListener(
    self.dom,
    "click",
    function (_event: Event) {
      // stop propagation would disable global listeners used inside window contents
      // use event bubbling for this listener to skip this handler by the other click listeners
      self.focus();
    },
    true,
  );
}

function remove_min_stack(self: WinBox) {
  STACK_MIN.splice(STACK_MIN.indexOf(self), 1);
  update_min_stack();
  self.removeClass("min");
  self.min = false;
  self.dom.title = "";
}

function update_min_stack() {
  const length = STACK_MIN.length;
  const splitscreen_index: { [key: string]: number } = {};
  const splitscreen_length: { [key: string]: number } = {};
  for (let i = 0; i < length; i++) {
    const self = STACK_MIN[i];
    const key = self.left + ":" + self.top;
    if (splitscreen_length[key]) {
      splitscreen_length[key]++;
    } else {
      splitscreen_index[key] = 0;
      splitscreen_length[key] = 1;
    }
  }

  for (let i = 0; i < length; i++) {
    const self = STACK_MIN[i];
    const key = self.left + ":" + self.top;
    const width = Math.min(
      (root_w - self.left - self.right) / splitscreen_length[key],
      250,
    );
    self
      .resize((width + 1) | 0, self.header, true)
      .move(
        (self.left + splitscreen_index[key] * width) | 0,
        root_h - self.bottom - self.header,
        true,
      );
    splitscreen_index[key]++;
  }
}

function addWindowListener(self: WinBox, dir: string) {
  const node = getByClass(self.dom, `wb-${dir}`) as HTMLElement;
  if (!node) return;

  let touch: MouseEvent | Touch | null = null;
  let x = 0;
  let y = 0;
  let raf_timer: number | null = null;
  let raf_move = false;
  let raf_resize = false;
  let dblclick_timer = 0;

  addListener(node, "mousedown", mousedown as EventListener, EVENT_OPTIONS);
  addListener(node, "touchstart", mousedown as EventListener, EVENT_OPTIONS);

  function loop() {
    raf_timer = requestAnimationFrame(loop);

    if (raf_resize) {
      self.resize();
      raf_resize = false;
    }
    if (raf_move) {
      self.move();
      raf_move = false;
    }
  }

  function mousedown(event: MouseEvent | TouchEvent) {
    preventEvent(event);
    self.focus();

    if (dir === "drag") {
      if (self.min) {
        self.restore();
        return;
      }
      if (!self.hasClass("no-max")) {
        const now = Date.now();
        const diff = now - dblclick_timer;
        dblclick_timer = now;
        if (diff < 300) {
          self.max ? self.restore() : self.maximize();
          return;
        }
      }
    }
    if (/* !self.max && */ !self.min) {
      addClass(body, "wb-lock");
      USE_RAF && loop();
      if ("touches" in event && event.touches.length) {
        touch = event.touches[0];
        addListener(
          window,
          "touchmove",
          handler_mousemove as EventListener,
          EVENT_OPTIONS,
        );
        addListener(
          window,
          "touchend",
          handler_mouseup as EventListener,
          EVENT_OPTIONS,
        );
      } else {
        touch = event as MouseEvent;
        addListener(window, "mousemove", handler_mousemove as EventListener);
        addListener(window, "mouseup", handler_mouseup as EventListener);
      }
      x = touch.pageX;
      y = touch.pageY;
    }
  }

  function handler_mousemove(event: MouseEvent | TouchEvent) {
    preventEvent(event);
    if ("touches" in event && event.touches.length) {
      touch = event.touches[0];
    } else {
      touch = event as MouseEvent;
    }

    const pageX = touch.pageX;
    const pageY = touch.pageY;
    const offsetX = pageX - x;
    const offsetY = pageY - y;

    const old_w = self.width;
    const old_h = self.height;
    const old_x = self.x;
    const old_y = self.y;

    let resize_w, resize_h, move_x, move_y;

    if (dir === "drag") {
      if (self.hasClass("no-move")) return;

      self.x += offsetX;
      self.y += offsetY;
      move_x = move_y = 1;
    } else {
      if (dir === "e" || dir === "se" || dir === "ne") {
        self.width += offsetX;
        resize_w = 1;
      } else if (dir === "w" || dir === "sw" || dir === "nw") {
        self.x += offsetX;
        self.width -= offsetX;
        resize_w = 1;
        move_x = 1;
      }

      if (dir === "s" || dir === "se" || dir === "sw") {
        self.height += offsetY;
        resize_h = 1;
      } else if (dir === "n" || dir === "ne" || dir === "nw") {
        self.y += offsetY;
        self.height -= offsetY;
        resize_h = 1;
        move_y = 1;
      }
    }

    if (resize_w) {
      self.width = Math.max(
        Math.min(self.width, self.maxwidth, root_w - self.x - self.right),
        self.minwidth,
      );
      resize_w = self.width !== old_w;
    }

    if (resize_h) {
      self.height = Math.max(
        Math.min(self.height, self.maxheight, root_h - self.y - self.bottom),
        self.minheight,
      );
      resize_h = self.height !== old_h;
    }

    if (resize_w || resize_h) {
      USE_RAF ? (raf_resize = true) : self.resize();
    }

    if (move_x) {
      if (self.max) {
        self.x = (pageX < root_w / 3
          ? self.left
          : pageX > (root_w / 3) * 2
          ? root_w - self.width - self.right
          : root_w / 2 - self.width / 2) + offsetX;
      }

      self.x = Math.max(
        Math.min(
          self.x,
          self.overflow ? root_w - 30 : root_w - self.width - self.right,
        ),
        self.overflow ? 30 - self.width : self.left,
      );
      move_x = self.x !== old_x;
    }

    if (move_y) {
      if (self.max) {
        self.y = self.top + offsetY;
      }

      self.y = Math.max(
        Math.min(
          self.y,
          self.overflow
            ? root_h - self.header
            : root_h - self.height - self.bottom,
        ),
        self.top,
      );
      move_y = self.y !== old_y;
    }

    if (move_x || move_y) {
      if (self.max) {
        self.restore();
      }

      USE_RAF ? (raf_move = true) : self.move();
    }

    if (resize_w || move_x) {
      x = pageX;
    }

    if (resize_h || move_y) {
      y = pageY;
    }
  }

  function handler_mouseup(event: MouseEvent | TouchEvent) {
    preventEvent(event);
    removeClass(body, "wb-lock");
    USE_RAF && cancelAnimationFrame(raf_timer!);
    if ("touches" in event && event.touches.length) {
      removeListener(
        window,
        "touchmove",
        handler_mousemove as EventListener,
        EVENT_OPTIONS,
      );
      removeListener(
        window,
        "touchend",
        handler_mouseup as EventListener,
        EVENT_OPTIONS,
      );
    } else {
      removeListener(window, "mousemove", handler_mousemove as EventListener);
      removeListener(window, "mouseup", handler_mouseup as EventListener);
    }
  }
}

function update_root() {
  const doc = document.documentElement;
  root_w = doc.clientWidth;
  root_h = doc.clientHeight;
}

function has_fullscreen() {
  return (
    document["fullscreen" as keyof Document] ||
    document["fullscreenElement" as keyof Document] ||
    document["webkitFullscreenElement" as keyof Document] ||
    document["mozFullScreenElement" as keyof Document]
  );
}

function cancel_fullscreen() {
  if (has_fullscreen()) {
    (document[prefix_exit! as keyof Document] as () => void)();
    return true;
  }
  return false;
}
