const { execFile, spawn } = require("child_process");

const DEFAULT_TIMEOUT = 60000;
const MAX_BUFFER = 1024 * 1024 * 10;

/**
 * An Error carrying everything known about a failed command.
 *
 * The previous version rejected with a bare string, which discarded the
 * exit code and the stack and left `error.message` undefined in every
 * catch block. Carrying the detail as properties means a caller can log
 * the full output while still showing the user one readable line.
 */
class CommandError extends Error {
  constructor(message, details = {}) {
    super(message);

    this.name = "CommandError";
    this.command = details.command;
    this.args = details.args;
    this.exitCode = details.exitCode ?? null;
    this.timedOut = details.timedOut ?? false;
    this.stdout = details.stdout ?? "";
    this.stderr = details.stderr ?? "";

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandError);
    }
  }
}

/**
 * Returns the last non-empty line of a stream.
 *
 * Git and Docker write progress to stderr even on success, so the first
 * line of a failure is usually "Cloning into '...'" rather than the
 * reason. The reason is written last. Carriage returns are handled
 * because progress bars overwrite a single line with \r rather than
 * starting new ones.
 *
 * Taking the last line rather than filtering known progress prefixes:
 * filtering needs a pattern list per program and rots as tools change
 * their output. Ordering is a property of how programs write.
 */
function lastMeaningfulLine(text) {
  if (!text) {
    return "";
  }

  const lines = text
    .split("\n")
    .map((line) => line.split("\r").pop().trim())
    .filter(Boolean);

  return lines.length ? lines[lines.length - 1] : "";
}

/**
 * Builds the one-line message shown to the user.
 * Three failure modes, because they need different wording:
 * the binary is missing, the command timed out, or it exited non-zero.
 */
function describeFailure({ command, error, stderr, timeoutMs, timedOut }) {
  if (error && error.code === "ENOENT") {
    return `${command} is not installed or not available on PATH`;
  }

  if (timedOut || (error && error.killed)) {
    const seconds = Math.round(timeoutMs / 1000);
    return `${command} timed out after ${seconds}s`;
  }

  const detail = lastMeaningfulLine(stderr);

  if (detail) {
    return detail;
  }

  return error?.message || `${command} failed`;
}

/**
 * Runs a command and resolves with its stdout.
 * Rejects with a CommandError on any failure.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{timeout?: number, cwd?: string}} options
 * @returns {Promise<string>}
 */
function runCommand(command, args, options = {}) {
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT;

  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        timeout: timeoutMs,
        cwd: options.cwd || undefined,
        maxBuffer: MAX_BUFFER,
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }

        const message = describeFailure({
          command,
          error,
          stderr,
          timeoutMs,
          timedOut: Boolean(error.killed),
        });

        reject(
          new CommandError(message, {
            command,
            args,
            // execFile puts the exit code in `code`, but uses the same
            // field for spawn failures like ENOENT, so only a number is
            // an exit code.
            exitCode: typeof error.code === "number" ? error.code : null,
            timedOut: Boolean(error.killed),
            stdout,
            stderr,
          })
        );
      }
    );
  });
}

/**
 * Runs a command, writing `input` to its stdin, and resolves with stdout.
 *
 * Used for `docker login --password-stdin`: passing a token as a
 * command-line argument would expose it via `ps aux` and shell history.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {string} input
 * @param {{timeout?: number, cwd?: string}} options
 * @returns {Promise<string>}
 */
function runCommandWithInput(command, args, input, options = {}) {
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd || undefined });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    const fail = (error, exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);

      const message = describeFailure({
        command,
        error,
        stderr,
        timeoutMs,
        timedOut,
      });

      reject(
        new CommandError(message, {
          command,
          args,
          exitCode: exitCode ?? null,
          timedOut,
          stdout,
          stderr,
        })
      );
    };

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      fail(error, null);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      if (timedOut || code !== 0) {
        fail(null, code);
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(stdout);
    });

    // Writing to stdin can fail if the process already exited, for
    // example when the binary does not exist. The error event above
    // handles the rejection, so this only needs to not throw.
    child.stdin.on("error", () => {});
    child.stdin.write(input);
    child.stdin.end();
  });
}

module.exports = { runCommand, runCommandWithInput, CommandError };
