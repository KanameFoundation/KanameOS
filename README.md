# KanameOS

KanameOS is an [open-source](https://raw.githubusercontent.com/DemuraAIdev/KanameOS/master/LICENSE) web desktop platform with a window manager, application APIs, GUI toolkit, filesystem abstractions and much more based on [OS.js](https://www.os-js.org/)

## Introduction

KanameOS is a web desktop platform that prioritizes modularity and ease of use.

## Installation

> KanameOS runs on `http://localhost:8000` by default.

### Using a pre-made image

You can use the official Docker base image to run KanameOS without downloading this repository.

This image is based on this source code and comes with a minimal setup.

```bash
docker run -p 8000:8000 osjs/osjs:latest
```

### Using this repository

Clone the master branch:

> You can also download an archived version (ex. zip file) instead of using git.

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

# It's recommended that you update dependencies
npm update

# Optionally install extra packages:
# For a list of packages, see https://manual.os-js.org/resource/official/
npm install @osjs/example-application

# Discover installed packages
npm run package:discover

# Build client
npm run build

# Start serving
npm run serve
```
