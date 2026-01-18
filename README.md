<p align="center">
  <img src="https://raw.githubusercontent.com/KanameFoundation/KanameOS/refs/heads/master/src/client/Logo.svg" alt="KanameOS™ Logo" width="200" height="200" />
</p>

# KanameOS™

KanameOS™ is a heavily modified web desktop platform based on [OS.js](https://www.os-js.org/). It provides a unique window manager, tailored application APIs, GUI toolkit, and filesystem abstractions giving you a full desktop experience in your browser.

## Introduction

KanameOS™ is tailored to provide a modular and easy-to-use web desktop experience.

## Installation

> KanameOS™ runs on `http://localhost:8000` by default.

### Using this repository

Clone the master branch:

```bash
git clone -b master --single-branch https://github.com/KanameFoundation/KanameOS.git
cd KanameOS
```

#### Docker Compose installation

The easiest way to install is to use Docker Compose. This allows you to run a single command
to set everything up:

```bash
docker-compose up
```

#### Local installation

You can also install this directly onto your system by using the following set of commands.

> **NOTE:** Requires Node v18 (or later).

```bash
# Install dependencies
npm install

# Build client
npm run build

# Start serving
npm run serve
```
