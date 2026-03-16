import { Document, Page, Text, View, StyleSheet, pdf, Font } from "@react-pdf/renderer";
import { TailoredCV } from "./types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  contact: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", marginBottom: 6, marginTop: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginBottom: 10 },
  summary: { fontSize: 10, color: "#374151", lineHeight: 1.6, marginBottom: 4 },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  jobTitle: { fontWeight: "bold", fontSize: 10 },
  jobCompany: { fontSize: 9, color: "#6b7280", marginBottom: 3 },
  jobDate: { fontSize: 9, color: "#9ca3af" },
  bullet: { fontSize: 9, color: "#374151", marginBottom: 2, paddingLeft: 8 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  skill: { fontSize: 8, backgroundColor: "#f3f4f6", color: "#374151", padding: "3 6", borderRadius: 4 },
  eduHeader: { flexDirection: "row", justifyContent: "space-between" },
  eduDegree: { fontWeight: "bold", fontSize: 10 },
  eduInstitution: { fontSize: 9, color: "#6b7280" },
  eduDate: { fontSize: 9, color: "#9ca3af" },
});

const modernStyles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a", flexDirection: "row" },
  sidebar: { width: "33%", backgroundColor: "#4f46e5", padding: 24, color: "white" },
  main: { flex: 1, padding: 24 },
  name: { fontSize: 16, fontWeight: "bold", color: "#4f46e5", marginBottom: 4 },
  sideLabel: { fontSize: 7, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7, marginBottom: 4 },
  sideText: { fontSize: 9, opacity: 0.9, marginBottom: 2 },
  sectionTitle: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1.5, color: "#9ca3af", marginBottom: 6, marginTop: 12 },
  jobTitle: { fontWeight: "bold", fontSize: 10 },
  jobCompany: { fontSize: 9, color: "#6366f1", marginBottom: 3 },
  bullet: { fontSize: 9, color: "#374151", marginBottom: 2, paddingLeft: 8 },
  skill: { fontSize: 8, opacity: 0.9, marginBottom: 2 },
});

const minimalStyles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  name: { fontSize: 22, fontWeight: "normal", marginBottom: 4, letterSpacing: -0.5 },
  contact: { fontSize: 9, color: "#9ca3af", marginBottom: 24 },
  row: { flexDirection: "row", gap: 16, marginBottom: 12 },
  dateCol: { width: 40, textAlign: "right", color: "#d1d5db", fontSize: 9, paddingTop: 1 },
  jobTitle: { fontWeight: "bold", fontSize: 10 },
  jobCompany: { fontSize: 9, color: "#9ca3af" },
  bullet: { fontSize: 9, color: "#6b7280", marginBottom: 2 },
});

const sharpStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", backgroundColor: "#0a0a0a", color: "white" },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  contact: { fontSize: 9, color: "#ef4444", marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1.5, color: "#ef4444", marginBottom: 8, marginTop: 14 },
  jobRow: { borderLeftWidth: 1, borderLeftColor: "#262626", paddingLeft: 8, marginBottom: 10 },
  jobHeader: { flexDirection: "row", justifyContent: "space-between" },
  jobTitle: { fontWeight: "bold", color: "white", fontSize: 10 },
  jobCompany: { fontSize: 9, color: "#f87171", marginBottom: 3 },
  jobDate: { fontSize: 9, color: "#6b7280" },
  bullet: { fontSize: 9, color: "#9ca3af", marginBottom: 2 },
  skillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  skill: { fontSize: 8, backgroundColor: "#1a1a1a", color: "#d1d5db", padding: "3 6", borderRadius: 3 },
});

