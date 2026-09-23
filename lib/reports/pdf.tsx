import { Document, Page, StyleSheet, Text, renderToBuffer, View, Image, Link } from "@react-pdf/renderer";
import type { ApplicationReport } from "@/types/application";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: "#1e293b", fontFamily: "Helvetica", backgroundColor: "#f8fafc" },
  header: { marginBottom: 30, borderBottom: "2px solid #e2e8f0", paddingBottom: 15 },
  title: { fontSize: 26, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  statBox: { backgroundColor: "#ffffff", padding: 15, borderRadius: 8, width: "30%", border: "1px solid #e2e8f0" },
  statLabel: { fontSize: 10, color: "#64748b", textTransform: "uppercase" },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#0f172a", marginTop: 4 },
  
  chartsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  chartContainer: { width: "48%", backgroundColor: "#ffffff", padding: 10, borderRadius: 8, border: "1px solid #e2e8f0" },
  chartTitle: { fontSize: 12, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: "#334155" },
  chartImage: { width: "100%", height: 140 },

  section: { marginTop: 20, fontSize: 16, fontWeight: "bold", color: "#0f172a", marginBottom: 15 },
  
  table: { width: "100%", backgroundColor: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 12, borderBottom: "1px solid #e2e8f0" },
  tableRow: { flexDirection: "row", padding: 12, borderBottom: "1px solid #e2e8f0" },
  col1: { width: "40%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "20%" },
  thText: { fontSize: 10, fontWeight: "bold", color: "#475569", textTransform: "uppercase" },
  tdText: { fontSize: 10, color: "#334155" },
  
  statusApplied: { color: "#166534", fontWeight: "bold", backgroundColor: "#dcfce3", padding: "2 6", borderRadius: 4, alignSelf: "flex-start", fontSize: 9 },
  statusFailed: { color: "#991b1b", fontWeight: "bold", backgroundColor: "#fee2e2", padding: "2 6", borderRadius: 4, alignSelf: "flex-start", fontSize: 9 },
  
  linkApply: { color: "#2563eb", textDecoration: "none", fontSize: 10, fontWeight: "bold" },
  linkView: { color: "#0d9488", textDecoration: "none", fontSize: 10, fontWeight: "bold" }
});

function getChartUrl(type: string, labels: string[], data: number[], bgColors: string[]) {
  const chartConfig = {
    type: type,
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: bgColors }]
    },
    options: {
      plugins: { legend: { position: 'bottom' } }
    }
  };
  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=250`;
}

function ReportDocument({ report }: { report: ApplicationReport }) {
  const isWeekly = report.period === "weekly";
  
  const statusLabels = ['Applied', 'Failed', 'Skipped'];
  const statusData = [report.applied, report.failed, report.skipped];
  const statusColors = ['#10b981', '#ef4444', '#94a3b8'];
  const statusChartUrl = getChartUrl('pie', statusLabels, statusData, statusColors);

  const sourceLabels = Object.keys(report.bySource);
  const sourceData = Object.values(report.bySource);
  const sourceColors = sourceLabels.map(() => '#3b82f6');
  const sourceChartUrl = getChartUrl('bar', sourceLabels, sourceData, sourceColors);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{isWeekly ? "Weekly" : "Daily"} Application Report</Text>
          <Text style={styles.subtitle}>Generated on {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Jobs Found</Text>
            <Text style={styles.statValue}>{report.newRelevantJobs}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Successfully Applied</Text>
            <Text style={styles.statValue}>{report.applied}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Failed</Text>
            <Text style={styles.statValue}>{report.failed}</Text>
          </View>
        </View>

        <View style={styles.chartsRow}>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Application Status</Text>
            <Image style={styles.chartImage} src={statusChartUrl} />
          </View>
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Jobs by Source</Text>
            <Image style={styles.chartImage} src={sourceChartUrl} />
          </View>
        </View>

        <Text style={styles.section}>Job Details</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.col1}><Text style={styles.thText}>Job Title</Text></View>
            <View style={styles.col2}><Text style={styles.thText}>Company</Text></View>
            <View style={styles.col3}><Text style={styles.thText}>Status</Text></View>
            <View style={styles.col4}><Text style={styles.thText}>Action</Text></View>
          </View>
          
          {report.rows.length === 0 ? (
             <View style={styles.tableRow}>
                <Text style={styles.tdText}>No jobs processed in this period.</Text>
             </View>
          ) : (
            report.rows.map((row) => (
              <View key={row.id} style={styles.tableRow}>
                <View style={styles.col1}>
                  <Text style={styles.tdText}>{row.job.title}</Text>
                </View>
                <View style={styles.col2}>
                  <Text style={styles.tdText}>{row.job.company}</Text>
                </View>
                <View style={styles.col3}>
                  <Text style={row.status === "applied" ? styles.statusApplied : styles.statusFailed}>
                    {row.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.col4}>
                  {row.status === "applied" ? (
                    <Link src={row.job.applyUrl || "#"} style={styles.linkView}>
                      View Application
                    </Link>
                  ) : (
                    <Link src={row.job.applyUrl || "#"} style={styles.linkApply}>
                      Apply Manually
                    </Link>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function createReportPdf(report: ApplicationReport) {
  return renderToBuffer(<ReportDocument report={report} />);
}
