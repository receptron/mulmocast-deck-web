# @mulmocast/deck-web

Browser-side live editor for [`@mulmocast/deck`](https://www.npmjs.com/package/@mulmocast/deck) decks.

A 3-pane Vue 3 app that holds a `SlideLayout[]` in memory, renders each slide live via `generateSlideHTML()` into a sandboxed iframe, and lets you edit fields through a schema-aware inspector. No backend, no persistence, no AI — just data ↔ preview.

## Quick start

```bash
yarn install
yarn dev
```

Open the printed `http://localhost:5173/` URL.

## What's in the MVP

- **Deck pane (left)**: list of slides, add / remove / select.
- **Live preview (center)**: each slide is rendered through `generateSlideHTML(theme, slide)` and dropped into an `<iframe srcdoc>` (Tailwind via CDN). Updates the moment the underlying state changes.
- **Inspector (right)**: form for editing the currently selected slide. Currently covers:
  - `title`: title / subtitle
  - `stats`: title / subtitle + each stat's value / label / color
  - `comparison`: title
  - `bigQuote`: quote / author

Other layouts render fine but aren't form-editable yet.

## Architecture

```
App.vue (slides: SlideLayout[], selectedIndex, theme)
├── DeckList.vue            -- left
├── SlidePreview.vue        -- center, iframe srcdoc = generateSlideHTML(theme, slide)
└── Inspector.vue           -- right, emits 'update' with a new SlideLayout
```

State is held in `App.vue` with Vue refs. Mutations are immutable copies (so the iframe reactively re-renders).

## Build

```bash
yarn build      # vue-tsc + vite build → dist/
yarn preview    # serve dist/ for sanity check
```

## License

MIT
