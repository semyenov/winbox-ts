import {
  addListener,
  removeListener,
  setStyle,
  setText,
  getByClass,
  addClass,
  removeClass,
  hasClass,
  preventEvent,
} from "./helper";
import template from "./template";

// const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window["MSStream"];

const use_raf = false;
const stack_min: WinBox[] = [];

// use passive for touch and mouse wheel
const eventOptions = { capture: true, passive: true };

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

interface WinBoxOptions {
  id?: string;
  index?: number;
  root?: WinBoxElement;
  template?: HTMLElement;
  title?: string | HTMLElement;
  icon?: string;
  mount?: HTMLElement;
  html?: string;
  url?: string;
  width?: number | string;
  height?: number | string;
  minwidth?: number | string;
  minheight?: number | string;
  maxwidth?: number | string;
  maxheight?: number | string;
  autosize?: boolean;
  overflow?: boolean;
  x?: number | string;
  y?: number | string;
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
  min?: boolean;
  max?: boolean;
  hidden?: boolean;
  modal?: boolean;
  background?: string;
  border?: number;
  header?: number;
  class?: string | string[];
  oncreate?: (params: WinBoxOptions) => void;
  onclose?: (force?: boolean) => boolean;
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
  onload?: (this: WinBox) => void;
}

export default class WinBox {
  dom!: WinBoxElement;
  id!: string;
  body!: HTMLElement;
  header: number = 0;
  min: boolean = false;
  max: boolean = false;
  full: boolean = false;
  hidden: boolean = false;
  focused: boolean = false;
  x: number = 0;
  y: number = 0;
  width: number = 0;
  height: number = 0;
  minwidth: number = 0;
  minheight: number = 0;
  maxwidth: number = 0;
  maxheight: number = 0;
  overflow: boolean = false;
  top: number = 0;
  right: number = 0;
  bottom: number = 0;
  left: number = 0;
  index: number = 0;
  title?: string;
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
    if (!(this instanceof WinBox)) {
      return new WinBox(params as WinBoxOptions, _title);
    }

    body || setup();

    let id: string | undefined;
    let index: number | undefined;
    let root: HTMLElement | undefined;
    let tpl: HTMLElement | undefined;
    let title: string | HTMLElement | undefined;
    let icon: string | undefined;
    let mount: HTMLElement | undefined;
    let html: string | undefined;
    let url: string | undefined;
    let width: number | string | undefined;
    let height: number | string | undefined;
    let minwidth: number | string | undefined;
    let minheight: number | string | undefined;
    let maxwidth: number | string | undefined;
    let maxheight: number | string | undefined;
    let autosize: boolean | undefined;
    let overflow: boolean | undefined;
    let x: number | string | undefined;
    let y: number | string | undefined;
    let top: number | string | undefined;
    let left: number | string | undefined;
    let bottom: number | string | undefined;
    let right: number | string | undefined;
    let min: boolean | undefined;
    let max: boolean | undefined;
    let hidden: boolean | undefined;
    let modal: boolean | undefined;
    let background: string | undefined;
    let border: number | undefined;
    let header: number | undefined;
    let classname: string | string[] | undefined;
    let oncreate: ((params: WinBoxOptions) => void) | undefined;
    let onclose: ((force?: boolean) => boolean) | undefined;
    let onfocus: (() => void) | undefined;
    let onblur: (() => void) | undefined;
    let onmove: ((x: number, y: number) => void) | undefined;
    let onresize: ((w: number, h: number) => void) | undefined;
    let onfullscreen: (() => void) | undefined;
    let onmaximize: (() => void) | undefined;
    let onminimize: (() => void) | undefined;
    let onrestore: (() => void) | undefined;
    let onhide: (() => void) | undefined;
    let onshow: (() => void) | undefined;
    let onload: (() => void) | undefined;

    if (params) {
      if (_title) {
        title = params as string;
        params = _title as WinBoxOptions;
      }

      if (typeof params === "string") {
        title = params;
      } else {
        id = params.id;
        index = params.index;
        root = params.root;
        tpl = params.template;
        title = title || params.title;
        icon = params.icon;
        mount = params.mount;
        html = params.html;
        url = params.url;
        width = params.width;
        height = params.height;
        minwidth = params.minwidth;
        minheight = params.minheight;
        maxwidth = params.maxwidth;
        maxheight = params.maxheight;
        autosize = params.autosize;
        overflow = params.overflow;
        x = params.x || (params.modal ? "center" : 0);
        y = params.y || (params.modal ? "center" : 0);
        top = params.top;
        left = params.left;
        bottom = params.bottom;
        right = params.right;
        min = params.min;
        max = params.max;
        hidden = params.hidden;
        modal = params.modal;
        background = params.background;
        border = params.border;
        header = params.header;
        classname = params.class;
        onclose = params.onclose;
        onfocus = params.onfocus;
        onblur = params.onblur;
        onmove = params.onmove;
        onresize = params.onresize;
        onfullscreen = params.onfullscreen;
        onmaximize = params.onmaximize;
        onminimize = params.onminimize;
        onrestore = params.onrestore;
        onhide = params.onhide;
        onshow = params.onshow;
        onload = params.onload;
      }
    }

