const fs = require('fs');
let code = fs.readFileSync('lib/jobs/auto-apply.ts', 'utf8');

const replacement = `            if (attrLower.includes("year") || attrLower.includes("experience")) {
              const valToType = profile.yearsOfExperience;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing years of experience in profile.\` };
            }
            else if (attrLower.includes("city") || attrLower.includes("loc")) {
              const valToType = profile.preferredLocations?.[0];
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing preferred location in profile.\` };
            }
            else if (attrLower.includes("salary") || attrLower.includes("pay") || attrLower.includes("ctc")) {
              const valToType = profile.expectedSalary;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing expected salary in profile.\` };
            }
            else if (attrLower.includes("github")) {
              const valToType = profile.githubUrl;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing github in profile.\` };
            }
            else if (attrLower.includes("portfolio") || attrLower.includes("website") || attrLower.includes("site")) {
              const valToType = profile.portfolioUrl;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing portfolio in profile.\` };
            }
            else if (attrLower.includes("linkedin")) {
              const valToType = profile.linkedinUrl;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing linkedin in profile.\` };
            }
            else if (attrLower.includes("notice") || attrLower.includes("period")) {
              const valToType = profile.noticePeriod;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing notice period in profile.\` };
            }
            else if (attrLower.includes("school") || attrLower.includes("college") || attrLower.includes("university")) {
              const valToType = profile.college || profile.school;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing school/college in profile.\` };
            }
            else if (attrLower.includes("company") || attrLower.includes("employer")) {
              return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] which is company/employer, and no mapping exists in profile.\` };
            }
            else if (attrLower.includes("birth") || attrLower.includes("dob")) {
              const valToType = profile.birthDate;
              if (valToType) { console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${valToType}\`); await input.type(valToType); }
              else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing birth date in profile.\` };
            }
            else if (attrLower === "age" || attrLower.includes(" age") || attrLower.includes("age ") || attrLower.includes("_age") || attrLower.includes("age_")) {
              if (profile.birthDate) {
                const age = Math.floor((new Date().getTime() - new Date(profile.birthDate).getTime()) / 31557600000).toString();
                console.log(\`[AutoApply] Typed field: [\${name || id}] Value: \${age}\`); await input.type(age);
              } else return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] missing birth date to calculate age.\` };
            }
            else if (attrLower.includes("country")) {
              return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] which asks for country, and no explicit country exists in profile.\` };
            }
            else if (type === "number") {
              return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] which is an unknown number field.\` };
            }
            else {
              console.log(\`[AutoApply] Unknown text field encountered: \${attrString}. System does not have a mapped value.\`);
              return { status: "failed", message: \`Failed because of field [label="\${label}", name="\${name}", id="\${id}"] which takes unknown input and the system does not have a value for it.\` };
            }`;

const regex = /if \(attrLower\.includes\("year"\) \|\| attrLower\.includes\("experience"\)\) \{[\s\S]*?return \{ status: "failed", message: `Failed because of field \[name="\$\{name\}", id="\$\{id\}"\] which takes unknown input and the system does not have a value for it\.` \};\n            \}/;

if(regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('lib/jobs/auto-apply.ts', code);
    console.log('Replaced text block successfully!');
} else {
    console.log('Could not find match for text block!');
}
