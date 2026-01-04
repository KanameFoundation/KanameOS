const fs = require('fs-extra');
const path = require('path');
const {formidable} = require('formidable');
const AdmZip = require('adm-zip');

module.exports = (core, proc) => {
  const {route} = core.make('osjs/express');

  const processPackage = async (zipPath, cleanupCallback) => {
    try {
      const zip = new AdmZip(zipPath);
      const extractPath = path.resolve(process.cwd(), 'vfs/apps');
      const tempExtractPath = path.join(path.resolve(process.cwd(), 'vfs/tmp'), path.basename(zipPath, path.extname(zipPath)));
      
      await fs.ensureDir(path.dirname(tempExtractPath));

      // Extract to temp first to check metadata
      zip.extractAllTo(tempExtractPath, true);

      // Check if metadata.json is in root or in a subdirectory
      let packageRoot = tempExtractPath;
      let metadataPath = path.join(tempExtractPath, 'metadata.json');

      if (!await fs.pathExists(metadataPath)) {
        // Check if there is a single directory containing metadata.json
        const entries = await fs.readdir(tempExtractPath);
        if (entries.length === 1) {
          const subDir = path.join(tempExtractPath, entries[0]);
          if ((await fs.stat(subDir)).isDirectory()) {
            const subMetadataPath = path.join(subDir, 'metadata.json');
            if (await fs.pathExists(subMetadataPath)) {
              packageRoot = subDir;
              metadataPath = subMetadataPath;
            }
          }
        }
      }

      if (!await fs.pathExists(metadataPath)) {
         await fs.remove(tempExtractPath);
         if (cleanupCallback) await cleanupCallback();
         throw new Error('Invalid package: missing metadata.json');
      }

      const metadata = await fs.readJson(metadataPath);
      const packageName = metadata.name;
      
      if (!packageName) {
         await fs.remove(tempExtractPath);
         if (cleanupCallback) await cleanupCallback();
         throw new Error('Invalid package: missing name in metadata');
      }

      const finalPath = path.join(extractPath, packageName);
      
      // Remove existing package if it exists
      await fs.remove(finalPath);
      
      await fs.move(packageRoot, finalPath, {overwrite: true});
      
      // Cleanup temp and zip
      if (packageRoot !== tempExtractPath) {
         await fs.remove(tempExtractPath);
      }
      if (cleanupCallback) await cleanupCallback();

      // Reload packages on server
      await core.make('osjs/packages').load();

      // Notify client to refresh
      core.broadcast('osjs/packages:metadata:changed');

      return {success: true, name: packageName};
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const installPackage = async (req, res) => {
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      // Handle VFS path installation
      const { vfsPath } = req.body;
      if (!vfsPath) {
        return res.status(400).json({error: 'Missing vfsPath'});
      }

      // Convert VFS path to real path
      // Assuming vfsPath is like 'home:/Downloads/app.wpk' or 'osjs:/...'
      // We need to resolve this.
      // Since we are on the server, we can use the VFS service to resolve it, or just manual mapping if we know the structure.
      // The VFS service provider is registered.
      // But resolving VFS paths to real paths on the server side might be tricky if we don't use the VFS adapter directly.
      // However, for 'home:/', it maps to 'vfs/home/{username}'.
      // Let's assume the client sends the real path or we can resolve it.
      // Actually, the client can read the file as a Blob and upload it, which is easier and reuses the upload logic.
      // BUT, the user asked to "open wpk", which implies the file is already on the server (in VFS).
      // So uploading it again (downloading to client then uploading) is inefficient.
      
      // Let's try to resolve the path.
      // req.session.user.username is available.
      const username = req.session.user.username;
      let realPath;
      
      if (vfsPath.startsWith('home:/')) {
        realPath = path.resolve(process.cwd(), 'vfs', username, vfsPath.replace('home:/', ''));
      } else if (vfsPath.startsWith('system:/')) {
        realPath = path.resolve(process.cwd(), 'dist', vfsPath.replace('system:/', ''));
      } else {
         return res.status(400).json({error: 'Unsupported VFS mountpoint'});
      }

      if (!await fs.pathExists(realPath)) {
        return res.status(404).json({error: 'File not found'});
      }

      try {
        const result = await processPackage(realPath, async () => {
           // Do not delete the source file when installing from VFS!
        });
        res.json(result);
      } catch (e) {
        res.status(500).json({error: e.message});
      }

      return;
    }

    const form = formidable({
      uploadDir: path.resolve(process.cwd(), 'vfs/tmp'),
      keepExtensions: true
    });

    await fs.ensureDir(form.uploadDir);

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({error: 'Upload failed'});
      }

      const file = files.package ? files.package[0] : null;
      if (!file) {
        return res.status(400).json({error: 'No file uploaded'});
      }

      try {
        const result = await processPackage(file.filepath, async () => {
          await fs.remove(file.filepath);
        });
        res.json(result);
      } catch (e) {
        res.status(500).json({error: e.message});
      }
    });
  };

  const uninstallPackage = async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({error: 'Missing package name'});
    }

    const packagePath = path.resolve(process.cwd(), 'vfs/apps', name);
    
    // Security check: ensure we are only deleting from vfs/apps
    if (!packagePath.startsWith(path.resolve(process.cwd(), 'vfs/apps'))) {
       return res.status(403).json({error: 'Invalid package path'});
    }

    if (!await fs.pathExists(packagePath)) {
      return res.status(404).json({error: 'Package not found'});
    }

    try {
      await fs.remove(packagePath);
      
      // Remove from memory
      core.make('osjs/packages').removePackage(name);
      
      // Notify client to refresh
      core.broadcast('osjs/packages:metadata:changed');
      
      res.json({success: true});
    } catch (e) {
      console.error(e);
      res.status(500).json({error: e.message});
    }
  };

  route('POST', '/apps/AppManager/install', installPackage);
  route('POST', '/apps/AppManager/uninstall', uninstallPackage);

  return {
    init: async () => {}
  };
};
