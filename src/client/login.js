/*
 * KanameOS™ - Web Based Operating System
 *
 * Copyright (c) 2026 Abdul Vaiz Vahry Iskandar <cyberaioff@gmail.com>
 * All rights reserved.
 *
 * ---------------------------------------------------------
 * Based on OS.js - JavaScript Cloud/Web Desktop Platform
 * Copyright (c) Anders Evenrud <andersevenrud@gmail.com>
 * ---------------------------------------------------------
 *
 * Redistribution and use in source and binary forms...
 */

import { EventEmitter } from "../event/emitter.js";
import createUI from "./adapters/ui/login";

/**
 * Login Options
 *
 * @typedef {Object} LoginOptions
 * @property {string} [title] Title
 * @property {object[]} [fields] Fields
 */

/**
 * OS.js Login UI
 */
export default class Login extends EventEmitter {
  /**
   * Create authentication handler
   *
   * @param {Core} core Core reference
   * @param {LoginOptions} [options] Options
   */
  constructor(core, options) {
    super("Login");

    /**
     * Login root DOM element
     * @type {Element}
     */
    this.$container = null;

    /**
     * Core instance reference
     * @type {Core}
     * @readonly
     */
    this.core = core;

    /**
     * Login options
     * TODO: typedef
     * @type {Object}
     * @readonly
     */
    this.options = {
      id: "osjs-login",
      title: "Welcome to KanameOS™",
      stamp: core.config("version"),
      logo: {
        position: "top",
        src: null,
      },
      fields: [
        {
          tagName: "input",
          attributes: {
            name: "username",
            type: "text",
            placeholder: "Username",
          },
        },
        {
          tagName: "input",
          attributes: {
            name: "password",
            type: "password",
            placeholder: "Password",
          },
        },
        {
          tagName: "input",
          attributes: {
            type: "submit",
            value: "Login",
          },
        },
      ],
      ...options,
    };
  }

  /**
   * Initializes the UI
   */
  init(startHidden) {
    this.$container = document.createElement("div");
    this.$container.className = "osjs-login-base";
    this.core.$root.classList.add("login");
    this.core.$root.appendChild(this.$container);

    this.render(startHidden);
  }

  /**
   * Destroys the UI
   */
  destroy() {
    this.core.$root.classList.remove("login");

    if (this.$container) {
      this.$container.remove();
      this.$container = null;
    }

    super.destroy();
  }

  /**
   * Renders the UI
   */
  render(startHidden) {
    const login = this.core.config("auth.login", {});
    const ui = createUI(this.options, login, startHidden, this.$container);

    ui.on("register:post", (values) => this.emit("register:post", values));
    ui.on("login:post", (values) => this.emit("login:post", values));
    this.on("login:start", () => ui.emit("login:start"));
    this.on("login:stop", () => ui.emit("login:stop"));
    this.on("login:error", (msg, err) => ui.emit("login:error", msg, err));
  }
}
