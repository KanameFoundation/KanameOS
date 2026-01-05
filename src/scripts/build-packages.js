const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '../../');
const packagesDir = path.resolve(root, 'src/packages');

const buildPackage = (pkgPath) => {
  return new Promise((resolve, reject) => {
    console.log(`Building package in ${pkgPath}...`);
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'build'], {
      cwd: pkgPath,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
};

const run = async () => {
  if (!await fs.pathExists(packagesDir)) {
    console.log('No local packages directory found.');
    return;
  }

  const entries = await fs.readdir(packagesDir);
  for (const entry of entries) {
    const entryPath = path.join(packagesDir, entry);
    const stat = await fs.stat(entryPath);
    
    if (stat.isDirectory() && await fs.pathExists(path.join(entryPath, 'package.json'))) {
      try {
        await buildPackage(entryPath);
      } catch (e) {
        console.error(`Failed to build ${entry}:`, e);
        process.exit(1);
      }
    }
  }
};

run().catch(console.error);
