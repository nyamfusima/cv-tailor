/**
 * Single source of truth for PDF spacing and typography.
 *
 * Every vertical gap in every generated document is derived from the tokens in
 * this file, so no template ever hardcodes a margin for an individual section.
 * A theme is the combination of a *document profile* (which font sizes, colours
 * and page margins a document type uses) and a *density tier* (how tightly the
 * layout engine is allowed to pack that document to avoid half-empty pages).
 */

export const PDF_FONTS = {
  regular: "Times-Roman",
  bold: "Times-Bold",
  italic: "Times-Italic",
} as const;

/**
 * Vertical gaps, expressed as multiples of one line of body text. Keeping them
 * relative means the rhythm of the document stays proportional at any density
 * and at any base font size.
 *
 * `section` is deliberately the only large value: it is the sole place where
 * the layout is allowed to introduce real vertical space.
 */
const SPACING_RATIOS = {
  /** Above a section heading — the only "new major section" gap. */
  section: 1,
  /** Section heading text to its underline. */
  heading: 0.18,
  /** Section underline to the first block of the section. */
  headingBody: 0.4,
  /** Between sibling blocks of a section (jobs, degrees, projects…). */
  entry: 0.5,
  /** Between related lines inside one block, including consecutive bullets. */
  line: 0.12,
  /** Between the lines of the document header block. */
  header: 0.3,
} as const;

/** Hanging indent of a bullet, as a multiple of the body font size. */
const BULLET_INDENT_RATIO = 1;

/** Horizontal breathing room between items on the same line, as a multiple of the body font size. */
const GUTTER_RATIO = 0.4;

/**
 * How much following content must fit on the page for a block to stay put,
 * in lines of body text. These are what stop a heading or a lone bullet from
 * being stranded at the foot of a page.
 *
 * react-pdf caps this reservation at the end of the block's following siblings,
 * so a block is only ever pushed when there is genuinely more content to keep
 * it company — the last entry of a section is never moved for nothing.
 */
const KEEP_AHEAD_LINES = {
  /** Lines of its own content an entry must be able to show beneath its title. */
  entry: 2,
  /** Tallest title block that cannot be split: a title row plus two detail lines. */
  entryHeader: 3,
} as const;

/**
 * A section heading has to reserve enough room for the entry beneath it to stay
 * as well, otherwise the heading keeps its place while the entry moves on and
 * the heading is left stranded.
 */
const HEADING_KEEP_AHEAD_LINES = KEEP_AHEAD_LINES.entryHeader + KEEP_AHEAD_LINES.entry;

export const RULE_WIDTH = {
  header: 1,
  section: 0.5,
} as const;

export interface DocumentProfile {
  /** Body text size in points. */
  readonly fontSize: number;
  /** Supporting text (contact line, coursework, technologies). */
  readonly metaFontSize: number;
  /** The document title (candidate name, letter subject). */
  readonly titleFontSize: number;
  readonly lineHeight: number;
  readonly color: string;
  readonly linkColor: string;
  readonly pagePaddingVertical: number;
  readonly pagePaddingHorizontal: number;
}

/**
 * Per document-type styling. Fonts, colours and sizes are preserved exactly as
 * they were before the layout engine existed; only spacing is managed here.
 */
export const DOCUMENT_PROFILES = {
  resume: {
    fontSize: 10,
    metaFontSize: 9,
    titleFontSize: 16,
    lineHeight: 1.4,
    color: "#000000",
    linkColor: "#1d4ed8",
    pagePaddingVertical: 48,
    pagePaddingHorizontal: 56,
  },
  letter: {
    fontSize: 11,
    metaFontSize: 10,
    titleFontSize: 12,
    lineHeight: 1.6,
    color: "#0f172a",
    linkColor: "#1d4ed8",
    pagePaddingVertical: 48,
    pagePaddingHorizontal: 48,
  },
} as const satisfies Record<string, DocumentProfile>;

export type DocumentProfileName = keyof typeof DOCUMENT_PROFILES;

export interface Density {
  readonly id: string;
  /** Multiplier applied to every gap in `SPACING_RATIOS`. */
  readonly spacing: number;
  /** Multiplier applied to the profile line height. */
  readonly leading: number;
}

/**
 * Ordered loosest to tightest. The fit pass starts at `comfortable` and only
 * moves down a tier when doing so removes a page — spacing is never tightened
 * for its own sake, and text is never stretched to fill a page.
 *
 * Font sizes are untouched by density, so tightening never changes how the
 * document reads, only how closely its lines sit.
 */
export const DENSITY_TIERS: readonly Density[] = [
  { id: "comfortable", spacing: 1, leading: 1 },
  { id: "normal", spacing: 0.82, leading: 0.965 },
  { id: "compact", spacing: 0.66, leading: 0.93 },
  { id: "tight", spacing: 0.5, leading: 0.9 },
];

export type SpacingScale = Record<keyof typeof SPACING_RATIOS, number>;

export interface PdfTheme {
  readonly profile: DocumentProfile;
  readonly density: Density;
  /** Height of one line of body text, the unit every gap is derived from. */
  readonly unit: number;
  readonly lineHeight: number;
  readonly space: SpacingScale;
  readonly indent: number;
  readonly gutter: number;
  readonly keepAhead: Record<keyof typeof KEEP_AHEAD_LINES | "heading", number>;
}

const themeCache = new Map<string, PdfTheme>();

export function createTheme(
  profileName: DocumentProfileName,
  density: Density = DENSITY_TIERS[0],
): PdfTheme {
  const key = `${profileName}:${density.id}`;
  const cached = themeCache.get(key);
  if (cached) return cached;

  const profile = DOCUMENT_PROFILES[profileName];
  const lineHeight = profile.lineHeight * density.leading;
  const unit = profile.fontSize * lineHeight;

  const space = Object.fromEntries(
    Object.entries(SPACING_RATIOS).map(([name, ratio]) => [
      name,
      ratio * unit * density.spacing,
    ]),
  ) as SpacingScale;

  const keepAhead = Object.fromEntries(
    Object.entries({ ...KEEP_AHEAD_LINES, heading: HEADING_KEEP_AHEAD_LINES }).map(
      ([name, lines]) => [name, lines * unit],
    ),
  ) as PdfTheme["keepAhead"];

  const theme: PdfTheme = {
    profile,
    density,
    unit,
    lineHeight,
    space,
    indent: profile.fontSize * BULLET_INDENT_RATIO,
    gutter: profile.fontSize * GUTTER_RATIO,
    keepAhead,
  };

  themeCache.set(key, theme);
  return theme;
}
