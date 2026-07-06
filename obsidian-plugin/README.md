# OpenBird Obsidian Plugin

This folder contains a zero-build Obsidian plugin wrapper for OpenBird.

## Install Manually

Copy these files into a vault plugin folder:

```bash
mkdir -p /path/to/vault/.obsidian/plugins/openbird
cp manifest.json main.js openbird-core.js /path/to/vault/.obsidian/plugins/openbird/
```

Then enable `OpenBird` under Obsidian community plugins.

## Usage

- `OpenBird: Publish current note`
- `OpenBird: Publish current note temporarily`
- `OpenBird: Publish current note with custom slug`
- `OpenBird: Remove current note from OpenBird`

Authenticated publishing requires an API key in plugin settings. Temporary
publishing works without an API key and expires after 1 hour.
