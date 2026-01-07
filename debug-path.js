const path = require('path');
const process = require('process');

const cwd = process.cwd();
const vfsRoot = path.join(cwd, 'vfs');
const resolvedApps = path.resolve(vfsRoot, 'apps');
const name = 'TaskManager';
const packagePath = path.resolve(vfsRoot, 'apps', name);

console.log('CWD:', cwd);
console.log('VFS Root:', vfsRoot);
console.log('Resolved Apps:', resolvedApps);
console.log('Package Path:', packagePath);
console.log('StartsWith Check:', packagePath.startsWith(resolvedApps));

const lowerCwd = cwd.toLowerCase();
const upperCwd = cwd.toUpperCase();
const pathLower = path.resolve(lowerCwd, 'vfs/apps/foo');
const pathUpper = path.resolve(upperCwd, 'vfs/apps');

console.log('Path Lower:', pathLower);
console.log('Path Upper:', pathUpper);
console.log('StartsWith Mixed:', pathLower.startsWith(pathUpper));
