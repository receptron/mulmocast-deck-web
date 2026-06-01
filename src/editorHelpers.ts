import type { SlideLayout, ContentBlock, AccentColorKey } from "@mulmocast/deck";

/** Accent color tokens accepted by every layout / block in the deck schema. */
export const ACCENT_COLORS: AccentColorKey[] = ["primary", "accent", "success", "warning", "danger", "info", "highlight"];

export const TEXT_SIZES = ["lead", "big", "sub"] as const;
export const BULLET_ICONS = ["ok", "no", "warn"] as const;
export const SLIDE_DENSITIES = ["compact", "default"] as const;
export const SLIDE_TITLE_SIZES = ["small", "default", "large", "hero"] as const;
export const SLIDE_SUBTITLE_SIZES = ["default", "lead", "big"] as const;
export const VALIGNS = ["top", "center", "bottom"] as const;
export const ALIGNS = ["left", "center", "right"] as const;
export const CALLOUT_STYLES = ["quote", "info", "warning"] as const;

/** Every SlideLayout `layout` value in the order we expose in the picker. */
export const LAYOUT_TYPES: SlideLayout["layout"][] = [
  "title",
  "bigQuote",
  "columns",
  "comparison",
  "grid",
  "stats",
  "timeline",
  "split",
  "matrix",
  "table",
  "funnel",
  "waterfall",
  "manifesto",
];

/** Every content block `type` value. */
export const BLOCK_TYPES: ContentBlock["type"][] = [
  "text",
  "bullets",
  "callout",
  "tag",
  "code",
  "metric",
  "divider",
  "image",
  "imageRef",
  "chart",
  "mermaid",
  "section",
  "table",
];

/** Structured-clone replacement that works for the plain-data slide objects. */
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** Return a sensible default skeleton for a new content block of the given type. */
export const makeBlock = (type: ContentBlock["type"]): ContentBlock => {
  switch (type) {
    case "text":
      return { type: "text", value: "新しいテキスト" };
    case "bullets":
      return { type: "bullets", items: ["新しい項目"] };
    case "callout":
      return { type: "callout", text: "強調するテキスト" };
    case "tag":
      return { type: "tag", text: "TAG" };
    case "code":
      return { type: "code", code: "// code", language: "ts" };
    case "metric":
      return { type: "metric", value: "+42%", label: "label" };
    case "divider":
      return { type: "divider" };
    case "image":
      return { type: "image", src: "" };
    case "imageRef":
      return { type: "imageRef", ref: "" };
    case "chart":
      return { type: "chart", chartData: { type: "bar" } };
    case "mermaid":
      return { type: "mermaid", code: "graph TD;\n  A-->B;" };
    case "section":
      return { type: "section", label: "セクション" };
    case "table":
      return { type: "table", headers: ["A", "B"], rows: [["1", "2"]] };
  }
};

/** Return a skeleton SlideLayout for a fresh slide of the given layout type. */
export const makeSlide = (layout: SlideLayout["layout"]): SlideLayout => {
  switch (layout) {
    case "title":
      return { layout: "title", title: "New title" };
    case "bigQuote":
      return { layout: "bigQuote", quote: "Quote here." };
    case "columns":
      return { layout: "columns", title: "Columns", columns: [{ title: "Column A" }, { title: "Column B" }] };
    case "comparison":
      return { layout: "comparison", title: "Compare", left: { title: "Left" }, right: { title: "Right" } };
    case "grid":
      return { layout: "grid", title: "Grid", items: [{ title: "A" }, { title: "B" }, { title: "C" }] };
    case "stats":
      return { layout: "stats", title: "Stats", stats: [{ value: "1", label: "A" }] };
    case "timeline":
      return { layout: "timeline", title: "Timeline", items: [{ date: "Q1", title: "Kickoff" }] };
    case "split":
      return { layout: "split", left: { title: "Left" }, right: { title: "Right" } };
    case "matrix":
      return {
        layout: "matrix",
        title: "Matrix",
        rows: 2,
        cols: 2,
        cells: [{ label: "TL" }, { label: "TR" }, { label: "BL" }, { label: "BR" }],
      };
    case "table":
      return { layout: "table", title: "Table", headers: ["A", "B"], rows: [["1", "2"]] };
    case "funnel":
      return { layout: "funnel", title: "Funnel", stages: [{ label: "Step 1", value: "100" }] };
    case "waterfall":
      return { layout: "waterfall", title: "Waterfall", items: [{ label: "Start", value: 100 }] };
    case "manifesto":
      return { layout: "manifesto", title: "Manifesto", items: [{ title: "Principle 1" }] };
  }
};

