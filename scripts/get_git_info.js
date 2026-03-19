const { execSync } = require('child_process');
const fs = require('fs');
try {
  const status = execSync('git status').toString();
  const branch = execSync('git branch').toString();
  const log = execSync('git log -n 1').toString();
  fs.writeFileSync('git_info.txt', `STATUS:\n${status}\nBRANCH:\n${branch}\nLOG:\n${log}`);
  console.log("Git info written");
} catch (e) {
  console.error(e);
}
