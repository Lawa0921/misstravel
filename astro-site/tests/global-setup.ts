import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');

export default function globalSetup() {
  rmSync(join(projectDir, 'dist'), { recursive: true, force: true });
  rmSync(join(projectDir, '.vercel', 'output'), { recursive: true, force: true });

  execSync('npm run build', {
    cwd: projectDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      ASTRO_TELEMETRY_DISABLED: '1',
    },
  });
}
