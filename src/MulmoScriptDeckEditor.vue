<script setup lang="ts">
import { computed } from "vue";
import type { SlideLayout, SlideTheme } from "@mulmocast/deck";
import DeckEditor from "./DeckEditor.vue";

/**
 * Minimal structural typing for MulmoScript. Any actual MulmoScript instance
 * (from mulmocast / @mulmocast/types) fits this shape, so consumers don't
 * have to depend on those packages.
 */
type MulmoScriptShape = {
  beats?: Array<{
    image?: {
      type?: string;
      slide?: SlideLayout;
      theme?: SlideTheme;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  }>;
  presentationStyle?: { slideParams?: { theme?: SlideTheme } };
  slideParams?: { theme?: SlideTheme };
  [k: string]: unknown;
};

const props = defineProps<{
  script: MulmoScriptShape;
  theme?: SlideTheme;
  /**
   * Forwarded to `DeckEditor`. `"split"` (default) keeps the original 3-pane layout;
   * `"compact"` swaps the left DeckList for a top toolbar and makes the right
   * Inspector collapsible — used when the editor is embedded in a width-constrained
   * host and the SlidePreview deserves the freed pixels.
   */
  layout?: "split" | "compact";
}>();

const emit = defineEmits<{
  "update:script": [script: MulmoScriptShape];
}>();

// Beat indices (in original script order) whose image is a slide.
const slideBeatIndices = computed<number[]>(() => {
  const beats = props.script.beats ?? [];
  return beats.flatMap((b, i) => (b.image?.type === "slide" && b.image.slide ? [i] : []));
});

// Slides extracted in document order. Stable references so DeckEditor's
// reference-equality based diffing works.
const slides = computed<SlideLayout[]>(() => slideBeatIndices.value.map((i) => props.script.beats![i].image!.slide as SlideLayout));

// Theme priority — matches `mulmocast`'s slide renderer
// (`utils/image_plugins/slide.ts:resolveTheme`) so the editor preview
// stays in lock-step with what PDF / movie output will show:
//
//   1. Explicit `theme` prop — host pins a theme regardless of script content.
//   2. `beats[*].image.theme` — per-beat override. Storyteller and
//      generated decks (e.g. the bootcamp samples shipped with this
//      repo) populate ONLY this slot; the previous priority missed it
//      entirely and fell through to the default theme, producing a
//      cream editor / themed renderer mismatch
//      (`receptron/mulmoclaude#1622`).
//   3. `script.presentationStyle.slideParams.theme` — deck-level default.
//   4. `script.slideParams.theme` — legacy top-level slot.
//   5. Whatever `DeckEditor`'s `defaultTheme` fallback hands back.
//
// `DeckEditor` takes a single deck-wide theme, so the per-beat lookup
// picks the **first** slide beat's theme — exact match for the common
// case where every beat shares one theme. Per-slide theming (different
// theme per beat) is a separate, larger DeckEditor / SlidePreview
// change tracked outside this fix.
const effectiveTheme = computed<SlideTheme | undefined>(() => {
  if (props.theme) return props.theme;
  for (const beat of props.script.beats ?? []) {
    if (beat?.image?.type === "slide" && beat.image.theme) return beat.image.theme;
  }
  return props.script.presentationStyle?.slideParams?.theme ?? props.script.slideParams?.theme;
});

const hiddenCount = computed(() => (props.script.beats?.length ?? 0) - slideBeatIndices.value.length);

const onUpdateSlides = (next: SlideLayout[]) => {
  const script = props.script;
  const beats = (script.beats ?? []).slice();
  const oldSlideBeatIdx = slideBeatIndices.value;
  const oldSlides = slides.value;

  // Same-length emit = in-place edit (the dominant case) OR a same-length
  // reorder. Reference-equality diffing would mistakenly treat an edited
  // slide as "old removed + new added", because SlidePreview emits a fresh
  // SlideLayout object after each field change — the edited slide would
  // then be appended at the tail (slide visibly jumps to the back).
  // Positional zip preserves the original beat order regardless of which
  // slide refs survived.
  if (next.length === oldSlides.length) {
    for (let k = 0; k < next.length; k++) {
      const beatI = oldSlideBeatIdx[k];
      beats[beatI] = { ...beats[beatI], image: { ...beats[beatI].image, type: "slide", slide: next[k] } };
    }
    emit("update:script", { ...script, beats });
    return;
  }

  // Length-changing path (add / remove): reference-equality diff.
  // 1. Determine which old slides survive (by reference).
  const nextSet = new Set<SlideLayout>(next);
  const removedBeatIdx: number[] = [];
  oldSlides.forEach((s, k) => {
    if (!nextSet.has(s)) removedBeatIdx.push(oldSlideBeatIdx[k]);
  });

  // 2. Remove dropped beats (descending order to preserve earlier indices).
  removedBeatIdx.sort((a, b) => b - a).forEach((i) => beats.splice(i, 1));

  // 3. After removals, locate current slide-type beat positions.
  const currentSlideBeatIdx = beats.flatMap((b, i) => (b.image?.type === "slide" ? [i] : []));

  // 4. Walk `next`: surviving slides write to existing slide-beats in order;
  //    new slides append as new slide-only beats at the tail of `beats`.
  //    (Reordering and mid-deck insertion are deferred to a later version.)
  const oldSet = new Set<SlideLayout>(oldSlides);
  let writeK = 0;
  for (const slide of next) {
    if (oldSet.has(slide) && writeK < currentSlideBeatIdx.length) {
      const beatI = currentSlideBeatIdx[writeK];
      beats[beatI] = { ...beats[beatI], image: { ...beats[beatI].image, type: "slide", slide } };
      writeK++;
    } else {
      beats.push({ image: { type: "slide", slide } });
    }
  }

  emit("update:script", { ...script, beats });
};
</script>

<template>
  <div class="flex h-full w-full flex-col">
    <div v-if="hiddenCount > 0" class="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-700">
      {{ hiddenCount }} non-slide beat{{ hiddenCount === 1 ? "" : "s" }} hidden (movie / textSlide / etc.)
    </div>
    <div class="flex-1 min-h-0">
      <DeckEditor :slides="slides" :theme="effectiveTheme" :layout="layout" @update:slides="onUpdateSlides" />
    </div>
  </div>
</template>
