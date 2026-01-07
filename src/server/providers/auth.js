/*
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
const {ServiceProvider} = require('../../common/service-provider.js');
const Auth = require('../auth.js');
const checkPrivilege = require('../utils/privilege');

/**
 * OS.js Auth Service Provider
 */
class AuthServiceProvider extends ServiceProvider {

  constructor(core, options) {
    super(core, options);
    console.log('AuthServiceProvider options:', options);
    this.auth = new Auth(core, options);
  }

  destroy() {
    this.auth.destroy();

    super.destroy();
  }

  provides() {
    return [
      'osjs/auth'
    ];
  }

  async init() {
    this.core.singleton('osjs/auth', () => this.auth);

    const {route, routeAuthenticated} = this.core.make('osjs/express');

    route('post', '/register', async (req, res) => {
      // Allow registration if it's the first user (init), otherwise require privilege
      const init = await this.auth.checkInit();
      if (init) {
          if (!(await checkPrivilege(this.core, req, res))) return;
      }
      return this.auth.register(req, res);
    });

    route('get', '/api/auth/users', async (req, res) => {
      if (!(await checkPrivilege(this.core, req, res))) return;
      res.json(await this.auth.getUsers());
    });

    route('post', '/api/auth/users/create', async (req, res) => {
      if (!(await checkPrivilege(this.core, req, res))) return;
      try {
        await this.auth.createUser(req.body);
        res.json({success: true});
      } catch (e) {
        res.status(400).json({error: e.message});
      }
    });

    route('post', '/api/auth/users/remove', async (req, res) => {
      if (!(await checkPrivilege(this.core, req, res))) return;
      try {
        await this.auth.removeUser(req.body.username);
        res.json({success: true});
      } catch (e) {
        res.status(400).json({error: e.message});
      }
    });

    route('post', '/login', (req, res) => this.auth.login(req, res));
    route('get', '/init', (req, res) => this.auth.checkInit().then(yes => res.json(yes)));
    routeAuthenticated('post', '/logout', (req, res) => this.auth.logout(req, res));
    
    await this.auth.init();
  }
}

module.exports = AuthServiceProvider;
