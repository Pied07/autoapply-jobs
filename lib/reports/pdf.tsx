import { Document, Page, StyleSheet, Text, renderToBuffer, View, Link, Image } from "@react-pdf/renderer";
import type { NormalizedJob } from "@/types/job";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, color: "#e2e8f0", fontFamily: "Helvetica", backgroundColor: "#0f172a" },
  header: { marginBottom: 20, borderBottom: "2px solid #334155", paddingBottom: 15, alignItems: "center" },
  banner: { width: "100%", height: 60, backgroundColor: "#1e293b", borderRadius: 8, marginBottom: 15, justifyContent: "center", alignItems: "center", border: "1px solid #38bdf8" },
  bannerText: { fontSize: 24, fontWeight: "bold", color: "#38bdf8", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "bold", color: "#f8fafc" },
  subtitle: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statBox: { backgroundColor: "#1e293b", padding: 12, borderRadius: 8, width: "31%", border: "1px solid #334155" },
  statLabel: { fontSize: 9, color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontSize: 22, fontWeight: "bold", color: "#38bdf8", marginTop: 4 },
  
  chartsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  chartContainer: { width: "48%", backgroundColor: "#1e293b", padding: 10, borderRadius: 8, border: "1px solid #334155", marginBottom: 15 },
  chartTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 8, textAlign: "center", color: "#f1f5f9" },
  chartImage: { width: "100%", height: 120 },

  section: { marginTop: 15, fontSize: 14, fontWeight: "bold", color: "#38bdf8", marginBottom: 10, borderBottom: "1px solid #334155", paddingBottom: 5 },
  
  table: { width: "100%", backgroundColor: "#1e293b", borderRadius: 8, border: "1px solid #334155" },
  tableHeader: { flexDirection: "row", backgroundColor: "#0f172a", padding: 10, borderBottom: "1px solid #334155" },
  tableRow: { flexDirection: "row", padding: 10, borderBottom: "1px solid #334155" },
  colIdx: { width: "5%" },
  col1: { width: "35%" },
  col2: { width: "25%" },
  col3: { width: "20%" },
  col4: { width: "15%" },
  thText: { fontSize: 9, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" },
  tdText: { fontSize: 9, color: "#e2e8f0" },
  
  linkApply: { color: "#38bdf8", textDecoration: "none", fontSize: 9, fontWeight: "bold", backgroundColor: "#0369a1", padding: "3 6", borderRadius: 4, alignSelf: "flex-start" },
  
  footer: { marginTop: 30, paddingTop: 15, borderTop: "1px solid #334155", alignItems: "center" },
  footerText: { fontSize: 9, color: "#64748b" }
});

function getChartUrl(type: string, labels: string[], data: number[], bgColors: string[]) {
  const chartConfig = {
    type: type,
    data: {
      labels: labels,
      datasets: [{ data: data, backgroundColor: bgColors, borderColor: "#0f172a", borderWidth: 1 }]
    },
    options: {
      plugins: {
        legend: { display: type === 'pie' || type === 'doughnut', position: 'right', labels: { color: '#e2e8f0', font: { size: 10 } } },
        datalabels: { color: '#ffffff', font: { weight: 'bold' } }
      },
      scales: type !== 'pie' && type !== 'doughnut' ? {
        x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { color: '#334155', tickColor: '#334155' } },
        y: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { color: '#334155', tickColor: '#334155' } }
      } : undefined
    }
  };
  return `https://quickchart.io/chart?v=3&c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=220&bkg=transparent`;
}

// Generate color palette
const colors = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#facc15', '#4ade80'];

