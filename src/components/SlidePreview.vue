<script setup lang="ts">
import { computed } from "vue";
import { generateSlideHTML, type SlideLayout, type SlideTheme } from "@mulmocast/deck";

const props = defineProps<{
  slide: SlideLayout;
  theme: SlideTheme;
}>();

const html = computed(() => {
  try {
    return generateSlideHTML(props.theme, props.slide);
  } catch (e) {
    return `<!doctype html><html><body><pre style="padding:24px;color:#dc2626;font-family:monospace">${String(e)}</pre></body></html>`;
  }
});
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold tracking-wide text-stone-700">Live preview</h2>
      <span class="text-xs text-stone-400">{{ slide.layout }}</span>
    </div>
    <div class="relative flex-1 overflow-hidden rounded-lg border border-stone-300 bg-white shadow-sm">
      <iframe :srcdoc="html" class="absolute inset-0 h-full w-full" sandbox="allow-scripts allow-same-origin" title="slide preview" />
    </div>
  </div>
</template>
