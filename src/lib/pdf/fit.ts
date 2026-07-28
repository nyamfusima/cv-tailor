import { ReactElement } from "react";
import { type DocumentProps, pdf } from "@react-pdf/renderer";
import { DENSITY_TIERS, Density, DocumentProfileName, PdfTheme, createTheme } from "./theme";
import { configureWordWrapping } from "./hyphenation";

/**
 * Page-fit pass.
 *
 * Templates are rendered at the most comfortable density first. If that leaves
 * a page that is mostly empty, the document is re-rendered a tier tighter and
 * kept only when the tighter spacing actually removes a page. Spacing is never
 * tightened without that payoff, and it is never loosened to fill a page — text
 * is not stretched, only lines and gaps are drawn closer together.
 */

/**
 * Builds a template at a given density. `documentProps` must be spread onto the
 * template's `<Document>` element — that is how the fit pass attaches the hook
 * it reads the resulting layout from.
 */
export type TemplateBuilder = (
  theme: PdfTheme,
  documentProps: DocumentProps,
) => ReactElement<DocumentProps>;

export interface FittedDocument {
  blob: Blob;
  theme: PdfTheme;
  /** Null when the layout could not be measured; the base density was used. */
  metrics: DocumentMetrics | null;
}

export interface DocumentMetrics {
  pages: number;
  /** Fraction of each page's content area that carries content, 0…1. */
  fill: number[];
}

/**
 * Share of a document's height taken up by the gaps between blocks. Used only
 * to decide whether attempting a tighter render is worth the work — it is an
 * intentionally generous estimate so a viable tier is never skipped.
 */
const GAP_HEIGHT_SHARE = 0.2;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Reads a numeric layout property from a node's box, falling back to its style. */
function boxValue(node: Record<string, unknown>, key: string): number {
  const box = asRecord(node.box);
  const style = asRecord(node.style);
  return asNumber(box?.[key]) ?? asNumber(style?.[key]) ?? 0;
}

function measurePage(page: Record<string, unknown>): number {
  const height = boxValue(page, "height");
  const paddingTop = boxValue(page, "paddingTop");
  const paddingBottom = boxValue(page, "paddingBottom");
  const available = height - paddingTop - paddingBottom;
  if (available <= 0) return 1;

  const children = Array.isArray(page.children) ? page.children : [];
  let bottom = paddingTop;

  for (const child of children) {
    const node = asRecord(child);
    // Fixed nodes repeat on every page and say nothing about how full it is.
    if (!node || asRecord(node.props)?.fixed === true) continue;
    const end = boxValue(node, "top") + boxValue(node, "height") + boxValue(node, "marginBottom");
    if (end > bottom) bottom = end;
  }

  return (bottom - paddingTop) / available;
}

/**
 * Turns react-pdf's internal layout tree into page fill ratios. The tree is an
 * undocumented render detail, so anything unrecognisable yields `null` and the
 * caller simply keeps the comfortable default spacing.
 */
export function measureDocument(layout: unknown): DocumentMetrics | null {
  const root = asRecord(layout);
  if (!root || !Array.isArray(root.children) || root.children.length === 0) return null;

  const fill: number[] = [];
  for (const page of root.children) {
    const node = asRecord(page);
    if (!node) return null;
    fill.push(measurePage(node));
  }

  return { pages: fill.length, fill };
}

interface Trial {
  blob: Blob;
  theme: PdfTheme;
  metrics: DocumentMetrics | null;
}

async function renderAt(
  build: TemplateBuilder,
  profile: DocumentProfileName,
  density: Density,
): Promise<Trial> {
  const theme = createTheme(profile, density);
  let layout: unknown = null;

  // `onRender` hands back the laid-out document alongside the blob, which is
  // how a trial learns its real page count without re-parsing the PDF.
  const element = build(theme, {
    onRender: (props: { blob?: Blob; _INTERNAL__LAYOUT__DATA_?: unknown }) => {
      layout = props._INTERNAL__LAYOUT__DATA_ ?? null;
    },
  });

  const blob = await pdf(element).toBlob();
  return { blob, theme, metrics: measureDocument(layout) };
}

/**
 * Fraction of the document's height a tier could remove relative to the tier it
 * would replace, assuming the whole document were reducible text. Deliberately
 * optimistic, so a tier that might work is never skipped.
 */
function reclaimableRatio(tier: Density, current: Density): number {
  return (
    1 - tier.leading / current.leading + GAP_HEIGHT_SHARE * (1 - tier.spacing / current.spacing)
  );
}

/**
 * Fraction of the document's height that has to disappear for it to lose a page.
 * Returns null when there is nothing to gain.
 *
 * Summing the fill ratios counts only the space content actually occupies, so
 * the slack a pushed heading leaves behind is already excluded — tightening
 * recovers that slack for free, on top of the height it removes.
 */
function reductionNeeded(metrics: DocumentMetrics): number | null {
  if (metrics.pages < 2) return null;
  const occupied = metrics.fill.reduce((total, fill) => total + fill, 0);
  if (occupied <= 0) return null;
  return Math.max(0, 1 - (metrics.pages - 1) / occupied);
}

export async function renderFittedDocument(
  build: TemplateBuilder,
  profile: DocumentProfileName,
): Promise<FittedDocument> {
  configureWordWrapping();

  let best = await renderAt(build, profile, DENSITY_TIERS[0]);

  for (let i = 1; i < DENSITY_TIERS.length; i += 1) {
    if (!best.metrics) break;
    const needed = reductionNeeded(best.metrics);
    if (needed === null) break;

    const tier = DENSITY_TIERS[i];
    if (reclaimableRatio(tier, best.theme.density) < needed) continue;

    const trial = await renderAt(build, profile, tier);
    if (!trial.metrics) break;
    // Keep the loosest tier that wins a page; carry on in case another follows.
    if (trial.metrics.pages < best.metrics.pages) best = trial;
  }

  return best;
}

/** Renders a template at its best fit and saves it through the browser. */
export async function downloadFittedDocument(
  build: TemplateBuilder,
  profile: DocumentProfileName,
  fileName: string,
): Promise<void> {
  const { blob } = await renderFittedDocument(build, profile);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