    this.dom = template(tpl || undefined);
    this.id = id || `winbox-${++id_counter}`;
    this.dom.className =
      "winbox" +
      (classname
        ? ` ${typeof classname === "string" ? classname : classname.join(" ")}`
        : "") +
      (modal ? " modal" : "");
    this.dom.winbox = this;
    this.body = getByClass(this.dom, "wb-body") as HTMLElement;
    this.header = header || 35;

    if (background) {
      this.setBackground(background);
    }

    if (border) {
      setStyle(this.body, "margin", border + (isNaN(+border) ? "" : "px"));
    } else {
      border = 0;
    }

    if (header) {
      const node = getByClass(this.dom, "wb-header");
      setStyle(node, "height", header + "px");
      setStyle(node, "line-height", header + "px");
      setStyle(this.body, "top", header + "px");
    }

    if (title) {
      this.setTitle(title);
    }

    if (icon) {
      this.setIcon(icon);
    }

    if (mount) {
      this.mount(mount);
    } else if (html) {
      this.body.innerHTML = html;
    } else if (url) {
      this.setUrl(url, onload);
    }

    top = top ? parse(top, root_h) : 0;
    bottom = bottom ? parse(bottom, root_h) : 0;
    left = left ? parse(left, root_w) : 0;
    right = right ? parse(right, root_w) : 0;

    const viewport_w = root_w - left - right;
    const viewport_h = root_h - top - bottom;

    maxwidth = maxwidth ? parse(maxwidth, viewport_w) : viewport_w;
    maxheight = maxheight ? parse(maxheight, viewport_h) : viewport_h;
    minwidth = minwidth ? parse(minwidth, maxwidth) : 150;
    minheight = minheight ? parse(minheight, maxheight) : this.header;

    if (autosize) {
      (root || body).appendChild(this.body);
      width = Math.max(
        Math.min(
          this.body.clientWidth + (isNaN(+border!) ? 0 : +border! * 2) + 1,
          maxwidth
        ),
        minwidth
      );
      height = Math.max(
        Math.min(this.body.clientHeight + this.header + border + 1, maxheight),
        minheight
      );
      this.dom.appendChild(this.body);
    } else {
      width = width
        ? parse(width, maxwidth)
        : Math.max(maxwidth / 2, minwidth) | 0;
      height = height
        ? parse(height, maxheight)
        : Math.max(maxheight / 2, minheight) | 0;
    }

    x = x ? parse(x, viewport_w, width) : left;
    y = y ? parse(y, viewport_h, height) : top;

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.minwidth = minwidth;
    this.minheight = minheight;
    this.maxwidth = maxwidth;
    this.maxheight = maxheight;
    this.overflow = overflow || false;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
    this.index = index || 0;
    this.min = false;
    this.max = false;
    this.full = false;
    this.hidden = false;
    this.focused = false;

    this.onclose = onclose;
    this.onfocus = onfocus;
    this.onblur = onblur;
    this.onmove = onmove;
    this.onresize = onresize;
    this.onfullscreen = onfullscreen;
    this.onmaximize = onmaximize;
    this.onminimize = onminimize;
    this.onrestore = onrestore;
    this.onhide = onhide;
    this.onshow = onshow;

    if (max) {
      this.maximize();
    } else if (min) {
      this.minimize();
    } else {
      this.resize().move();
    }

    if (hidden) {
      this.hide();
    } else {
      this.focus();
      if (index !== undefined) {
        this.index = index;
        setStyle(this.dom, "z-index", index.toString());
        if (index > index_counter) index_counter = index;
      }
    }

