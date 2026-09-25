const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf-8');

code = code.replace(
  'const [dashboardStats, setDashboardStats] = useState({',
  'const [dashboardStats, setDashboardStats] = useState({ platforms: {}, locations: {}, types: {}, modes: {}, companies: {}, daily: [], salaries: {min:0, max:0},'
);

code = code.replace(
  'setDashboardStats({ newRelevant: 0, appliedToday: 0, failedToday: 0, sources: {} });',
  'setDashboardStats({ newRelevant: 0, appliedToday: 0, failedToday: 0, sources: {}, platforms: {}, locations: {}, types: {}, modes: {}, companies: {}, daily: [], salaries: {min:0, max:0} });'
);

const newLoad = `    const sources = todayRows.reduce((acc, row) => { acc[row.source] = (acc[row.source] || 0) + 1; return acc; }, {});
    const platforms = todayRows.reduce((acc, row) => { acc[row.platform] = (acc[row.platform] || 0) + 1; return acc; }, {});
    const locations = todayRows.reduce((acc, row) => { const loc = row.job?.location || 'Unknown'; acc[loc] = (acc[loc] || 0) + 1; return acc; }, {});
    const modes = todayRows.reduce((acc, row) => { const mode = row.job?.workMode || 'unknown'; acc[mode] = (acc[mode] || 0) + 1; return acc; }, {});
    const companies = todayRows.reduce((acc, row) => { const c = row.job?.company || 'Unknown'; acc[c] = (acc[c] || 0) + 1; return acc; }, {});
    
    // Aggregate by day of week for the past 7 days
    const dailyMap = {};
    recentRows.forEach(row => {
      const day = new Date(row.createdAt).toLocaleDateString('en-US', {weekday: 'short'});
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const daily = Object.entries(dailyMap).map(([day, jobs]) => ({ day, jobs }));

    const minS = todayRows.reduce((min, row) => Math.min(min, row.job?.salaryMin || Infinity), Infinity);
    const maxS = todayRows.reduce((max, row) => Math.max(max, row.job?.salaryMax || 0), 0);

    setDashboardStats({
      newRelevant: todayRows.length,
      appliedToday: todayRows.filter((row) => row.status === "applied").length,
      failedToday: todayRows.filter((row) => row.status === "failed").length,
      sources,
      platforms,
      locations,
      modes,
      companies,
      daily,
      salaries: { min: minS === Infinity ? 0 : minS, max: maxS }
    });`;

code = code.replace(
  /const sources = todayRows\.reduce\([\s\S]*?\}\);/m,
  newLoad
);

// Now update the UI block
const replacement = `
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Jobs By Platform</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(dashboardStats.platforms).map(([name, value]) => ({ name, value }))} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {Object.keys(dashboardStats.platforms).map((_, index) => <Cell key={index} fill={['#38bdf8', '#818cf8', '#c084fc', '#f472b6'][index % 4]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Daily Found Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardStats.daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="day" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="jobs" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Top Sources</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={Object.entries(dashboardStats.sources).map(([name, value]) => ({ name, value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="value" fill="#c084fc" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Work Modes</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.entries(dashboardStats.modes).map(([name, value]) => ({ name, value }))} dataKey="value" cx="50%" cy="50%" outerRadius={80}>
                        {Object.keys(dashboardStats.modes).map((_, index) => <Cell key={index} fill={['#f472b6', '#38bdf8', '#4ade80'][index % 3]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Location Heatmap</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={Object.entries(dashboardStats.locations).map(([loc, jobs]) => ({ loc, jobs }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="loc" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="jobs" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Salary Expectations</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{type:'Min', val: dashboardStats.salaries.min}, {type:'Max', val: dashboardStats.salaries.max}]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="type" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="val" fill="#fb7185" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Top Companies</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={Object.entries(dashboardStats.companies).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([name, v]) => ({ name, v }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                      <Bar dataKey="v" fill="#e879f9" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border border-[#1e293b] bg-[#0f172a] p-5 rounded-lg col-span-2">
                <h3 className="mb-4 text-lg font-semibold text-[#38bdf8]">Applied Status</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{name: "Applied", value: dashboardStats.appliedToday}, {name: "Pending", value: dashboardStats.newRelevant - dashboardStats.appliedToday}]} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
`;

const startStr = '<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">';
const endStr = '<div className="border border-[#d9e1ec] bg-white p-4 md:p-5">';
const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx > -1 && endIdx > -1) {
  code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
  fs.writeFileSync('app/page.tsx', code);
  console.log('Success');
} else {
  console.log('Could not find injection points. startIdx:', startIdx, 'endIdx:', endIdx);
}
