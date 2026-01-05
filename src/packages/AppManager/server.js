const fs = require("fs-extra");
const path = require("path");
const { formidable } = require("formidable");
const AdmZip = require("adm-zip");

module.exports = (core, proc) => {
  const { route } = core.make("osjs/express");

  const processPackage = async (zipPath, cleanupCallback) => {
    try {
      const zip = new AdmZip(zipPath);
      const extractPath = path.resolve(process.cwd(), "vfs/apps");
      const tempExtractPath = path.join(
        path.resolve(process.cwd(), "vfs/tmp"),
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
        if (cleanupCallback) await cleanupCallback();
        throw new Error("Invalid package: missing metadata.json");
      }

      const metadata = await fs.readJson(metadataPath);
      const packageName = metadata.name;

      if (!packageName) {
        await fs.remove(tempExtractPath);
        if (cleanupCallback) await cleanupCallback();
        throw new Error("Invalid package: missing name in metadata");
      }

      const finalPath = path.join(extractPath, packageName);

      await fs.remove(finalPath);

      await fs.move(packageRoot, finalPath, { overwrite: true });

      // Cleanup temp and zip
      if (packageRoot !== tempExtractPath) {
        await fs.remove(tempExtractPath);
      }

      // Copy to global dist for serving
      try {
        const type = metadata.type || "application";
        const typeMap = {
          application: "apps",
          theme: "themes",
          icons: "icons",
          sounds: "sounds",
        };
        const targetDir = typeMap[type] || "apps";
        const globalDist = path.resolve(
          core.configuration.public,
          targetDir,
          packageName
        );
        const localDist = path.join(finalPath, "dist");

        const linkSource = (await fs.pathExists(localDist))
          ? localDist
          : finalPath;

        if (await fs.pathExists(linkSource)) {
          await fs.remove(globalDist);
          await fs.ensureDir(path.dirname(globalDist));
          await fs.ensureSymlink(linkSource, globalDist);
          console.log(
            `AppManager: Linked ${packageName} to ${globalDist} (from ${linkSource})`
          );
        }
      } catch (e) {
        console.warn("AppManager: Failed to copy to dist", e);
      }

      if (cleanupCallback) await cleanupCallback();

      await core.make("osjs/packages").load();

      core.broadcast("osjs/packages:metadata:changed");

      return { success: true, name: packageName };
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const installPackage = async (req, res) => {
    if (
      req.headers["content-type"] &&
      req.headers["content-type"].includes("application/json")
    ) {
      // Handle VFS path installation
      const { vfsPath } = req.body;
      if (!vfsPath) {
        return res.status(400).json({ error: "Missing vfsPath" });
      }

      const username = req.session.user.username;
      let realPath;

      if (vfsPath.startsWith("home:/")) {
        realPath = path.resolve(
          process.cwd(),
          "vfs",
          username,
          vfsPath.replace("home:/", "")
        );
      } else if (vfsPath.startsWith("system:/")) {
        realPath = path.resolve(
          process.cwd(),
          "dist",
          vfsPath.replace("system:/", "")
        );
      } else if (vfsPath.startsWith("tmp:/")) {
        realPath = path.resolve(
          process.cwd(),
          "vfs/tmp",
          vfsPath.replace("tmp:/", "")
        );
      } else {
        return res.status(400).json({ error: "Unsupported VFS mountpoint" });
      }

      if (!(await fs.pathExists(realPath))) {
        return res.status(404).json({ error: "File not found" });
      }

      try {
        const result = await processPackage(realPath, async () => {});
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }

      return;
    }

    const form = formidable({
      uploadDir: path.resolve(process.cwd(), "vfs/tmp"),
      keepExtensions: true,
    });

    await fs.ensureDir(form.uploadDir);

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Upload failed" });
      }

      const file = files.package ? files.package[0] : null;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const result = await processPackage(file.filepath, async () => {
          await fs.remove(file.filepath);
        });
        res.json(result);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  };

  const uninstallPackage = async (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Missing package name" });
    }

    const packagePath = path.resolve(process.cwd(), "vfs/apps", name);

    // Security check: ensure we are only deleting from vfs/apps
    if (!packagePath.startsWith(path.resolve(process.cwd(), "vfs/apps"))) {
      return res.status(403).json({ error: "Invalid package path" });
    }

    if (!(await fs.pathExists(packagePath))) {
      return res.status(404).json({ error: "Package not found" });
    }

    try {
      await fs.remove(packagePath);

      // Remove from memory
      core.make("osjs/packages").removePackage(name);

      // Notify client to refresh
      core.broadcast("osjs/packages:metadata:changed");

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  const inspectPackage = async (req, res) => {
    const { vfsPath } = req.body;
    if (!vfsPath) {
      return res.status(400).json({ error: "Missing vfsPath" });
    }

    const username = req.session.user.username;
    let realPath;

    if (vfsPath.startsWith("home:/")) {
      realPath = path.resolve(
        process.cwd(),
        "vfs",
        username,
        vfsPath.replace("home:/", "")
      );
    } else if (vfsPath.startsWith("system:/")) {
      realPath = path.resolve(
        process.cwd(),
        "dist",
        vfsPath.replace("system:/", "")
      );
    } else if (vfsPath.startsWith("tmp:/")) {
      realPath = path.resolve(
        process.cwd(),
        "vfs/tmp",
        vfsPath.replace("tmp:/", "")
      );
    } else {
      return res.status(400).json({ error: "Unsupported VFS mountpoint" });
    }

    if (!(await fs.pathExists(realPath))) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      const zip = new AdmZip(realPath);
      const tempExtractPath = path.join(
        path.resolve(process.cwd(), "vfs/tmp"),
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
        return res
          .status(400)
          .json({ error: "Invalid package: missing metadata.json" });
      }

      const metadata = await fs.readJson(metadataPath);
      await fs.remove(tempExtractPath);

      res.json(metadata);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  };

  route("POST", "/apps/AppManager/install", installPackage);
  route("POST", "/apps/AppManager/uninstall", uninstallPackage);
  route("POST", "/apps/AppManager/inspect", inspectPackage);

  return {
    init: async () => {},
  };
};