    register(this);
    (root || body).appendChild(this.dom);
    oncreate && oncreate(params as WinBoxOptions);
  }

  static new(params: WinBoxOptions | string, title?: any): WinBox {
    return new WinBox(params, title);
  }

  parse(num: number | string, base: number, center?: number): number {
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
    setText(node, (this.title = title as string));
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
      stack_min.push(this);
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
        true
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
          this.body
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
    skip_update?: boolean
  ): this {
    if (!w && w !== 0) {
      w = this.width;
      h = this.height;
    } else if (!skip_update) {
      this.width = w ? this.parse(w, this.maxwidth) : 0;
      this.height = h ? this.parse(h, this.maxheight) : 0;
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
  prefix_exit =
    prefix_request &&
    prefix_request
      .replace("request", "exit")
      .replace("mozRequest", "mozCancel")
      .replace("Request", "Exit");
  addListener(window, "resize", function () {
    update_min_stack();
    init();
  });
  init();
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
    }
  );
  addListener(
    getByClass(self.dom, "wb-max") as HTMLElement,
    "click",
    function (event: Event) {
      preventEvent(event);
      self.max ? self.restore() : self.maximize();
    }
  );
  addListener(
    getByClass(self.dom, "wb-close") as HTMLElement,
    "click",
    function (event: Event) {
      preventEvent(event);
      self.close() || (self = null!);
    }
  );
  if (prefix_request) {
    addListener(
      getByClass(self.dom, "wb-full") as HTMLElement,
      "click",
      function (event: Event) {
        preventEvent(event);
        self.fullscreen().focus();
      }
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
    true
  );
}

function remove_min_stack(self: WinBox) {
  stack_min.splice(stack_min.indexOf(self), 1);
  update_min_stack();
  self.removeClass("min");
  self.min = false;
  self.dom.title = "";
}

function update_min_stack() {
  const length = stack_min.length;
  const splitscreen_index: { [key: string]: number } = {};
  const splitscreen_length: { [key: string]: number } = {};
  for (let i = 0; i < length; i++) {
    const self = stack_min[i];
    const key = self.left + ":" + self.top;
    if (splitscreen_length[key]) {
      splitscreen_length[key]++;
    } else {
      splitscreen_index[key] = 0;
      splitscreen_length[key] = 1;
    }
  }

  for (let i = 0; i < length; i++) {
    const self = stack_min[i];
    const key = self.left + ":" + self.top;
    const width = Math.min(
      (root_w - self.left - self.right) / splitscreen_length[key],
      250
    );
    self
      .resize((width + 1) | 0, self.header, true)
      .move(
        (self.left + splitscreen_index[key] * width) | 0,
        root_h - self.bottom - self.header,
        true
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

  addListener(node, "mousedown", mousedown as EventListener, eventOptions);
  addListener(node, "touchstart", mousedown as EventListener, eventOptions);

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
      use_raf && loop();
      if ("touches" in event && event.touches.length) {
        touch = event.touches[0];
        addListener(
          window,
          "touchmove",
          handler_mousemove as EventListener,
          eventOptions
        );
        addListener(
          window,
          "touchend",
          handler_mouseup as EventListener,
          eventOptions
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
        self.minwidth
      );
      resize_w = self.width !== old_w;
    }

    if (resize_h) {
      self.height = Math.max(
        Math.min(self.height, self.maxheight, root_h - self.y - self.bottom),
        self.minheight
      );
      resize_h = self.height !== old_h;
    }

    if (resize_w || resize_h) {
      use_raf ? (raf_resize = true) : self.resize();
    }

    if (move_x) {
      if (self.max) {
        self.x =
          (pageX < root_w / 3
            ? self.left
            : pageX > (root_w / 3) * 2
            ? root_w - self.width - self.right
            : root_w / 2 - self.width / 2) + offsetX;
      }

      self.x = Math.max(
        Math.min(
          self.x,
          self.overflow ? root_w - 30 : root_w - self.width - self.right
        ),
        self.overflow ? 30 - self.width : self.left
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
            : root_h - self.height - self.bottom
        ),
        self.top
      );
      move_y = self.y !== old_y;
    }

    if (move_x || move_y) {
      if (self.max) {
        self.restore();
      }

      use_raf ? (raf_move = true) : self.move();
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
    use_raf && cancelAnimationFrame(raf_timer!);
    if ("touches" in event && event.touches.length) {
      removeListener(
        window,
        "touchmove",
        handler_mousemove as EventListener,
        eventOptions
      );
      removeListener(
        window,
        "touchend",
        handler_mouseup as EventListener,
        eventOptions
      );
    } else {
      removeListener(window, "mousemove", handler_mousemove as EventListener);
      removeListener(window, "mouseup", handler_mouseup as EventListener);
    }
  }
}

function init() {
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
