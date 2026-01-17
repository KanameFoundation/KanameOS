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
 * @license Simplified BSD License
 */

/**
 * Splash Screen UI
 */
export default class Splash {
  /**
   * Create Splash
   * @param {Core} core Core reference
   */
  constructor(core) {
    /**
     * Core instance reference
     * @type {Core}
     * @readonly
     */
    this.core = core;

    /**
     * Splash root element
     * @type {Element}
     * @readonly
     */
    this.$loading = document.createElement("div");
    this.$loading.className = "osjs-boot-splash";

    core.on("osjs/core:boot", () => this.show());
    core.on("osjs/core:booted", () => this.destroy());
    core.on("osjs/core:logged-in", () => this.show());
    core.on("osjs/desktop:ready", () => this.destroy());
    core.on("osjs/splash:update", (percent, message) => this.update(percent, message));
  }

  /**
   * Initializes splash
   */
  init() {
    this.$loading.innerHTML = `
      <div class="osjs-boot-splash-content">
        <div class="osjs-boot-splash-branding">Loading KanameOS...</div>
        <div class="osjs-boot-splash-message">Initializing...</div>
        <div class="osjs-boot-splash-progress">
          <div class="osjs-boot-splash-bar" style="width: 0%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Updates splash progress
   * @param {number} percent Progress percentage
   * @param {string} [message] Status message
   */
  update(percent, message) {
    const bar = this.$loading.querySelector(".osjs-boot-splash-bar");
    const msg = this.$loading.querySelector(".osjs-boot-splash-message");

    if (bar) bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    if (msg && message) msg.textContent = message;
  }

  /**
   * Shows splash
   */
  show() {
    if (!this.$loading.parentNode) {
      this.core.$root.appendChild(this.$loading);
    }
  }

  /**
   * Destroys splash
   */
  destroy() {
    if (this.$loading.parentNode) {
      this.$loading.remove();
    }
  }
}
