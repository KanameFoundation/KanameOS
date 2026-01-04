const fs = require('fs-extra');
const path = require('path');
const npm = require('../../package.json');

const root = path.resolve(__dirname, '../../');
const packagesFile = path.resolve(root, 'packages.json');
const metadataFile = path.resolve(root, 'dist/metadata.json');

const getPackagePaths = async () => {
  const paths = [];

  // 1. Scan node_modules
  const dependencies = [
    ...Object.keys(npm.dependencies || {}),
    ...Object.keys(npm.devDependencies || {})
  ];

  for (const dep of dependencies) {
    try {
      const pkgPath = path.resolve(root, 'node_modules', dep);
      const pkgJsonPath = path.join(pkgPath, 'package.json');
      
      if (await fs.pathExists(pkgJsonPath)) {
        const pkgJson = await fs.readJson(pkgJsonPath);
        if (pkgJson.osjs || (pkgJson.keywords && pkgJson.keywords.includes('osjs'))) {
           paths.push(pkgPath);
        }
      }
    } catch (e) {
      console.warn(`Failed to read package.json for ${dep}`, e);
    }
  }

  // 2. Scan local packages
  const localPackagesDir = path.resolve(root, 'src/packages');
  if (await fs.pathExists(localPackagesDir)) {
     const entries = await fs.readdir(localPackagesDir);
     for (const entry of entries) {
       const entryPath = path.join(localPackagesDir, entry);
       const stat = await fs.stat(entryPath);
       if (stat.isDirectory()) {
         if (await fs.pathExists(path.join(entryPath, 'metadata.json'))) {
            paths.push(entryPath);
         }
       }
     }
  }

  // 3. Scan userland packages
  const userPackagesDir = path.resolve(root, 'vfs/apps');
  if (await fs.pathExists(userPackagesDir)) {
     const entries = await fs.readdir(userPackagesDir);
     for (const entry of entries) {
       const entryPath = path.join(userPackagesDir, entry);
       const stat = await fs.stat(entryPath);
       if (stat.isDirectory()) {
         if (await fs.pathExists(path.join(entryPath, 'metadata.json'))) {
            paths.push(entryPath);
         }
       }
     }
  }

  return paths;
};

const run = async () => {
  console.log('Discovering packages...');
  const paths = await getPackagePaths();
  
  console.log(`Found ${paths.length} packages.`);
  await fs.writeJson(packagesFile, paths, { spaces: 2 });
  console.log(`Wrote ${packagesFile}`);

  const metadata = [];
  for (const pkgPath of paths) {
    const metaPath = path.join(pkgPath, 'metadata.json');
    if (await fs.pathExists(metaPath)) {
      try {
        const meta = await fs.readJson(metaPath);
        metadata.push(meta);

        const type = meta.type || 'application';
        const typeMap = {
          application: 'apps',
          theme: 'themes',
          icons: 'icons',
          sounds: 'sounds'
        };

        const targetDir = typeMap[type] || 'apps';
        const sourceDist = path.join(pkgPath, 'dist');
        const targetDist = path.resolve(root, 'dist', targetDir, meta.name);

        // Check if 'dist' exists, if not, check if files are in root (common for simple userland apps)
        let linkSource = sourceDist;
        if (!await fs.pathExists(sourceDist)) {
           // If no dist folder, assume the package root is the dist (for simple apps)
           // But we should verify if the main file exists there
           linkSource = pkgPath;
        }

        if (await fs.pathExists(linkSource)) {
          await fs.remove(targetDist);
          await fs.ensureDir(path.dirname(targetDist));
          await fs.ensureSymlink(linkSource, targetDist);
          console.log(`Linked ${meta.name} to ${targetDist} (from ${linkSource})`);
        }
      } catch (e) {
        console.warn(`Failed to read metadata for ${pkgPath}`, e);
      }
    }
  }

  await fs.writeJson(metadataFile, metadata);
  console.log(`Wrote ${metadataFile}`);
};

run().catch(console.error);
