/**
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */

const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const AdmZip = require('adm-zip');
const { formidable } = require('formidable');
const { ServiceProvider } = require('../../common/service-provider.js');
const Packages = require('../packages');
const { closeWatches } = require('../utils/core');
const checkPrivilege = require('../utils/privilege');

/**
 * OS.js Package Service Provider
 */
class PackageServiceProvider extends ServiceProvider {
  /**
   * Helper to process a package install
   */
  /**
   * Helper to process a package install
   */
  async processPackage(zipPath) {
    const core = this.core;
    try {
      const zip = new AdmZip(zipPath);
      const extractPath = path.resolve(core.configuration.vfs.root, "apps");
      const tempExtractPath = path.join(
        path.resolve(core.configuration.vfs.root, "tmp"),
        path.basename(zipPath, path.extname(zipPath))
      );

      await fs.ensureDir(path.dirname(tempExtractPath));
      zip.extractAllTo(tempExtractPath, true);

      let packageRoot = tempExtractPath;
      let metadataPath = path.join(tempExtractPath, "metadata.json");

      if (!(await fs.pathExists(metadataPath))) {
        const entries = await fs.readdir(tempExtractPath);
        if (entries.length === 1) {
          const subDir = path.join(tempExtractPath, entries[0]);
          if ((await fs.stat(subDir)).isDirectory()) {
            const subMetadataPath = path.join(subDir, "metadata.json");
            if (await fs.pathExists(subMetadataPath)) {
              packageRoot = subDir;
              metadataPath = subMetadataPath;
            }
          }
        }
      }

      if (!(await fs.pathExists(metadataPath))) {
        await fs.remove(tempExtractPath);
        throw new Error("Invalid package: missing metadata.json");
      }

      const metadata = await fs.readJson(metadataPath);
      const packageName = metadata.name;

      if (!packageName) {
        await fs.remove(tempExtractPath);
        throw new Error("Invalid package: missing name in metadata");
      }

      // Check if package exists and remove it first (clean update)
      const finalPath = path.join(extractPath, packageName);
      if (await fs.pathExists(finalPath)) {
        await fs.remove(finalPath);
        try {
          await this.packages.removePackage(packageName);
        } catch (e) { }
      }

      await fs.move(packageRoot, finalPath, { overwrite: true });

      if (packageRoot !== tempExtractPath) {
        await fs.remove(tempExtractPath);
      }

      // Handle Global Dist Linking - REMOVED
      // We rely on the server's ability to serve directly from vfs/apps via localDist lookup.

      // Reload packages
      await this.packages.load();
      this.core.broadcast("osjs/packages:metadata:changed");
      await this.packages.save();

      return { success: true, name: packageName };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * Helper to inspect a package file
   */
  async inspectPackage(vfsPath, username) {
    const core = this.core;
    let realPath;

    if (vfsPath.startsWith("home:/")) {
      realPath = path.resolve(
        core.configuration.vfs.root,
        "users",
        username,
        vfsPath.replace("home:/", "")
      );

    } else if (vfsPath.startsWith("tmp:/")) {
      realPath = path.resolve(
        core.configuration.vfs.root,
        "tmp",
        vfsPath.replace("tmp:/", "")
      );
    } else {
      throw new Error("Unsupported VFS mountpoint");
    }

    if (!(await fs.pathExists(realPath))) {
      throw new Error("File not found");
    }

    try {
      const zip = new AdmZip(realPath);
      const tempExtractPath = path.join(
        path.resolve(core.configuration.vfs.root, "tmp"),
        "inspect-" + Date.now()
      );

      await fs.ensureDir(tempExtractPath);
      zip.extractAllTo(tempExtractPath, true);

      let metadataPath = path.join(tempExtractPath, "metadata.json");

      if (!(await fs.pathExists(metadataPath))) {
        const entries = await fs.readdir(tempExtractPath);
        if (entries.length === 1) {
          const subDir = path.join(tempExtractPath, entries[0]);
          if ((await fs.stat(subDir)).isDirectory()) {
            const subMetadataPath = path.join(subDir, "metadata.json");
            if (await fs.pathExists(subMetadataPath)) {
              metadataPath = subMetadataPath;
            }
          }
        }
      }

      if (!(await fs.pathExists(metadataPath))) {
        await fs.remove(tempExtractPath);
        throw new Error("Invalid package: missing metadata.json");
      }

      const metadata = await fs.readJson(metadataPath);
      await fs.remove(tempExtractPath);

      return metadata;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  constructor(core) {
    super(core);

    const { configuration } = this.core;
    const pkgMetadata = configuration.packages.metadata;
    const manifestFile = path.isAbsolute(pkgMetadata)
      ? pkgMetadata
      : path.join(configuration.public, pkgMetadata);

    this.watches = [];
    this.packages = new Packages(core, {
      manifestFile
    });
  }

  provides() {
    return [
      'osjs/packages'
    ];
  }

  init() {
    this.core.singleton('osjs/packages', () => this.packages);

    const { app } = this.core;
    const serve = (req, res) => {
      const { name } = req.params;
      const pkg = this.packages.packages.find(p => p.metadata.name === name);

      if (pkg) {
        const filename = req.params[0];
        const type = pkg.metadata.type || 'application';
        const typeMap = {
          application: 'apps',
          theme: 'themes',
          icons: 'icons',
          sounds: 'sounds'
        };
        const targetDir = typeMap[type] || 'apps';

        // Serve directly from the package's dist directory (localDist)
        const localDist = path.join(path.dirname(pkg.filename), 'dist');

        res.sendFile(filename, { root: localDist }, (err) => {
          if (err) {
            res.status(404).send('Not found');
          }
        });
      } else {
        res.status(404).send('Not found');
      }
    };

    app.get('/apps/:name/*', serve);
    app.get('/themes/:name/*', serve);
    app.get('/icons/:name/*', serve);
    app.get('/sounds/:name/*', serve);

    app.get('/packages', (req, res) => {
      const metadata = this.packages.packages.map(p => p.metadata);
      res.json(metadata);
    });

    app.post('/packages/inspect', async (req, res) => {
      const { vfsPath } = req.body;
      if (!vfsPath) return res.status(400).json({ error: "Missing vfsPath" });

      try {
        const metadata = await this.inspectPackage(vfsPath, req.session.user.username);
        res.json(metadata);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.post('/packages/install', async (req, res) => {
      if (!(await checkPrivilege(this.core, req, res))) return;

      // 1. Handle JSON request (Install from VFS path)
      if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        const { vfsPath } = req.body;
        if (!vfsPath) return res.status(400).json({ error: "Missing vfsPath" });

        const username = req.session.user.username;
        const core = this.core;
        let realPath;

        if (vfsPath.startsWith("home:/")) {
          realPath = path.resolve(core.configuration.vfs.root, "users", username, vfsPath.replace("home:/", ""));

        } else if (vfsPath.startsWith("tmp:/")) {
          realPath = path.resolve(core.configuration.vfs.root, "tmp", vfsPath.replace("tmp:/", ""));
        } else {
          return res.status(400).json({ error: "Unsupported VFS mountpoint" });
        }

        if (!(await fs.pathExists(realPath))) {
          return res.status(404).json({ error: "File not found" });
        }

        try {
          // Determine if we should delete the file after install (only for tmp)
          const shouldDelete = vfsPath.startsWith("tmp:/");
          const result = await this.processPackage(realPath);

          if (shouldDelete) {
            await fs.remove(realPath);
          }

          res.json(result);
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
        return;
      }
      const form = formidable({
        uploadDir: path.resolve(this.core.configuration.vfs.root, "tmp"),
        keepExtensions: true,
      });

      await fs.ensureDir(form.uploadDir);

      form.parse(req, async (err, fields, files) => {
        if (err) return res.status(500).json({ error: "Upload failed" });

        const file = files.package ? files.package[0] : null;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        try {
          const result = await this.processPackage(file.filepath);
          await fs.remove(file.filepath);
          res.json(result);
        } catch (e) {
          await fs.remove(file.filepath);
          res.status(500).json({ error: e.message });
        }
      });
    });

    app.post('/packages/uninstall', async (req, res) => {
      if (!(await checkPrivilege(this.core, req, res))) return;

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Missing package name" });

      const rootApps = path.resolve(this.core.configuration.vfs.root, "apps");
      const packagePath = path.resolve(rootApps, name);

      // Security Check
      const rel = path.relative(rootApps, packagePath);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return res.status(403).json({ error: "Invalid package path" });
      }

      if (!(await fs.pathExists(packagePath))) {
        return res.status(404).json({ error: "Package not found" });
      }

      try {
        await fs.remove(packagePath);
        try {
          await this.packages.removePackage(name);
        } catch (e) { }

        this.core.broadcast("osjs/packages:metadata:changed");
        await this.packages.save();
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    return this.packages.init();
  }

  start() {
    this.packages.start();

    if (this.core.configuration.development) {
      this.initDeveloperTools();
    }
  }

  async destroy() {
    await closeWatches(this.watches);
    await this.packages.destroy();
    super.destroy();
  }

  /**
   * Initializes some developer features
   */
  initDeveloperTools() {
    const { manifestFile } = this.packages.options;

    if (fs.existsSync(manifestFile)) {
      const watcher = chokidar.watch(manifestFile);
      watcher.on('change', () => {
        this.core.broadcast('osjs/packages:metadata:changed');
      });
      this.watches.push(watcher);
    }
  }
}

module.exports = PackageServiceProvider;
