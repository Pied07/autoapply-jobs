import { Document, Page, StyleSheet, Text, renderToBuffer } from "@react-pdf/renderer";
import type { ApplicationReport } from "@/types/application";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: "#17202a" },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 700 },
  stat: { marginBottom: 6 },
  section: { marginTop: 18, fontSize: 15, fontWeight: 700 },
  row: { marginTop: 8, paddingTop: 8, borderTop: "1px solid #d6dde8" },
});

function ReportDocument({ report }: { report: ApplicationReport }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.period === "weekly" ? "Weekly" : "Daily"} Job Report</Text>
        <Text style={styles.stat}>New relevant jobs: {report.newRelevantJobs}</Text>
        <Text style={styles.stat}>Applied: {report.applied}</Text>
        <Text style={styles.stat}>Failed: {report.failed}</Text>
        <Text style={styles.stat}>Skipped: {report.skipped}</Text>
        <Text style={styles.section}>Channels</Text>
        <Text style={styles.stat}>Platform: {report.byChannel.platform}</Text>
        <Text style={styles.stat}>Company site: {report.byChannel.site}</Text>
        <Text style={styles.stat}>Email: {report.byChannel.email}</Text>
        <Text style={styles.section}>Platforms</Text>
        <Text style={styles.stat}>LinkedIn: {report.bySource.linkedin}</Text>
        <Text style={styles.stat}>Indeed: {report.bySource.indeed}</Text>
        <Text style={styles.stat}>Naukri: {report.bySource.naukri}</Text>
        <Text style={styles.section}>Applications</Text>
        {report.rows.map((row) => (
          <Text key={row.id} style={styles.row}>
            {row.job.title} at {row.job.company} - {row.status} through {row.channel} ({row.source})
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export async function createReportPdf(report: ApplicationReport) {
  return renderToBuffer(<ReportDocument report={report} />);
}
