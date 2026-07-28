export {
  DENSITY_TIERS,
  DOCUMENT_PROFILES,
  PDF_FONTS,
  RULE_WIDTH,
  createTheme,
  type Density,
  type DocumentProfile,
  type DocumentProfileName,
  type PdfTheme,
} from "./theme";

export {
  Body,
  Bullet,
  DocumentHeader,
  Entry,
  LabelledRow,
  Note,
  Section,
  pdfStyles,
  type EntryHeading,
} from "./primitives";

export {
  downloadFittedDocument,
  measureDocument,
  renderFittedDocument,
  type DocumentMetrics,
  type FittedDocument,
  type TemplateBuilder,
} from "./fit";

export { configureWordWrapping } from "./hyphenation";
