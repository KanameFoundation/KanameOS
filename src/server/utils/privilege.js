/**
 * Helper to check for Admin Privileges (Active Session or Sudo)
 * @param {Core} core OS.js Core reference
 * @param {Request} req Express Request
 * @param {Response} res Express Response
 * @returns {Promise<boolean>} TRUE if allowed, FALSE (and sends 403) if denied.
 */
module.exports = async (core, req, res) => {
  const auth = core.make("osjs/auth");
  const adapter = auth.adapter; // Access the underlying adapter (e.g., arima)

  // 1. Check if current session user is Admin
  if (req.session && req.session.user) {
     const username = req.session.user.username;
     // Use adapter.verifyGroup if available, or fall back to session groups if trusted
     // It's safer to re-verify with DB if possible, but session is usually trusted.
     // Let's use adapter.verifyGroup to be robust against group changes.
     if (adapter.verifyGroup) {
         if (await adapter.verifyGroup(username, 'admin')) {
             return true;
         }
     } else {
         // Fallback to session groups
         if (req.session.user.groups && req.session.user.groups.includes('admin')) {
             return true;
         }
     }
  }

  // 2. Check for Sudo Credentials in Request Body OR Headers
  let sudoUser = null;
  let sudoPass = null;

  if (req.body && req.body.sudo) {
      sudoUser = req.body.sudo.username;
      sudoPass = req.body.sudo.password;
  } else if (req.headers['x-sudo-username'] && req.headers['x-sudo-password']) {
      sudoUser = req.headers['x-sudo-username'];
      sudoPass = req.headers['x-sudo-password'];
  }

  if (sudoUser && sudoPass) {
      // Verify credentials using the Auth Adapter's login logic
      // We can mock a req/res or call login directly if it supports plain args?
      // The current arima.login expects (req, res) and reads req.body.
      // We'll mock the request object for the login call.
      const mockReq = { body: { username: sudoUser, password: sudoPass } };
      const mockRes = {}; // login usually doesn't use res unless for cookies
      
      try {
          const user = await adapter.login(mockReq, mockRes);
          if (user) {
               // Credentials valid. NOW check if THIS user is admin.
               if (user.groups && user.groups.includes('admin')) {
                   return true;
               }
          }
      } catch (e) {
          console.warn("Sudo check failed", e);
      }
  }

  // 3. Deny Access
  res.status(403).json({ error: "ELEVATION_REQUIRED" });
  return false;
};
