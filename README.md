# @mulmocast/deck-web

[![npm version](https://img.shields.io/npm/v/@mulmocast/deck-web.svg)](https://www.npmjs.com/package/@mulmocast/deck-web)
[![npm downloads](https://img.shields.io/npm/dm/@mulmocast/deck-web.svg)](https://www.npmjs.com/package/@mulmocast/deck-web)
[![License: MIT](https://img.shields.io/npm/l/@mulmocast/deck-web.svg)](LICENSE)
[![CI](https://github.com/receptron/mulmocast-deck-web/actions/workflows/pull_request.yaml/badge.svg)](https://github.com/receptron/mulmocast-deck-web/actions/workflows/pull_request.yaml)
[![GitHub stars](https://img.shields.io/github/stars/receptron/mulmocast-deck-web.svg?style=social)](https://github.com/receptron/mulmocast-deck-web/stargazers)

Vue 3 components for editing [`@mulmocast/deck`](https://www.npmjs.com/package/@mulmocast/deck) slide decks live in the browser.

A 3-pane editor that holds a `SlideLayout[]` (or a full MulmoScript) in memory, renders each slide live via `generateSlideHTML()` into a sandboxed iframe, and lets you edit fields through a schema-aware inspector. No backend, no persistence, no AI — just data ↔ preview.

## Install

```bash
yarn add @mulmocast/deck-web @mulmocast/deck vue
```

`vue ^3.5` and `@mulmocast/deck ^0.1.2` are peer dependencies — install whichever versions your app already pins.

## Usage

### Edit a `SlideLayout[]` directly

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DeckEditor, sampleDeck, defaultTheme } from "@mulmocast/deck-web";

const slides = ref(sampleDeck);
</script>

<template>
  <DeckEditor v-model:slides="slides" :theme="defaultTheme" />
</template>
```

### Edit a MulmoScript directly

`MulmoScriptDeckEditor` is a companion component that takes a `MulmoScript`, extracts the slide beats (`image.type === "slide"`), and writes edits back into the script. Non-slide beats (movie / textSlide / voice_over / etc.) stay untouched.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { MulmoScriptDeckEditor } from "@mulmocast/deck-web";

const script = ref({ /* your MulmoScript */ });
</script>

<template>
  <MulmoScriptDeckEditor v-model:script="script" />
</template>
```

Theme priority: prop `theme` > `script.presentationStyle.slideParams.theme` > `script.slideParams.theme` > built-in `defaultTheme`.

## Components

| Component | Purpose |
|---|---|
| `<DeckEditor>` | All-in-one 3-pane editor. `v-model:slides` (`SlideLayout[]`), optional `theme`, optional `v-model:selectedIndex`. |
| `<MulmoScriptDeckEditor>` | Same UX but consumes/emits a MulmoScript. |
| `<DeckList>` / `<SlidePreview>` / `<Inspector>` | The individual panes — drop into your own layout. |
| `defaultTheme` / `sampleDeck` | Data helpers for quick starts. |

The Inspector currently covers `title` / `stats` (per-item value/label/color) / `comparison` / `bigQuote`. Other layouts render fine in preview but aren't form-editable yet.

## How preview works

Each slide is rendered through `generateSlideHTML(theme, slide)` from `@mulmocast/deck` and dropped into an `<iframe srcdoc>` sandbox. Tailwind is loaded inside the iframe via CDN, so the host page's CSS can't bleed in (or out).

## Architecture

```
DeckEditor.vue           (controlled — props: slides, theme; emits: update:slides)
├── DeckList.vue         -- left  (slide list / add / remove / select)
├── SlidePreview.vue     -- center (iframe srcdoc = generateSlideHTML(theme, slide))
└── Inspector.vue        -- right (form for the selected slide)

MulmoScriptDeckEditor.vue
└── DeckEditor (with a beats↔slides adapter)
```

State is held by the parent (Vue v-model pattern). All mutations are immutable copies, so iframe re-renders reactively.

## Scripts

```bash
yarn dev          # Vite dev server with the SPA demo
yarn build        # build the demo SPA → dist/
yarn build:lib    # build the publishable library → dist/lib/ (used by prepublishOnly)
yarn lint
yarn format
```

## License

MIT
