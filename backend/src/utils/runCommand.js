const { execFile, spawn } = require("child_process");

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: options.timeout || 60000,
        cwd: options.cwd || undefined,
        maxBuffer: 1024 * 1024 * 10,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(stderr || error.message);
          return;
        }

        resolve(stdout);
      }
    );
  });
}

function runCommandWithInput(command, args, input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd || undefined });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill();
      reject("Command timed out");
    }, options.timeout || 60000);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error.message);
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(stderr || `Command exited with code ${code}`);
        return;
      }

      resolve(stdout);
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

module.exports = { runCommand, runCommandWithInput };
