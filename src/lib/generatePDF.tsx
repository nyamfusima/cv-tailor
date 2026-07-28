import { type DocumentProps, Document, Page } from "@react-pdf/renderer";
import { TailoredCV } from "./types";
import {
  Body,
  Bullet,
  DocumentHeader,
  Entry,
  LabelledRow,
  Note,
  PdfTheme,
  Section,
  downloadFittedDocument,
  pdfStyles,
} from "./pdf";

/**
 * Harvard-style CV.
 *
 * The template describes structure only: every gap, indent and page-break rule
 * comes from the shared theme in `./pdf`, so spacing stays identical here and
 * in any other template built on the same primitives.
 */
export function ResumeDocument({
  cv,
  theme,
  ...documentProps
}: { cv: TailoredCV; theme: PdfTheme } & DocumentProps) {
  const styles = pdfStyles(theme);
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join("  ·  ");

  return (
    <Document {...documentProps}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader theme={theme} title={cv.name} subtitle={contact || undefined} />

        {cv.summary ? (
          <Section theme={theme} title="Summary">
            <Body theme={theme} first>
              {cv.summary}
            </Body>
          </Section>
        ) : null}

        {cv.skills?.length ? (
          <Section theme={theme} title="Key Skills">
            {cv.skills.map((group, i) => (
              <LabelledRow key={i} theme={theme} first={i === 0} label={`${group.category}:`}>
                {group.skills.join(", ")}
              </LabelledRow>
            ))}
          </Section>
        ) : null}

        {cv.experience?.length ? (
          <Section theme={theme} title="Experience">
            {cv.experience.map((job, i) => (
              <Entry
                key={i}
                theme={theme}
                first={i === 0}
                heading={{ primary: job.title, secondary: job.dates }}
                subheading={job.company}
              >
                {job.bullets.map((bullet, j) => (
                  <Bullet key={j} theme={theme}>
                    {bullet}
                  </Bullet>
                ))}
              </Entry>
            ))}
          </Section>
        ) : null}

        {cv.education?.length ? (
          <Section theme={theme} title="Education">
            {cv.education.map((edu, i) => (
              <Entry
                key={i}
                theme={theme}
                first={i === 0}
                heading={{ primary: edu.degree, secondary: edu.dates }}
                subheading={edu.institution}
              >
                {edu.coursework?.length ? (
                  <Note theme={theme} label="Relevant coursework:">
                    {edu.coursework.join(", ")}
                  </Note>
                ) : null}
              </Entry>
            ))}
          </Section>
        ) : null}

        {cv.certifications?.length ? (
          <Section theme={theme} title="Professional Development">
            {cv.certifications.map((cert, i) => (
              <Entry
                key={i}
                theme={theme}
                first={i === 0}
                heading={{ primary: cert.name, secondary: cert.date }}
                subheading={cert.issuer}
              />
            ))}
          </Section>
        ) : null}

        {cv.projects?.length ? (
          <Section theme={theme} title="Projects">
            {cv.projects.map((project, i) => (
              <Entry
                key={i}
                theme={theme}
                first={i === 0}
                heading={{ primary: project.name, secondary: project.dates }}
              >
                {project.url ? (
                  <Note theme={theme} tone="link">
                    {project.url}
                  </Note>
                ) : null}
                <Body theme={theme}>{project.description}</Body>
                {project.technologies?.length ? (
                  <Note theme={theme} label="Technologies:">
                    {project.technologies.join(", ")}
                  </Note>
                ) : null}
              </Entry>
            ))}
          </Section>
        ) : null}

        {cv.references?.length ? (
          <Section theme={theme} title="References">
            {cv.references.map((ref, i) => (
              <Entry
                key={i}
                theme={theme}
                first={i === 0}
                heading={{ primary: ref.name }}
                subheading={[
                  `${ref.title} · ${ref.company}`,
                  [ref.email, ref.phone].filter(Boolean).join("  ·  "),
                ].filter(Boolean)}
              />
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}

export async function downloadPDF(cv: TailoredCV) {
  await downloadFittedDocument(
    (theme, documentProps) => <ResumeDocument cv={cv} theme={theme} {...documentProps} />,
    "resume",
    `${cv.name.replace(/\s+/g, "_")}_CV.pdf`,
  );
}
