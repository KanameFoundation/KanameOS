
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

module.exports = (core, options) => {
  const vfsRoot = core.configuration.vfs.root;
  const DB_FILE = path.resolve(vfsRoot, 'users.json');

  const loadDb = async () => {
    if (await fs.pathExists(DB_FILE)) {
      try {
        return await fs.readJson(DB_FILE);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const saveDb = async (db) => {
    await fs.writeJson(DB_FILE, db, {spaces: 2});
  };

  return {
    init: async () => {
      console.log('Initializing Arima Auth Adapter...');
      console.log('DB File:', DB_FILE);
      try {
        await loadDb();
        console.log('Arima Auth Adapter initialized.');
      } catch (e) {
        console.error('Error initializing Arima Auth Adapter:', e);
      }
      return true;
    },

    checkInit: async () => {
      const db = await loadDb();
      return db.length > 0;
    },

    destroy: async () => true,

    register: async (req, res) => {
      const {username, password} = req.body;
      if (!username || !password) {
        throw new Error('Missing username or password');
      }

      const db = await loadDb();
      if (db.find(u => u.username === username)) {
        throw new Error('User already exists');
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(password, salt);
      const newUser = {
        id: db.length + 1,
        username,
        name: username,
        groups: db.length === 0 ? ['admin'] : [],
        salt,
        hash
      };

      db.push(newUser);
      await saveDb(db);

      return {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        groups: newUser.groups
      };
    },

    login: async (req, res) => {
      const {username, password} = req.body;
      const db = await loadDb();
      const user = db.find(u => u.username === username);

      if (!user) {
        return false;
      }

      const hash = hashPassword(password, user.salt);
      if (hash === user.hash) {
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          groups: user.groups
        };
      }

      return false;
    },

    verifyGroup: async (username, group) => {
      const db = await loadDb();
      const user = db.find(u => u.username === username);
      return user && user.groups && user.groups.includes(group);
    },

    getUsers: async () => {
      const db = await loadDb();
      return db.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        groups: u.groups || []
      }));
    },

    createUser: async (user) => {
      const db = await loadDb();
      if (db.find(u => u.username === user.username)) {
        throw new Error('User already exists');
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword(user.password, salt);
      const newUser = {
        id: db.length > 0 ? Math.max(...db.map(u => u.id)) + 1 : 1,
        username: user.username,
        name: user.name || user.username,
        groups: user.groups || [],
        salt,
        hash
      };

      db.push(newUser);
      await saveDb(db);
      return true;
    },

    removeUser: async (username) => {
      const db = await loadDb();
      const index = db.findIndex(u => u.username === username);
      if (index !== -1) {
        db.splice(index, 1);
        await saveDb(db);
        return true;
      }
      return false;
    },

    logout: async (req, res) => true
  };
};
