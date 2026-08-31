import { ReactNode } from "react";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDF_FONTS, PdfTheme, RULE_WIDTH } from "./theme";

/**
 * The building blocks every PDF template is assembled from.
 *
 * Two rules are encoded here so no template has to remember them:
 *
 * 1. **Blocks only ever declare a top gap**, and only when they are not the
 *    first block in their container. Trailing margins are what produce the
 *    doubled-up gaps ("entry margin + section margin") that leave dead space
 *    between sections, so nothing here has a `marginBottom`.
 * 2. **Orphan control travels with the block that needs it.** Headings and
 *    entry titles carry `minPresenceAhead`, which tells react-pdf to move the
 *    block to the next page unless enough of the content that follows fits
 *    beneath it. react-pdf caps that distance at the end of the following
 *    siblings, so the last block of a section is never pushed for no reason.
 */

function buildStyles(theme: PdfTheme) {
  const { profile, space } = theme;

  return StyleSheet.create({
    page: {
      paddingVertical: profile.pagePaddingVertical,
      paddingHorizontal: profile.pagePaddingHorizontal,
      fontFamily: PDF_FONTS.regular,
      fontSize: profile.fontSize,
      lineHeight: theme.lineHeight,
      color: profile.color,
      textAlign: "left",
    },

    title: {
      fontFamily: PDF_FONTS.bold,
      fontSize: profile.titleFontSize,
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    subtitle: {
      fontSize: profile.metaFontSize,
      textAlign: "center",
      marginTop: space.header,
    },
    headerRule: {
      borderBottomWidth: RULE_WIDTH.header,
      borderBottomColor: profile.color,
      marginTop: space.header,
    },

    sectionHeader: {
      marginTop: space.section,
      marginBottom: space.headingBody,
    },
    sectionTitle: {
      fontFamily: PDF_FONTS.bold,
      fontSize: profile.headingFontSize,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: space.heading,
    },
    sectionRule: {
      borderBottomWidth: RULE_WIDTH.section,
      borderBottomColor: profile.color,
    },

    entryHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    entryPrimary: {
      fontFamily: PDF_FONTS.bold,
      flexShrink: 1,
    },
    entrySecondary: {
      fontFamily: PDF_FONTS.italic,
      paddingLeft: theme.gutter,
    },
    entrySubheading: {
      fontFamily: PDF_FONTS.italic,
    },

    body: {
      textAlign: "left",
    },

    row: {
      flexDirection: "row",
    },
    rowLabel: {
      fontFamily: PDF_FONTS.bold,
      marginRight: theme.gutter,
    },
    rowText: {
      flex: 1,
      textAlign: "left",
    },

    bulletGlyph: {
      width: theme.indent,
    },

    note: {
      fontSize: profile.metaFontSize,
    },
    noteLabel: {
      fontFamily: PDF_FONTS.bold,
      fontSize: profile.metaFontSize,
    },
    noteLink: {
      color: profile.linkColor,
    },
  });
}

type PdfStyles = ReturnType<typeof buildStyles>;

const styleCache = new WeakMap<PdfTheme, PdfStyles>();

/** Styles for a theme. Themes are cached per density, so this resolves once per tier. */
export function pdfStyles(theme: PdfTheme): PdfStyles {
  const cached = styleCache.get(theme);
  if (cached) return cached;
  const styles = buildStyles(theme);
  styleCache.set(theme, styles);
  return styles;
}

interface BlockProps {
  theme: PdfTheme;
  /** First block in its container, so it takes its spacing from the container. */
  first?: boolean;
}

/** Centred name/contact block that opens a document. */
export function DocumentHeader({
  theme,
  title,
  subtitle,
}: {
  theme: PdfTheme;
  title: string;
  subtitle?: string;
}) {
  const s = pdfStyles(theme);
  return (
    <View wrap={false}>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      <View style={s.headerRule} />
    </View>
  );
}

/**
 * A major section: the only construct allowed to open a new vertical gap.
 *
 * The heading and the section body are returned as siblings rather than nested
 * in a wrapper so that a long section can still flow across a page boundary,
 * and so `minPresenceAhead` measures against the section's own content.
 */
export function Section({
  theme,
  title,
  children,
}: {
  theme: PdfTheme;
  title: string;
  children: ReactNode;
}) {
  const s = pdfStyles(theme);
  return (
    <>
      <View style={s.sectionHeader} wrap={false} minPresenceAhead={theme.keepAhead.heading}>
        <Text style={s.sectionTitle}>{title}</Text>
        <View style={s.sectionRule} />
      </View>
      {children}
    </>
  );
}

export interface EntryHeading {
  primary: string;
  secondary?: string;
}

/**
 * One item of a section — a job, a degree, a project, a referee.
 *
 * The title/date row and the italic lines beneath it form a single unbreakable
 * block that reserves room for the entry's own content. Because react-pdf caps
 * that reservation at the end of the entry, a short entry is carried to the
 * next page whole, while a long one still splits between its bullets.
 */
export function Entry({
  theme,
  first = false,
  heading,
  subheading,
  children,
}: BlockProps & {
  heading?: EntryHeading;
  subheading?: string | string[];
  children?: ReactNode;
}) {
  const s = pdfStyles(theme);
  const subheadings = subheading == null ? [] : [subheading].flat();
  const hasHeader = heading != null || subheadings.length > 0;

  return (
    <View style={{ marginTop: first ? 0 : theme.space.entry }}>
      {hasHeader ? (
        <View wrap={false} minPresenceAhead={theme.keepAhead.entry}>
          {heading ? (
            <View style={s.entryHeading}>
              <Text style={s.entryPrimary}>{heading.primary}</Text>
              {heading.secondary ? (
                <Text style={s.entrySecondary}>{heading.secondary}</Text>
              ) : null}
            </View>
          ) : null}
          {subheadings.map((line, i) => (
            <Text
              key={i}
              style={[
                s.entrySubheading,
                { marginTop: i === 0 && !heading ? 0 : theme.space.line },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** A single react-pdf style object, as accepted by `StyleSheet.create`. */
type TextStyle = ReturnType<typeof StyleSheet.create>[string];

/**
 * A paragraph of body text.
 *
 * `gap` picks which of the shared spacing tokens separates it from the block
 * above: `line` for the supporting lines of an entry, `entry` for standalone
 * prose paragraphs. `style` may adjust typography but never spacing — the
 * computed margin is applied last.
 */
export function Body({
  theme,
  first = false,
  gap = "line",
  style,
  children,
}: BlockProps & {
  gap?: "line" | "entry";
  style?: TextStyle;
  children: ReactNode;
}) {
  const s = pdfStyles(theme);
  return (
    <Text style={[s.body, style ?? {}, { marginTop: first ? 0 : theme.space[gap] }]}>
      {children}
    </Text>
  );
}

/**
 * A bullet with a true hanging indent: the glyph occupies a fixed column, so
 * wrapped lines align with the first line's text rather than the glyph.
 */
export function Bullet({ theme, children }: { theme: PdfTheme; children: ReactNode }) {
  const s = pdfStyles(theme);
  return (
    <View
      style={[s.row, { marginTop: theme.space.line }]}
      minPresenceAhead={theme.unit}
    >
      <Text style={s.bulletGlyph}>&bull;</Text>
      <Text style={s.rowText}>{children}</Text>
    </View>
  );
}

/** A single-line "Label: value" row, used for grouped lists such as skills. */
export function LabelledRow({
  theme,
  first = false,
  label,
  children,
}: BlockProps & { label?: string; children: ReactNode }) {
  const s = pdfStyles(theme);
  return (
    <View style={[s.row, { marginTop: first ? 0 : theme.space.line }]} wrap={false}>
      {label ? <Text style={s.rowLabel}>{label}</Text> : null}
      <Text style={s.rowText}>{children}</Text>
    </View>
  );
}

/** Supporting detail beneath an entry — coursework, technologies, a link. */
export function Note({
  theme,
  label,
  tone = "default",
  children,
}: {
  theme: PdfTheme;
  label?: string;
  tone?: "default" | "link";
  children: ReactNode;
}) {
  const s = pdfStyles(theme);
  return (
    <Text
      style={[
        s.note,
        tone === "link" ? s.noteLink : {},
        { marginTop: theme.space.line },
      ]}
    >
      {label ? <Text style={s.noteLabel}>{label} </Text> : null}
      {children}
    </Text>
  );
}
