# DeepSeek Harness Purge Plus

English · [简体中文](README.zh-CN.md)

A third-party DeepSeek Harness plugin for local patch management, prompt configuration, workspace rules, user skills, and an integrated red-team console. This fork is maintained by [ShadowCat2233](https://github.com/ShadowCat2233); its internal package name remains `dsh-purge`.

The project is independent of DeepSeek. Use it in environments you manage, offline labs, or explicitly authorized test environments.

## Status

| Item | Current state |
| --- | --- |
| Package version | `1.4.3` |
| Target host | DeepSeek Harness `0.2.1-rc.2` |
| Latest fixes | On `main`, starting with [`f7061f3`](https://github.com/ShadowCat2233/dsh-purge-plus/commit/f7061f3714e02b13a101a265b1c8a89f55ae38f1) |
| Distribution | This repository's GitHub archive or a local checkout; this fork has no separate npm publication |
| Verified environment | An isolated copy of the official Windows desktop application |

The fixes did not change the package version or create a new Release or tag. An older `v1.4.3` tag or Release may therefore lack them. Seeing `1.4.3` in the UI does not identify the source revision. Install from `main` or pin the verified fix commit below.

## Features

Open **Account menu → Settings → Purge**.

| Tab | Contents |
| --- | --- |
| Patch panel | Patch details, backups, Apply, Revert, Uninstall, prompt editing, approval and audit controls |
| Rules | Workspace policy, local `AGENTS.md` / `CLAUDE.md` discovery, and rule management |
| Skills | The host's user Skill list and archive/folder import |
| Console | Engagements, assets, environment setup, agents, tunnels, findings, attack chains, scoring, reports, knowledge, and a skill library |

Console code, presets, and 23 bundled skills are retained in this plugin. A separate red-team plugin is unnecessary. External programs required by individual skills still need their own setup. The host's user Skill list and the console's bundled skill library are separate views.

## Recent fixes in this fork

- Unique temporary files and per-target serialization for concurrent atomic writes and backups on Windows.
- A real disk descriptor `closeSync` implementation for the backup/restore path.
- An independent Windows restart supervisor that validates readiness before stopping the selected installation, moving `app.asar`, and relaunching the desktop with its data-directory arguments.
- Preparation failures keep the existing desktop running and write diagnostic logs. Recovery after stopping but before relaunch is implemented; file-lock fault injection for that recovery branch remains untested.
- Update copies include presets, skills, scripts, and license notices.
- Fork attribution updates and removal of three third-party chat/live-stream screenshots.

## Installation

Install official DeepSeek Harness first and make its `dsh` command available. The plugin declares Node.js ≥18; some Windows no-flash paths require Node.js ≥22. Prefer the host's bundled runtime.

Use the `desktop` profile for the official desktop app and `web` for the official Web host. Install only the surface you use. If you use both, install and apply separately.

### Official Windows desktop

```powershell
dsh plugin --profile desktop add https://github.com/ShadowCat2233/dsh-purge-plus/archive/refs/heads/main.tar.gz
```

### Official Web host

```sh
dsh plugin --profile web add https://github.com/ShadowCat2233/dsh-purge-plus/archive/refs/heads/main.tar.gz
```

Web integration is retained, but the desktop verification below does not establish end-to-end Web compatibility.

### Local checkout

```sh
git clone https://github.com/ShadowCat2233/dsh-purge-plus.git
cd dsh-purge-plus
dsh plugin --profile desktop add .
```

To pin the verified fix revision, run this before `add .`:

```sh
git checkout f7061f3714e02b13a101a265b1c8a89f55ae38f1
```

For Web, replace `desktop` with `web`. If `dsh` is unavailable, fix the host CLI/PATH first; installing the upstream npm package is not a substitute for this fork.

Fully quit and reopen the selected host after installation. Check that **Settings → Purge** appears. Adding the profile bundle and applying local host patches are separate steps.

## Use and data

1. Back up the host and any configuration you need, finish current tasks, and save your edits.
2. Open **Settings → Purge**, inspect the patch details, and select **Apply**.
3. After restart, check status and start a new conversation to verify the functionality you need. Windows restart forcibly stops processes in the selected installation and does not guarantee preservation of unsaved work.
4. Read and complete the console's authorization notice before use. Keep synthetic test records in a separate engagement for cleanup.

Applied status describes file detection. Pending means a recognized original remains. Skipped or unmatched items require version/component investigation. A visible page, successful API response, or zero pending patches does not establish complete functional acceptance.

Data belongs to the selected host's `DSH_HOME`. Console data lives in `$DSH_HOME/redteam`, with per-engagement directories under `engagements`. Parallel test copies should use separate installation directories, `DSH_HOME`, and Electron `--user-data-dir` values.

## Revert, uninstall, and update

- **Revert** restores backed-up host files. Follow the restart prompt and check status afterward.
- **Uninstall** attempts restoration before removing plugin registration and files. It also clears prompt overrides, rule configuration, and the console authorization acknowledgement. Back up custom content first. Plugin removal is not a console database wipe; reinstalling does not guarantee recovery of custom settings.
- **Update** uses GitHub archives for this fork. Short hashes in the version list identify commits, not new semantic versions. Duplicate latest labels and ambiguous same-version detection have been observed. Full online upgrade and failure recovery remain unverified.

Avoid mixing old tags, the upstream npm package, and this fork's `main`. Back up configuration and check the source revision before reinstalling or updating.

## Verification

Results below were obtained on 2026-10-22 with official Harness `0.2.1-rc.2` on Windows, using an isolated installation and data directories.

| Check | Result |
| --- | --- |
| Actual Apply | Complete, zero failures; one run from restored state applied 64 items with 7 already present |
| Backup and restore | 57 backups; all 57 restored target hashes matched their backups |
| Automatic restart | Sealed-to-unpacked transition and a second unpacked restart passed; old main/Host exited and a new native window returned |
| Native desktop | Signed-in workspace, Purge, and console opened in an actual Windows application window |
| Persistence | A synthetic engagement, one asset, and one port survived restarts; no probe was sent to the synthetic address |
| Preparation failure | A missing prepared app rejected the plan before desktop shutdown |
| Regression tests | 71 gate checks, 21 checks with the official prompt renderer, concurrent atomic I/O, and Windows restart preparation failure passed |

Observed status was 61/63 with two skipped items; those skips are not accepted functionality. Outstanding checks include real model tasks and tool execution, prompt/rule effects, user Skill import and execution, external dependencies, environment setup, tunnels and multi-agent flows, findings/report workflows, online updates, native approval/audit flows, other operating systems/versions, and endurance.

### Developer checks

```sh
node test/gate.mjs
node test/atomic-io.mjs
node test/windows-restart.mjs
```

The cwd regression requires the actual official host renderer. Replace the path with your environment's real file:

```powershell
$env:DSH_SYSTEM_PROMPT = 'C:\path\to\dsh-system-prompt\lib\index.js'
node test/cwd-variable.mjs
```

On Windows, the restart test starts a real supervisor against an invalid prepared directory and checks rejection before shutdown. These tests do not replace native application or business-flow acceptance.

## Attribution and licensing

| Source | Attribution |
| --- | --- |
| [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) | Original project by 小杨; original MIT text and `Copyright (c) 2026 小杨` retained |
| [JeffKeeping/dsh-purge-plus](https://github.com/JeffKeeping/dsh-purge-plus) | Source fork; this repair work started from 1.4.3 / `e8e792b` |
| [Jueze-2019/dsh-redteam-mode](https://github.com/Jueze-2019/dsh-redteam-mode) | Console, presets, and related skills; MIT license and disclosure retained |
| [Minglink/dsh-infinite-gen-5](https://github.com/Minglink/dsh-infinite-gen-5) | Acknowledged source of historical implementation ideas; relevant module licensing remains under review |

Read [LICENSE](LICENSE), [NOTICE.md](NOTICE.md), [DISCLAIMER.md](DISCLAIMER.md), the [console license](docs/redteam-upstream-LICENSE), and its [disclosure](docs/redteam-upstream-DISCLOSURE). Historical changes are in [CHANGELOG.md](CHANGELOG.md).

Consistency between the retained MIT text and historical noncommercial statements, IG5-related module terms, and the bundled prompt's provenance has not been fully resolved. Functional fixes and documentation changes do not constitute complete compliance certification or grant third-party rights the maintainer does not own. Preserve relevant copyrights, source attribution, and license files when redistributing.

## Reporting issues

Use [Issues](https://github.com/ShadowCat2233/dsh-purge-plus/issues). Include host version, operating system, installation source and revision, reproduction steps, and redacted errors. Do not upload API keys, login tokens, account data, or sensitive engagement information.