/** Mutate the given array in place: move element at `from` by `delta` (clamped). */
export const moveInArray = <T>(arr: T[], from: number, delta: number): T[] => {
  const to = Math.max(0, Math.min(arr.length - 1, from + delta));
  if (to === from) return arr;
  const next = arr.slice();
  const [el] = next.splice(from, 1);
  next.splice(to, 0, el);
  return next;
};

/**
 * Parse a deck path like `columns[0].content[1].items[0].text` into an array of
 * string-or-number segments. Returns null if the path doesn't match the expected grammar.
 */
export const parsePath = (path: string): (string | number)[] | null => {
  if (!path) return null;
  const out: (string | number)[] = [];
  // Match either ".name" / "name" (first) or "[123]".
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[2] !== undefined) out.push(Number(m[2]));
    else out.push(m[1]);
  }
  return out.length ? out : null;
};

/**
 * Deep-set `slide.<path>` to `value`, returning a structurally-cloned object so reactivity fires.
 * Walks the path, copying each object/array level it touches; leaves untouched siblings shared.
 */
export const setByPath = <T>(root: T, path: string, value: unknown): T => {
  const segments = parsePath(path);
  if (!segments) return root;
  const copy = JSON.parse(JSON.stringify(root)) as T;
  let cursor: unknown = copy;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (cursor && typeof cursor === "object") {
      const obj = cursor as Record<string | number, unknown>;
      if (obj[seg] === undefined || obj[seg] === null) return root; // path doesn't exist, give up
      cursor = obj[seg];
    } else {
      return root;
    }
  }
  const last = segments[segments.length - 1];
  if (cursor && typeof cursor === "object") {
    (cursor as Record<string | number, unknown>)[last] = value;
  }
  return copy;
};

/** Deep-get `slide.<path>`. Returns undefined if anything along the way is missing. */
export const getByPath = <T = unknown>(root: unknown, path: string): T | undefined => {
  const segments = parsePath(path);
  if (!segments) return undefined;
  let cursor: unknown = root;
  for (const seg of segments) {
    if (cursor && typeof cursor === "object") {
      cursor = (cursor as Record<string | number, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cursor as T | undefined;
};

/**
 * Convert an editable text element's innerHTML back into the deck's inline-markup syntax,
 * round-tripping the renderInlineMarkup pass. We honor:
 *   <strong> / <b>          → **bold**
 *   <em> (any class)        → *emphasis*
 *   <span class="text-d-X"> → {X:text}   (X ∈ inlineColorKeys)
 *   <br>                    → newline
 * Anything else is stripped to its text content. Safe for round-tripping the formatter — typing
 * `**foo**` raw, blurring, and re-clicking should produce the same source.
 */
const INLINE_COLOR_KEYS = new Set(["primary", "accent", "success", "warning", "danger", "info", "highlight"]);

export const htmlToMarkup = (html: string): string => {
  // Use a detached <template> in any window we can grab. Prefer the global document.
  const doc = typeof document !== "undefined" ? document : null;
  if (!doc) return html;
  const template = doc.createElement("template");
  template.innerHTML = html;

  const walk = (node: Node): string => {
    if (node.nodeType === 3) return node.nodeValue ?? "";
    if (node.nodeType !== 1) return "";
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "\n";
    const inner = Array.from(el.childNodes).map(walk).join("");
    if (tag === "strong" || tag === "b") return `**${inner}**`;
    if (tag === "em" || tag === "i") return `*${inner}*`;
    if (tag === "span") {
      // Match the `text-d-<color>` class injected by renderInlineMarkup.
      const cls = el.getAttribute("class") ?? "";
      const m = /text-d-([a-z]+)/.exec(cls);
      if (m && INLINE_COLOR_KEYS.has(m[1])) return `{${m[1]}:${inner}}`;
    }
    return inner;
  };

  return Array.from(template.content.childNodes).map(walk).join("");
};
