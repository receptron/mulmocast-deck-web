<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/deck";
import { setByPath, htmlToMarkup, ACCENT_COLORS, moveByPath, splitItemPath } from "../editorHelpers";
import InlineToolbar from "./InlineToolbar.vue";

const props = defineProps<{
  slide: SlideLayout;
  theme: SlideTheme;
}>();

const emit = defineEmits<{ update: [slide: SlideLayout] }>();

const html = computed(() => {
  try {
    return generateSlideHTML(props.theme, props.slide);
  } catch (e) {
    return `<!doctype html><html><body><pre style="padding:24px;color:#dc2626;font-family:monospace">${String(e)}</pre></body></html>`;
  }
});

const iframeRef = ref<HTMLIFrameElement | null>(null);

// Floating toolbar state. Coordinates are in parent-page (viewport) space.
const toolbar = ref<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
const lastEditableEl = ref<HTMLElement | null>(null);

// FLIP animation snapshot. Filled by snapshotPositions() right before a reorder commit, consumed
// by applyFLIP() on the next iframe load. We match the new DOM's items by `data-mulmo-item-path`
// to their previous bounding rect, apply an inverse translate, then transition back to 0 so the
// user sees a smooth move instead of a snap.
const positionsBefore = new Map<string, { x: number; y: number }>();

const snapshotPositions = () => {
  const doc = iframeRef.value?.contentDocument;
  if (!doc) return;
  positionsBefore.clear();
  doc.querySelectorAll<HTMLElement>("[data-mulmo-item-path]").forEach((el) => {
    const path = el.getAttribute("data-mulmo-item-path");
    if (!path) return;
    const r = el.getBoundingClientRect();
    positionsBefore.set(path, { x: r.left, y: r.top });
  });
};

const applyFLIP = () => {
  if (positionsBefore.size === 0) return;
  const doc = iframeRef.value?.contentDocument;
  if (!doc) {
    positionsBefore.clear();
    return;
  }
  doc.querySelectorAll<HTMLElement>("[data-mulmo-item-path]").forEach((el) => {
    const path = el.getAttribute("data-mulmo-item-path");
    if (!path) return;
    const before = positionsBefore.get(path);
    if (!before) return;
    const r = el.getBoundingClientRect();
    const dx = before.x - r.left;
    const dy = before.y - r.top;
    if (dx === 0 && dy === 0) return;
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    // Force reflow so the inverse position is committed before we transition back.
    // Reading offsetWidth has the side effect of flushing layout; the value is discarded.
    // eslint-disable-next-line sonarjs/void-use
    void el.offsetWidth;
    el.style.transition = "transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    el.style.transform = "";
    // Clear inline styles after the transition so subsequent edits aren't impeded.
    const cleanup = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("transitionend", cleanup);
    };
    el.addEventListener("transitionend", cleanup);
  });
  positionsBefore.clear();
};

const hideToolbar = () => {
  toolbar.value = { x: 0, y: 0, visible: false };
};

/**
 * Read the current selection inside the iframe, translate its bounding rect to parent-viewport
 * coordinates, and position the toolbar above it. Hides if the selection is empty / collapsed.
 */
const reposition = (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const sel = doc.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    hideToolbar();
    return;
  }
  // The selection must be inside a [data-mulmo-path] element for our wrap helpers to make sense.
  const anchor = sel.anchorNode;
  const editable = anchor instanceof Element ? anchor.closest("[data-mulmo-path]") : (anchor?.parentElement?.closest("[data-mulmo-path]") ?? null);
  if (!editable || editable.getAttribute("contenteditable") !== "true") {
    hideToolbar();
    return;
  }
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  const iframeRect = iframe.getBoundingClientRect();
  const TOOLBAR_HEIGHT = 36;
  const x = iframeRect.left + rect.left;
  const y = Math.max(0, iframeRect.top + rect.top - TOOLBAR_HEIGHT - 4);
  toolbar.value = { x, y, visible: true };
};

