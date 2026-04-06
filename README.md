# VFrinzy

Instantly identify VS Code windows by customizing the status bar color and displaying the workspace name.

## Features

- **Custom status bar color** — Set a unique background color for each workspace's status bar
- **Custom font color** — Change the status bar text color to ensure readability
- **Workspace name badge** — Display the workspace name directly in the status bar
- **Badge styling** — Normal, UPPERCASE, or **𝗯𝗼𝗹𝗱** (Unicode) text styles
- **Per-workspace settings** — Each workspace remembers its own colors via `.vscode/settings.json`

## Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `vfrinzy.statusBarColor` | string | `""` | Status bar background color (hex, e.g. `#007ACC`) |
| `vfrinzy.statusBarFontColor` | string | `""` | Status bar text color (hex, e.g. `#FFFFFF`) |
| `vfrinzy.showWorkspaceName` | boolean | `true` | Show workspace name in the status bar |
| `vfrinzy.workspaceNameColor` | string | `""` | Workspace badge text color (hex) |
| `vfrinzy.workspaceNameStyle` | enum | `normal` | `normal`, `uppercase`, or `bold-unicode` |
| `vfrinzy.workspaceNamePrefix` | string | `$(window) ` | Icon/text prefix (supports [codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)) |

## Commands

- **VFrinzy: Set Status Bar Color** — Quick input to set the status bar color
- **VFrinzy: Reset Status Bar Color** — Remove VFrinzy color customizations

## Usage

1. Open a workspace
2. Run **VFrinzy: Set Status Bar Color** from the command palette (`Cmd+Shift+P`)
3. Enter a hex color — the status bar updates immediately
4. Or go to **Settings → VFrinzy** to configure all options

Settings are saved per-workspace in `.vscode/settings.json`, so each project gets its own look.

## Installation

Install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vfrinzy).

Or search for **VFrinzy** in the Extensions view (`Cmd+Shift+P` → **Extensions: Install Extensions**).

## Development

```sh
git clone https://github.com/ahelal/vfrinzy.git
cd vfrinzy
npm install
npm run compile
# Press F5 in VS Code to launch the Extension Development Host
```
