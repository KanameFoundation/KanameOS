
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.resolve(process.cwd(), 'vfs/users.json');

const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

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

module.exports = (core, options) => ({
  init: async () => {
    console.log('Initializing Arima Auth Adapter...');
    console.log('DB File:', DB_FILE);
    try {
      const db = await loadDb();
      if (db.length === 0) {
        console.log('Creating default admin user...');
        // Create default admin user if empty
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword('admin', salt);
        db.push({
          id: 1,
          username: 'admin',
          name: 'Administrator',
          groups: ['admin'],
          salt,
          hash
        });
        await saveDb(db);
      }
      console.log('Arima Auth Adapter initialized.');
    } catch (e) {
      console.error('Error initializing Arima Auth Adapter:', e);
    }
    return true;
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
      groups: [],
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

  logout: async (req, res) => true
});
