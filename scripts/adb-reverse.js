const { execFileSync } = require('child_process');

const ports = ['8081', '3002', '4000', '3000'];

function run(args) {
  execFileSync('adb', args, { stdio: 'inherit' });
}

function listDevices() {
  const output = execFileSync('adb', ['devices'], { encoding: 'utf8' });
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
}

const devices = listDevices();

if (!devices.length) {
  console.error('No adb devices connected');
  process.exit(1);
}

for (const serial of devices) {
  for (const port of ports) {
    try {
      run(['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`]);
    } catch (error) {
      // Best-effort per port; keep going for the rest of the stack.
    }
  }
}
