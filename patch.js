const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf-8');

if (!content.includes('recharts')) {
  content = content.replace('import { FormEvent,', 'import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";\nimport { FormEvent,');
}

const toggleHtml = `
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={profile.autoApplyEnabled || false} 
                  onChange={(e) => setProfile({ ...profile, autoApplyEnabled: e.target.checked })} 
                  className="h-5 w-5 cursor-pointer accent-[#245b59]" 
                />
                <span className="text-sm font-medium">Enable Automatic Application Cron</span>
              </div>
`;

content = content.replace(
  '<button onClick={saveProfile} className="h-11 w-fit rounded-md bg-[#245b59] px-5 font-semibold text-white">Save and enable automation</button>',
  toggleHtml + '              <button onClick={saveProfile} className="h-11 w-fit rounded-md bg-[#245b59] px-5 font-semibold text-white">Save profile</button>'
);

// We need to split the applications table into Applied and Failed
// Let's replace the whole block starting from `<div className="flex flex-wrap items-center justify-between gap-3">` under `applications` heading
// and the entire `{applications.length === 0 ? ... : ...}` block

const appliedApps = "const applied = applications.filter(a => a.status === 'applied');";
const failedApps = "const failed = applications.filter(a => a.status === 'failed');";

const chartHtml = `
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="border border-[#d9e1ec] bg-white p-5">
                <h3 className="mb-4 text-lg font-semibold">Today's Applications</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Applied', value: dashboardStats.appliedToday, color: '#245b59' },
                          { name: 'Failed', value: dashboardStats.failedToday, color: '#9b1c1c' },
                          { name: 'Pending/Other', value: Math.max(0, dashboardStats.newRelevant - dashboardStats.appliedToday - dashboardStats.failedToday), color: '#cfd8e5' }
                        ]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {[
                          { name: 'Applied', value: dashboardStats.appliedToday, color: '#245b59' },
                          { name: 'Failed', value: dashboardStats.failedToday, color: '#9b1c1c' },
                          { name: 'Pending/Other', value: Math.max(0, dashboardStats.newRelevant - dashboardStats.appliedToday - dashboardStats.failedToday), color: '#cfd8e5' }
                        ].map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
`;

const ApplicationTableTemplate = `
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#d9e1ec] text-[#607083]">
                            <th className="py-3 pr-4 font-medium">Job</th>
                            <th className="py-3 pr-4 font-medium">Company</th>
                            <th className="py-3 pr-4 font-medium">Source</th>
                            <th className="py-3 pr-4 font-medium">Applied at</th>
                            <th className="py-3 pr-4 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {APP_LIST.map((application) => {
                            const action = applicationAction(application);
                            return (
                              <tr key={application.id} className="border-b border-[#edf1f6]">
                                <td className="py-3 pr-4 font-medium text-[#17202a]">{application.job.title}</td>
                                <td className="py-3 pr-4 text-[#4b5b6c]">{application.job.company}</td>
                                <td className="py-3 pr-4 text-[#4b5b6c]">{application.source}</td>
                                <td className="py-3 pr-4 text-[#4b5b6c]">{new Date(application.createdAt).toLocaleString()}</td>
                                <td className="py-3 pr-4">
                                  {action.disabled ? (
                                    <button disabled className="rounded-md border border-[#d9e1ec] px-3 py-2 text-xs font-medium text-[#8a98aa]">No link</button>
                                  ) : (
                                    <a href={action.href} target="_blank" rel="noreferrer" className="inline-flex rounded-md border border-[#b9c7d8] px-3 py-2 text-xs font-medium">
                                      {action.label}
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
`;

const appliedTable = ApplicationTableTemplate.replace('APP_LIST', 'applications.filter(a => a.status === "applied")');
const failedTable = ApplicationTableTemplate.replace('APP_LIST', 'applications.filter(a => a.status === "failed")');

const newApplicationsSection = \`
            \${chartHtml}
            <div className="border border-[#d9e1ec] bg-white p-4 md:p-5">
              <h3 className="text-lg font-semibold text-[#245b59] mb-4">Successfully Applied Jobs</h3>
              {applications.filter(a => a.status === "applied").length === 0 ? (
                <p className="text-sm text-[#4b5b6c]">No successful applications yet.</p>
              ) : (
                \${appliedTable}
              )}
            </div>

            <div className="border border-[#d9e1ec] bg-white p-4 md:p-5 mt-5">
              <h3 className="text-lg font-semibold text-[#9b1c1c] mb-4">Failed Applications (Manual Apply Required)</h3>
              {applications.filter(a => a.status === "failed").length === 0 ? (
                <p className="text-sm text-[#4b5b6c]">No failed applications.</p>
              ) : (
                \${failedTable}
              )}
            </div>
\`;

// Find the applications section
const startIndex = content.indexOf('<div className="border border-[#d9e1ec] bg-white p-4 md:p-5">');
const endIndex = content.indexOf('<div className="border border-[#d9e1ec] bg-white p-5">', startIndex); // The "Saved profile" section
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newApplicationsSection + content.substring(endIndex);
}

fs.writeFileSync('app/page.tsx', content);
console.log('Patched layout');