const commit = (el: HTMLElement) => {
  const path = el.getAttribute("data-mulmo-path");
  if (!path) return;
  // Round-trip the rendered HTML back to deck inline markup so toolbar-applied <strong>/<em>/<span>
  // round-trips through renderInlineMarkup cleanly.
  const text = htmlToMarkup(el.innerHTML).replace(/\r/g, "");
  el.removeAttribute("contenteditable");
  hideToolbar();
  const next = setByPath(props.slide, path, text);
  emit("update", next as SlideLayout);
};

const wireEditing = (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument;
  if (!doc || !doc.body) return;

  if (!doc.getElementById("__mulmo_edit_style")) {
    const style = doc.createElement("style");
    style.id = "__mulmo_edit_style";
    style.textContent = `
      [data-mulmo-path]:hover { outline: 2px solid rgba(56,189,248,.55); outline-offset: 2px; cursor: text; }
      [data-mulmo-path][contenteditable="true"] { outline: 2px solid rgba(56,189,248,.9); outline-offset: 2px; box-shadow: 0 0 0 4px rgba(56,189,248,.15); }
      [data-mulmo-item-path][draggable="true"] { cursor: grab; }
      [data-mulmo-item-path].mulmo-dragging { opacity: 0.4; }
      [data-mulmo-item-path].mulmo-drop-target { outline: 2px dashed rgba(16,185,129,.8); outline-offset: 2px; }
    `;
    doc.head?.appendChild(style);
  }

  // Mark every list-item container draggable so the browser fires native drag events.
  const enableDrag = () => {
    doc.querySelectorAll<HTMLElement>("[data-mulmo-item-path]").forEach((el) => {
      if (!el.hasAttribute("draggable")) el.setAttribute("draggable", "true");
    });
  };
  enableDrag();
  // The deck re-renders on every update — re-mark after each iframe load.
  const observer = new MutationObserver(enableDrag);
  observer.observe(doc.body, { childList: true, subtree: true });

  // ─── drag-and-drop reorder of list items ───
  let dragFromPath: string | null = null;

  doc.body.addEventListener("dragstart", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-item-path]");
    if (!target) return;
    dragFromPath = target.getAttribute("data-mulmo-item-path");
    target.classList.add("mulmo-dragging");
    // The dataTransfer string is mostly cosmetic — we use dragFromPath above.
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragFromPath ?? "");
    }
  });

  doc.body.addEventListener("dragend", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-item-path]");
    target?.classList.remove("mulmo-dragging");
    doc.querySelectorAll(".mulmo-drop-target").forEach((el) => el.classList.remove("mulmo-drop-target"));
    dragFromPath = null;
  });

  doc.body.addEventListener("dragover", (e) => {
    if (!dragFromPath) return;
    const over = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-item-path]");
    if (!over) return;
    const overPath = over.getAttribute("data-mulmo-item-path");
    if (!overPath || overPath === dragFromPath) return;
    // Only allow drop on a sibling — same parent array.
    const from = splitItemPath(dragFromPath);
    const to = splitItemPath(overPath);
    if (!from || !to || from.parent !== to.parent) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    // Clear previous highlight, set this one.
    doc.querySelectorAll(".mulmo-drop-target").forEach((el) => el !== over && el.classList.remove("mulmo-drop-target"));
    over.classList.add("mulmo-drop-target");
  });

  doc.body.addEventListener("drop", (e) => {
    if (!dragFromPath) return;
    const over = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-item-path]");
    if (!over) return;
    const overPath = over.getAttribute("data-mulmo-item-path");
    if (!overPath || overPath === dragFromPath) return;
    e.preventDefault();
    const next = moveByPath(props.slide, dragFromPath, overPath);
    dragFromPath = null;
    doc.querySelectorAll(".mulmo-drop-target").forEach((el) => el.classList.remove("mulmo-drop-target"));
    if (next !== props.slide) {
      // Snapshot positions BEFORE the iframe reloads with the new HTML, so applyFLIP() can
      // compute deltas after the iframe load event fires.
      snapshotPositions();
      emit("update", next as SlideLayout);
    }
  });

  doc.body.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-path]");
    if (!target) {
      hideToolbar();
      return;
    }
    if (target.getAttribute("contenteditable") === "true") return;
    target.setAttribute("contenteditable", "true");
    lastEditableEl.value = target;
    // Don't auto-select-all on enter — leaving the click's natural caret position avoids the
    // "user types a key and nukes all formatting" contenteditable footgun. The element is
    // focused implicitly by the click; we only ensure focus if it didn't take.
    if (doc.activeElement !== target) target.focus();
    reposition(iframe);
  });

  doc.body.addEventListener(
    "blur",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.getAttribute("contenteditable") === "true") commit(target);
    },
    true,
  );

  doc.body.addEventListener("keydown", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-path]");
    if (!target || target.getAttribute("contenteditable") !== "true") return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      target.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      target.removeAttribute("contenteditable");
      hideToolbar();
      target.blur();
    }
  });

  // Selection inside the iframe → reposition the toolbar.
  doc.addEventListener("selectionchange", () => reposition(iframe));
  doc.addEventListener("scroll", () => reposition(iframe), true);
};

