const { spawn } = require('child_process');

function runProcess(command, args, options = {}) {
  const {
    cwd,
    input,
    timeoutMs = 5000
  } = options;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    console.log(`Spawning: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true
    });

    const timeout = setTimeout(() => {
      console.log('Timeout hit');
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      console.log('Error hit:', error);
      clearTimeout(timeout);
      resolve({
        code: -1,
        stdout,
        stderr: stderr || error.message,
        timedOut: false,
        spawnError: true
      });
    });

    child.on('close', (code) => {
      console.log('Close hit with code:', code);
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        timedOut,
        spawnError: false
      });
    });

    if (typeof input === 'string' && input.length > 0) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

(async () => {
  const res = await runProcess('g++.exe', ['test.cpp', '-std=c++17', '-O0', '-o', 'test.exe'], { timeoutMs: 15000 });
  console.log(res);
})();
