
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

module.exports = (core, proc) => {
  const {route} = core.make('osjs/express');

  const getUsers = async (req, res) => {
    if (!req.session.user || !req.session.user.groups.includes('admin')) {
      return res.status(403).json({error: 'Access denied'});
    }
    const db = await loadDb();
    const users = db.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      groups: u.groups
    }));
    res.json(users);
  };

  const createUser = async (req, res) => {
    if (!req.session.user || !req.session.user.groups.includes('admin')) {
      return res.status(403).json({error: 'Access denied'});
    }
    const {username, password, name, groups} = req.body;
    if (!username || !password) {
      return res.status(400).json({error: 'Missing username or password'});
    }

    const db = await loadDb();
    if (db.find(u => u.username === username)) {
      return res.status(400).json({error: 'User already exists'});
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const newUser = {
      id: db.length > 0 ? Math.max(...db.map(u => u.id)) + 1 : 1,
      username,
      name: name || username,
      groups: groups || [],
      salt,
      hash
    };

    db.push(newUser);
    await saveDb(db);
    res.json({success: true});
  };

  const deleteUser = async (req, res) => {
    if (!req.session.user || !req.session.user.groups.includes('admin')) {
      return res.status(403).json({error: 'Access denied'});
    }
    const {username} = req.body;
    if (username === 'admin') {
      return res.status(400).json({error: 'Cannot delete admin user'});
    }

    const db = await loadDb();
    const index = db.findIndex(u => u.username === username);
    if (index !== -1) {
      db.splice(index, 1);
      await saveDb(db);
      res.json({success: true});
    } else {
      res.status(404).json({error: 'User not found'});
    }
  };

  route('GET', '/api/Settings/users', getUsers);
  route('POST', '/api/Settings/users/create', createUser);
  route('POST', '/api/Settings/users/delete', deleteUser);

  return {
    init: async () => {}
  };
};