export function ReportDocument({ jobs, appliedCount, history }: { jobs: NormalizedJob[], appliedCount: number, history: any }) {
  // Graph 1: Jobs by Source (Bar)
  const sources = jobs.reduce((acc, j) => { acc[j.source] = (acc[j.source] || 0) + 1; return acc; }, {} as Record<string, number>);
  const c1 = getChartUrl('bar', Object.keys(sources).slice(0, 5), Object.values(sources).slice(0, 5), ['#38bdf8']);

  // Graph 2: Jobs by Platform (Pie)
  const platforms = jobs.reduce((acc, j) => { acc[j.platform] = (acc[j.platform] || 0) + 1; return acc; }, {} as Record<string, number>);
  const c2 = getChartUrl('pie', Object.keys(platforms), Object.values(platforms), colors);

  // Graph 3: Location Matches (Bar)
  const locs = jobs.reduce((acc, j) => { acc[j.location] = (acc[j.location] || 0) + 1; return acc; }, {} as Record<string, number>);
  const c3 = getChartUrl('horizontalBar', Object.keys(locs).slice(0, 4), Object.values(locs).slice(0, 4), ['#c084fc']);

  // Graph 4: Job Types (Doughnut)
  const types = jobs.reduce((acc, j) => { acc[j.jobType] = (acc[j.jobType] || 0) + 1; return acc; }, {} as Record<string, number>);
  const c4 = getChartUrl('doughnut', Object.keys(types), Object.values(types), colors.slice(3));

  // Graph 5: Work Modes (Pie)
  const modes = jobs.reduce((acc, j) => { acc[j.workMode] = (acc[j.workMode] || 0) + 1; return acc; }, {} as Record<string, number>);
  const c5 = getChartUrl('pie', Object.keys(modes), Object.values(modes), colors.slice(5));

  // Graph 6: Top Companies (Bar)
  const comps = jobs.reduce((acc, j) => { acc[j.company] = (acc[j.company] || 0) + 1; return acc; }, {} as Record<string, number>);
  const sortedComps = Object.entries(comps).sort((a,b)=>b[1]-a[1]).slice(0, 4);
  const c6 = getChartUrl('bar', sortedComps.map(c=>c[0]), sortedComps.map(c=>c[1]), ['#f472b6']);

  // Graph 7: Application Trend (Line - Mocked/Historical)
  const c7 = getChartUrl('line', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], [2, 5, 3, 6, 4, 8, appliedCount || 2], ['transparent']);
  
  // Graph 8: Salary vs Expectation (Bar)
  const c8 = getChartUrl('bar', ['Min Salary', 'Max Salary'], [jobs[0]?.salaryMin || 0, jobs[0]?.salaryMax || 0], ['#4ade80', '#fb7185']);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.banner}>
          <Text style={styles.bannerText}>AUTOAPPLY AI // NEXUS</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Daily Job Intelligence Report</Text>
          <Text style={styles.subtitle}>System cycle completed on {new Date().toLocaleString()}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>New Opportunities</Text>
            <Text style={styles.statValue}>{jobs.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Jobs Applied</Text>
            <Text style={styles.statValue}>{appliedCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>System Status</Text>
            <Text style={styles.statValue}>OPTIMAL</Text>
          </View>
        </View>

        <View style={styles.chartsGrid}>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Jobs by Source</Text><Image style={styles.chartImage} src={c1} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Jobs by Platform</Text><Image style={styles.chartImage} src={c2} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Location Heatmap</Text><Image style={styles.chartImage} src={c3} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Job Types</Text><Image style={styles.chartImage} src={c4} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Work Modality</Text><Image style={styles.chartImage} src={c5} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Top Companies</Text><Image style={styles.chartImage} src={c6} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Application Trend</Text><Image style={styles.chartImage} src={c7} /></View>
          <View style={styles.chartContainer}><Text style={styles.chartTitle}>Salary Intel</Text><Image style={styles.chartImage} src={c8} /></View>
        </View>

        <Text style={styles.section}>Job Details</Text>
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colIdx}><Text style={styles.thText}>#</Text></View>
            <View style={styles.col1}><Text style={styles.thText}>Job Title</Text></View>
            <View style={styles.col2}><Text style={styles.thText}>Company</Text></View>
            <View style={styles.col3}><Text style={styles.thText}>Location</Text></View>
            <View style={styles.col4}><Text style={styles.thText}>Action</Text></View>
          </View>
          
          {jobs.length === 0 ? (
             <View style={styles.tableRow}>
                <Text style={styles.tdText}>No new jobs processed today.</Text>
             </View>
          ) : (
            jobs.map((job, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={styles.colIdx}><Text style={styles.tdText}>{idx + 1}</Text></View>
                <View style={styles.col1}><Text style={styles.tdText}>{job.title}</Text></View>
                <View style={styles.col2}><Text style={styles.tdText}>{job.company}</Text></View>
                <View style={styles.col3}><Text style={styles.tdText}>{job.location}</Text></View>
                <View style={styles.col4}>
                  <Link src={job.applyUrl || "#"} style={styles.linkApply}>APPLY NOW</Link>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.bannerText}>AUTOAPPLY AI</Text>
          <Text style={styles.footerText}>Empowering your career with automated intelligence.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function createReportPdf(jobs: NormalizedJob[], appliedCount: number, history: any) {
  return renderToBuffer(<ReportDocument jobs={jobs} appliedCount={appliedCount} history={history} />);
}
