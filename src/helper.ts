/**
 * Helper functions for DOM manipulation and event handling
 */

/**
 * Add event listener to a DOM node
 */
export function addListener(
  node: Window | Element | null,
  event: string,
  fn: EventListenerOrEventListenerObject,
  opt?: AddEventListenerOptions | boolean
): void {
  node?.addEventListener(event, fn, opt || false);
}

/**
 * Remove event listener from a DOM node
 */
export function removeListener(
  node: Window | Element | null,
  event: string,
  fn: EventListenerOrEventListenerObject,
  opt?: AddEventListenerOptions | boolean
): void {
  node?.removeEventListener(event, fn, opt || false);
}

/**
 * Prevent default event behavior and stop propagation
 */
export function preventEvent(event: Event, prevent?: boolean): void {
  event.stopPropagation();
  prevent && event.preventDefault();
}

/**
 * Get first element by class name within a root element
 */
export function getByClass(root: Element, name: string): Element {
  return root.getElementsByClassName(name)[0];
}

/**
 * Add a class to an element
 */
export function addClass(node: Element, classname: string): void {
  node.classList.add(classname);
}

/**
 * Check if an element has a class
 */
export function hasClass(node: Element, classname: string): boolean {
  return node.classList.contains(classname);
}

/**
 * Remove a class from an element
 */
export function removeClass(node: Element, classname: string): void {
  node.classList.remove(classname);
}

/**
 * Set a style property on an element
 */
export function setStyle(node: Element, style: string, value: string): void {
  const key = `_s_${style}` as keyof Element;

  if (node[key] !== value) {
    (node as HTMLElement).style.setProperty(style, value);
    (node as any)[key] = value;
  }
}

/**
 * Set an attribute on an element
 */
export function setAttribute(node: Element, key: string, value: string): void {
  const attrKey = `_a_${key}` as keyof Element;

  if (node[attrKey] !== value) {
    node.setAttribute(key, value);
    (node as any)[attrKey] = value;
  }
}

/**
 * Remove an attribute from an element
 */
export function removeAttribute(node: Element, key: string): void {
  const attrKey = `_a_${key}` as keyof Element;

  if (node[attrKey] !== null) {
    node.removeAttribute(key);
    (node as any)[attrKey] = null;
  }
}

/**
 * Set text content of an element
 */
export function setText(node: Element, value: string): void {
  const textnode = node.firstChild;
  textnode
    ? ((textnode as Text).nodeValue = value)
    : (node.textContent = value);
}
