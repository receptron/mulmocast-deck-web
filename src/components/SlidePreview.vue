<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/deck";
import { setByPath } from "../editorHelpers";

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

// Reverse-walk the rendered HTML for the data-mulmo-path the user clicked, then write the new
// text back to the slide JSON. Edits happen on blur / Enter — re-rendering on each keystroke
// would reset the cursor.
const wireEditing = (iframe: HTMLIFrameElement) => {
  const doc = iframe.contentDocument;
  if (!doc || !doc.body) return;

  // Hover outline + edit cursor on any editable target.
  if (!doc.getElementById("__mulmo_edit_style")) {
    const style = doc.createElement("style");
    style.id = "__mulmo_edit_style";
    style.textContent = `
      [data-mulmo-path]:hover { outline: 2px solid rgba(56,189,248,.55); outline-offset: 2px; cursor: text; }
      [data-mulmo-path][contenteditable="true"] { outline: 2px solid rgba(56,189,248,.9); outline-offset: 2px; box-shadow: 0 0 0 4px rgba(56,189,248,.15); }
    `;
    doc.head?.appendChild(style);
  }

  const commit = (el: HTMLElement) => {
    const path = el.getAttribute("data-mulmo-path");
    if (!path) return;
    const text = el.innerText.replace(/\r/g, "");
    el.removeAttribute("contenteditable");
    const next = setByPath(props.slide, path, text);
    emit("update", next as SlideLayout);
  };

  doc.body.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-path]");
    if (!target) return;
    e.preventDefault();
    if (target.getAttribute("contenteditable") === "true") return;
    target.setAttribute("contenteditable", "true");
    target.focus();
    // Select all so typing replaces.
    const sel = doc.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const range = doc.createRange();
      range.selectNodeContents(target);
      sel.addRange(range);
    }
  });

  doc.body.addEventListener(
    "blur",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target?.getAttribute("contenteditable") === "true") commit(target);
    },
    true, // capture — blur doesn't bubble
  );

  doc.body.addEventListener("keydown", (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-mulmo-path]");
    if (!target || target.getAttribute("contenteditable") !== "true") return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      target.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Revert: just remove editable; next render (from props) brings back the original.
      target.removeAttribute("contenteditable");
      target.blur();
    }
  });
};

const onIframeLoad = () => {
  const iframe = iframeRef.value;
  if (!iframe) return;
  wireEditing(iframe);
};

// When the slide content changes (from anywhere — Inspector, layout swap, etc.) we re-emit srcdoc,
// which triggers iframe `load` again. The wireEditing handler reattaches per load.
watch(html, () => {
  // The iframe srcdoc re-sets on render; wireEditing reattaches on load.
});

onBeforeUnmount(() => {
  // Listeners live in the iframe doc which is torn down with the iframe — nothing to clean up here.
});
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold tracking-wide text-stone-700">
        Live preview <span class="text-[10px] font-normal text-stone-400">— click text to edit</span>
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
  </div>
</template>
