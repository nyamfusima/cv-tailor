import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { TailoredCV } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: "48 56",
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#000000",
    lineHeight: 1.4,
  },
  name: {
    fontSize: 16,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  contact: {
    fontSize: 9,
    textAlign: "center",
    color: "#000000",
    marginBottom: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
    marginTop: 10,
  },
  sectionDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#000000",
    marginBottom: 6,
  },
  summary: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  skillCategory: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    marginRight: 4,
  },
  skillList: {
    fontSize: 10,
    flex: 1,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  jobTitle: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  jobDate: {
    fontSize: 10,
    fontFamily: "Times-Italic",
  },
  jobCompany: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    marginBottom: 2,
  },
  bullet: {
    fontSize: 10,
    marginBottom: 1.5,
    paddingLeft: 10,
  },
  eduHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  eduDegree: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  eduDate: {
    fontSize: 10,
    fontFamily: "Times-Italic",
  },
  eduInstitution: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    marginBottom: 2,
  },
  coursework: {
    fontSize: 9,
    marginTop: 1,
    marginBottom: 4,
  },
  courseworkLabel: {
    fontFamily: "Times-Bold",
    fontSize: 9,
  },
  certHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  certName: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  certDate: {
    fontSize: 10,
    fontFamily: "Times-Italic",
  },
  certIssuer: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    marginBottom: 4,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  projectName: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  projectDate: {
    fontSize: 10,
    fontFamily: "Times-Italic",
  },
  projectUrl: {
    fontSize: 9,
    color: "#1d4ed8",
    marginBottom: 2,
  },
  projectDesc: {
    fontSize: 10,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  projectTech: {
    fontSize: 9,
    marginBottom: 4,
  },
  refName: {
    fontFamily: "Times-Bold",
    fontSize: 10,
  },
  refDetail: {
    fontSize: 10,
    fontFamily: "Times-Italic",
    marginBottom: 4,
  },
});

function HarvardDoc({ cv }: { cv: TailoredCV }) {
  const contactParts = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Name */}
        <Text style={styles.name}>{cv.name}</Text>

        {/* Contact */}
        <Text style={styles.contact}>{contactParts.join("  ·  ")}</Text>
        <View style={styles.divider} />

        {/* Summary */}
        {cv.summary && (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.sectionDivider} />
            <Text style={styles.summary}>{cv.summary}</Text>
          </>
        )}

        {/* Key Skills */}
        {cv.skills?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Key Skills</Text>
            <View style={styles.sectionDivider} />
            {cv.skills.map((group, i) => (
              <View key={i} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{group.category}:</Text>
                <Text style={styles.skillList}>{group.skills.join(", ")}</Text>
              </View>
            ))}
          </>
        )}

        {/* Experience */}
        {cv.experience?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.sectionDivider} />
            {cv.experience.map((job, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobDate}>{job.dates}</Text>
                </View>
                <Text style={styles.jobCompany}>{job.company}</Text>
                {job.bullets.map((b, j) => (
                  <Text key={j} style={styles.bullet}>•  {b}</Text>
                ))}
              </View>
            ))}
          </>
        )}

        {/* Education */}
        {cv.education?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            <View style={styles.sectionDivider} />
            {cv.education.map((edu, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.eduHeader}>
                  <Text style={styles.eduDegree}>{edu.degree}</Text>
                  <Text style={styles.eduDate}>{edu.dates}</Text>
                </View>
                <Text style={styles.eduInstitution}>{edu.institution}</Text>
                {edu.coursework && edu.coursework.length > 0 && (
                  <Text style={styles.coursework}>
                    <Text style={styles.courseworkLabel}>Relevant coursework: </Text>
                    {edu.coursework.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Professional Development */}
        {cv.certifications && cv.certifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Professional Development</Text>
            <View style={styles.sectionDivider} />
            {cv.certifications.map((cert, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <View style={styles.certHeader}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certDate}>{cert.date}</Text>
                </View>
                <Text style={styles.certIssuer}>{cert.issuer}</Text>
              </View>
            ))}
          </>
        )}

        {/* Projects */}
        {cv.projects && cv.projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Projects</Text>
            <View style={styles.sectionDivider} />
            {cv.projects.map((project, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  {project.dates && <Text style={styles.projectDate}>{project.dates}</Text>}
                </View>
                {project.url ? <Text style={styles.projectUrl}>{project.url}</Text> : null}
                <Text style={styles.projectDesc}>{project.description}</Text>
                {project.technologies && project.technologies.length > 0 && (
                  <Text style={styles.projectTech}>
                    <Text style={{ fontFamily: "Times-Bold" }}>Technologies: </Text>
                    {project.technologies.join(", ")}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* References */}
        {cv.references && cv.references.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>References</Text>
            <View style={styles.sectionDivider} />
            {cv.references.map((ref, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={styles.refName}>{ref.name}</Text>
                <Text style={styles.refDetail}>{ref.title} · {ref.company}</Text>
                {(ref.email || ref.phone) && (
                  <Text style={styles.refDetail}>{[ref.email, ref.phone].filter(Boolean).join("  ·  ")}</Text>
                )}
              </View>
            ))}
          </>
        )}

      </Page>
    </Document>
  );
}

export async function downloadPDF(cv: TailoredCV) {
  const blob = await pdf(<HarvardDoc cv={cv} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cv.name.replace(/\s+/g, "_")}_CV.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}