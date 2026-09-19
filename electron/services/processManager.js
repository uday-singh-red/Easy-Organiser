const { execFile } = require("child_process");

function getProcesses() {
  return new Promise((resolve, reject) => {
    execFile(
      "tasklist",
      ["/FO", "CSV", "/NH"],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);

        const processes = lines.map((line) => {
          const match = line.match(
            /^"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)"$/
          );

          if (!match) return null;

          const [, name, pid, sessionName, sessionNumber, memory] = match;

          return {
            name,
            pid: Number(pid),
            sessionName,
            sessionNumber: Number(sessionNumber),
            memory,
          };
        });

        resolve(processes.filter(Boolean));
      }
    );
  });
}

module.exports = {
  getProcesses,
};