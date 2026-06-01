<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from "vue";
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/deck";
import { setByPath, htmlToMarkup, ACCENT_COLORS } from "../editorHelpers";
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
    `;
    doc.head?.appendChild(style);
  }

  doc.body.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-path]");
    if (!target) {
      hideToolbar();
      return;
    }
    e.preventDefault();
    if (target.getAttribute("contenteditable") === "true") return;
    target.setAttribute("contenteditable", "true");
    target.focus();
    lastEditableEl.value = target;
    const sel = doc.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const range = doc.createRange();
      range.selectNodeContents(target);
      sel.addRange(range);
    }
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
};

// ─── toolbar actions ───
const currentRange = (): { doc: Document; sel: Selection; range: Range } | null => {
  const iframe = iframeRef.value;
  const doc = iframe?.contentDocument;
  const sel = doc?.getSelection();
  if (!doc || !sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  return { doc, sel, range: sel.getRangeAt(0) };
};

const wrap = (tagName: string, className?: string) => {
  const ctx = currentRange();
  if (!ctx) return;
  try {
    const wrapper = ctx.doc.createElement(tagName);
    if (className) wrapper.setAttribute("class", className);
    ctx.range.surroundContents(wrapper);
    // Move selection inside the wrapper so subsequent buttons compose.
    ctx.sel.removeAllRanges();
    const r = ctx.doc.createRange();
    r.selectNodeContents(wrapper);
    ctx.sel.addRange(r);
  } catch {
    // surroundContents throws when the range crosses element boundaries (e.g. partially-selected
    // <strong>). Fall back to extract + wrap.
    const frag = ctx.range.extractContents();
    const wrapper = ctx.doc.createElement(tagName);
    if (className) wrapper.setAttribute("class", className);
    wrapper.appendChild(frag);
    ctx.range.insertNode(wrapper);
  }
  reposition(iframeRef.value as HTMLIFrameElement);
};

const onBold = () => wrap("strong");
const onEmphasis = () => wrap("em", "text-d-warning not-italic font-bold");
const onColor = (color: (typeof ACCENT_COLORS)[number]) => wrap("span", `text-d-${color}`);
const onClearFormat = () => {
  const ctx = currentRange();
  if (!ctx) return;
  const text = ctx.range.toString();
  ctx.range.deleteContents();
  ctx.range.insertNode(ctx.doc.createTextNode(text));
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