const onIframeLoad = () => {
  const iframe = iframeRef.value;
  if (!iframe) return;
  wireEditing(iframe);
  // If a reorder just happened, play the FLIP transition now that the new DOM is in place.
  applyFLIP();
};

// ─── toolbar actions ───
const currentRange = (): { doc: Document; sel: Selection; range: Range } | null => {
  const iframe = iframeRef.value;
  const doc = iframe?.contentDocument;
  const sel = doc?.getSelection();
  if (!doc || !sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  return { doc, sel, range: sel.getRangeAt(0) };
};

const findEditableRoot = (node: Node | null): HTMLElement | null => {
  let cur: Node | null = node;
  while (cur && cur.nodeType === 3) cur = cur.parentNode;
  return (cur as Element | null)?.closest<HTMLElement>("[data-mulmo-path]") ?? null;
};

/**
 * Tidy the editable element after a wrap/unwrap pass:
 *   - drop empty inline elements (`<strong></strong>` etc.)
 *   - collapse nested same-type wrappers (`<strong><strong>x</strong></strong>` → `<strong>x</strong>`)
 *   - merge adjacent same-tag siblings (`<strong>a</strong><strong>b</strong>` → `<strong>ab</strong>`)
 *   - normalize() to merge adjacent text nodes
 */
const cleanupEditable = (root: HTMLElement) => {
  const isInline = (el: Element): boolean => {
    const t = el.tagName.toLowerCase();
    if (t === "strong" || t === "em" || t === "b" || t === "i") return true;
    if (t === "span") return /text-d-[a-z]+/.test(el.getAttribute("class") ?? "");
    return false;
  };
  // Returns true when two inline elements have the same "kind" — same tag + same class signature.
  const sameKind = (a: Element, b: Element): boolean => {
    if (a.tagName !== b.tagName) return false;
    return (a.getAttribute("class") ?? "") === (b.getAttribute("class") ?? "");
  };
  const unwrap = (el: Element) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
  };

  // Drop empty inline elements. Walk a static snapshot so we can remove during iteration.
  Array.from(root.querySelectorAll("strong, em, b, i, span")).forEach((el) => {
    if (!isInline(el)) return;
    if (el.textContent === "") el.remove();
  });

  // Collapse nested same-kind wrappers (parent first).
  for (;;) {
    const nested = Array.from(root.querySelectorAll("strong, em, b, i, span")).find(
      (el) => isInline(el) && el.parentElement && isInline(el.parentElement) && sameKind(el, el.parentElement),
    );
    if (!nested) break;
    unwrap(nested);
  }

  // Merge adjacent same-tag siblings.
  for (;;) {
    let merged = false;
    Array.from(root.querySelectorAll("strong, em, b, i, span")).forEach((el) => {
      if (!isInline(el)) return;
      const next = el.nextSibling;
      if (next && next.nodeType === 1 && sameKind(el, next as Element)) {
        while ((next as Element).firstChild) el.appendChild((next as Element).firstChild!);
        (next as Element).remove();
        merged = true;
      }
    });
    if (!merged) break;
  }

  root.normalize();
};

/**
 * Returns the nearest ancestor of the given node that matches the wrapper kind
 * (same tagName + same class), within the editable root. Used to detect existing
 * wrap → toggle off.
 */