function ClassicDoc({ cv }: { cv: TailoredCV }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{cv.name}</Text>
        <Text style={styles.contact}>{[cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(" · ")}</Text>
        <View style={styles.divider} />
        {cv.summary && (<><Text style={styles.sectionTitle}>Summary</Text><Text style={styles.summary}>{cv.summary}</Text></>)}
        <Text style={styles.sectionTitle}>Experience</Text>
        {cv.experience?.map((job, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobTitle}>{job.title} — {job.company}</Text>
              <Text style={styles.jobDate}>{job.dates}</Text>
            </View>
            {job.bullets.map((b, j) => <Text key={j} style={styles.bullet}>· {b}</Text>)}
          </View>
        ))}
        <Text style={styles.sectionTitle}>Education</Text>
        {cv.education?.map((edu, i) => (
          <View key={i} style={{ marginBottom: 6 }}>
            <View style={styles.eduHeader}>
              <View><Text style={styles.eduDegree}>{edu.degree}</Text><Text style={styles.eduInstitution}>{edu.institution}</Text></View>
              <Text style={styles.eduDate}>{edu.dates}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsRow}>
          {cv.skills?.map((s, i) => <Text key={i} style={styles.skill}>{s}</Text>)}
        </View>
      </Page>
    </Document>
  );
}

function ModernDoc({ cv }: { cv: TailoredCV }) {
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        <View style={modernStyles.sidebar}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: "white", marginBottom: 4 }}>{cv.name}</Text>
          <Text style={modernStyles.sideLabel}>Contact</Text>
          <Text style={modernStyles.sideText}>{cv.email}</Text>
          <Text style={modernStyles.sideText}>{cv.phone}</Text>
          <Text style={{ ...modernStyles.sideText, marginBottom: 12 }}>{cv.location}</Text>
          <Text style={modernStyles.sideLabel}>Skills</Text>
          {cv.skills?.map((s, i) => <Text key={i} style={modernStyles.skill}>{s}</Text>)}
        </View>
        <View style={modernStyles.main}>
          <Text style={modernStyles.name}>{cv.name}</Text>
          {cv.summary && <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 12 }}>{cv.summary}</Text>}
          <Text style={modernStyles.sectionTitle}>Experience</Text>
          {cv.experience?.map((job, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={modernStyles.jobTitle}>{job.title}</Text>
              <Text style={modernStyles.jobCompany}>{job.company} · {job.dates}</Text>
              {job.bullets.map((b, j) => <Text key={j} style={modernStyles.bullet}>· {b}</Text>)}
            </View>
          ))}
          <Text style={modernStyles.sectionTitle}>Education</Text>
          {cv.education?.map((edu, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: "bold", fontSize: 10 }}>{edu.degree}</Text>
              <Text style={{ fontSize: 9, color: "#6b7280" }}>{edu.institution} · {edu.dates}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

function MinimalDoc({ cv }: { cv: TailoredCV }) {
  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <Text style={minimalStyles.name}>{cv.name}</Text>
        <Text style={minimalStyles.contact}>{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ")}</Text>
        {cv.summary && <Text style={{ fontSize: 10, color: "#6b7280", marginBottom: 20 }}>{cv.summary}</Text>}
        {cv.experience?.map((job, i) => (
          <View key={i} style={minimalStyles.row}>
            <Text style={minimalStyles.dateCol}>{job.dates.split("–")[0]?.trim()}</Text>
            <View style={{ flex: 1 }}>
              <Text style={minimalStyles.jobTitle}>{job.title}, <Text style={{ fontWeight: "normal", color: "#9ca3af" }}>{job.company}</Text></Text>
              {job.bullets.map((b, j) => <Text key={j} style={minimalStyles.bullet}>{b}</Text>)}
            </View>
          </View>
        ))}
        {cv.education?.map((edu, i) => (
          <View key={i} style={minimalStyles.row}>
            <Text style={minimalStyles.dateCol}>{edu.dates}</Text>
            <View style={{ flex: 1 }}>
              <Text style={minimalStyles.jobTitle}>{edu.degree}</Text>
              <Text style={{ fontSize: 9, color: "#9ca3af" }}>{edu.institution}</Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}

function SharpDoc({ cv }: { cv: TailoredCV }) {
  return (
    <Document>
      <Page size="A4" style={sharpStyles.page}>
        <Text style={sharpStyles.name}>{cv.name}</Text>
        <Text style={sharpStyles.contact}>{[cv.email, cv.phone, cv.location].filter(Boolean).join(" · ")}</Text>
        {cv.summary && (<><Text style={sharpStyles.sectionTitle}>Summary</Text><Text style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4 }}>{cv.summary}</Text></>)}
        <Text style={sharpStyles.sectionTitle}>Experience</Text>
        {cv.experience?.map((job, i) => (
          <View key={i} style={sharpStyles.jobRow}>
            <View style={sharpStyles.jobHeader}>
              <Text style={sharpStyles.jobTitle}>{job.title}</Text>
              <Text style={sharpStyles.jobDate}>{job.dates}</Text>
            </View>
            <Text style={sharpStyles.jobCompany}>{job.company}</Text>
            {job.bullets.map((b, j) => <Text key={j} style={sharpStyles.bullet}>· {b}</Text>)}
          </View>
        ))}
        <Text style={sharpStyles.sectionTitle}>Education</Text>
        {cv.education?.map((edu, i) => (
          <View key={i} style={{ marginBottom: 6 }}>
            <Text style={{ fontWeight: "bold", color: "white", fontSize: 10 }}>{edu.degree}</Text>
            <Text style={{ fontSize: 9, color: "#9ca3af" }}>{edu.institution} · {edu.dates}</Text>
          </View>
        ))}
        <Text style={sharpStyles.sectionTitle}>Skills</Text>
        <View style={sharpStyles.skillRow}>
          {cv.skills?.map((s, i) => <Text key={i} style={sharpStyles.skill}>{s}</Text>)}
        </View>
      </Page>
    </Document>
  );
}

export const docComponents: Record<string, React.ComponentType<{ cv: TailoredCV }>> = {
  classic: ClassicDoc,
  modern: ModernDoc,
  minimal: MinimalDoc,
  sharp: SharpDoc,
};

export async function downloadPDF(cv: TailoredCV, templateId: string) {
  const DocComponent = docComponents[templateId];
  if (!DocComponent) return;
  const blob = await pdf(<DocComponent cv={cv} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${cv.name.replace(/\s+/g, "_")}_CV.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}