const ancestorWrapper = (node: Node | null, tagName: string, className: string | undefined, root: HTMLElement): HTMLElement | null => {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === 1) {
      const el = cur as HTMLElement;
      if (el.tagName.toLowerCase() === tagName.toLowerCase() && (el.getAttribute("class") ?? "") === (className ?? "")) {
        return el;
      }
    }
    cur = cur.parentNode;
  }
  return null;
};

const reselectText = (doc: Document, sel: Selection, root: HTMLElement, text: string) => {
  if (!text) return;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const idx = (n.nodeValue ?? "").indexOf(text);
    if (idx >= 0) {
      const r = doc.createRange();
      r.setStart(n, idx);
      r.setEnd(n, idx + text.length);
      sel.removeAllRanges();
      sel.addRange(r);
      return;
    }
  }
};

const unwrapElement = (target: HTMLElement) => {
  const parent = target.parentNode;
  if (!parent) return;
  while (target.firstChild) parent.insertBefore(target.firstChild, target);
  parent.removeChild(target);
};

const applyWrap = (doc: Document, range: Range, tagName: string, className: string | undefined): HTMLElement => {
  try {
    const wrapper = doc.createElement(tagName);
    if (className) wrapper.setAttribute("class", className);
    range.surroundContents(wrapper);
    return wrapper;
  } catch {
    // Range crosses element boundaries — extract + insert.
    const frag = range.extractContents();
    const wrapper = doc.createElement(tagName);
    if (className) wrapper.setAttribute("class", className);
    wrapper.appendChild(frag);
    range.insertNode(wrapper);
    return wrapper;
  }
};

const selectInside = (doc: Document, sel: Selection, wrapper: HTMLElement) => {
  sel.removeAllRanges();
  const r = doc.createRange();
  r.selectNodeContents(wrapper);
  sel.addRange(r);
};

const wrap = (tagName: string, className?: string) => {
  const ctx = currentRange();
  if (!ctx || !ctx.range.toString().trim()) return;
  const root = findEditableRoot(ctx.range.commonAncestorContainer);
  if (!root) return;

  // Toggle: selection fully inside an existing same-kind wrapper → unwrap and re-select.
  const start = ancestorWrapper(ctx.range.startContainer, tagName, className, root);
  const end = ancestorWrapper(ctx.range.endContainer, tagName, className, root);
  if (start && start === end) {
    const inner = start.textContent ?? "";
    unwrapElement(start);
    cleanupEditable(root);
    reselectText(ctx.doc, ctx.sel, root, inner);
    reposition(iframeRef.value as HTMLIFrameElement);
    return;
  }

  const wrapper = applyWrap(ctx.doc, ctx.range, tagName, className);
  cleanupEditable(root);
  selectInside(ctx.doc, ctx.sel, wrapper);
  reposition(iframeRef.value as HTMLIFrameElement);
};

const onBold = () => wrap("strong");
const onEmphasis = () => wrap("em", "text-d-warning not-italic font-bold");
const onColor = (color: (typeof ACCENT_COLORS)[number]) => wrap("span", `text-d-${color}`);
const onClearFormat = () => {
  const ctx = currentRange();
  if (!ctx) return;
  const text = ctx.range.toString();
  if (!text) return;
  ctx.range.deleteContents();
  ctx.range.insertNode(ctx.doc.createTextNode(text));
  const root = findEditableRoot(ctx.range.commonAncestorContainer);
  if (root) cleanupEditable(root);
  reposition(iframeRef.value as HTMLIFrameElement);
};

onBeforeUnmount(() => hideToolbar());
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold tracking-wide text-stone-700">
        Live preview <span class="text-[10px] font-normal text-stone-400">— click text to edit, select for toolbar</span>
      </h2>
      <span class="text-xs text-stone-400">{{ slide.layout }}</span>
    </div>
    <div class="relative flex-1 overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
      <iframe
        ref="iframeRef"
        :srcdoc="html"
        class="absolute inset-0 h-full w-full"
        sandbox="allow-scripts allow-same-origin"
        title="slide preview"
        @load="onIframeLoad"
      />
    </div>
    <InlineToolbar :x="toolbar.x" :y="toolbar.y" :visible="toolbar.visible" @bold="onBold" @emphasis="onEmphasis" @color="onColor" @clear="onClearFormat" />
  </div>
</template>
