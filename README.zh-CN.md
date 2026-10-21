# DeepSeek Harness Purge Plus

[English](README.md) · 简体中文

DeepSeek Harness 的第三方插件，提供本机补丁管理、提示词配置、规则与技能管理，以及内置红队演练台。本仓库由 [ShadowCat2233](https://github.com/ShadowCat2233) 维护，内部包名为 `dsh-purge`。

本项目与 DeepSeek 官方没有隶属或背书关系。使用范围为自己管理的本机环境、离线靶场或已获授权的测试环境。

## 当前状态

| 项目 | 状态 |
| --- | --- |
| 包版本 | `1.4.3` |
| 目标宿主 | DeepSeek Harness `0.2.1-rc.2` |
| 最新修复 | 已合入 `main`，起始提交 [`f7061f3`](https://github.com/ShadowCat2233/dsh-purge-plus/commit/f7061f3714e02b13a101a265b1c8a89f55ae38f1) |
| 发布方式 | 从本仓库 GitHub 归档或本地源码安装；未发布本分支同名 npm 包 |
| 实测范围 | Windows 官方桌面端的独立测试副本；详见下方验证记录 |

最新修复没有提升包版本号，也没有创建新 Release 或标签。因此，旧的 `v1.4.3` 标签或 Release 不保证包含修复，界面仅显示 `1.4.3` 也不足以确认源码版本。安装修复版请使用下文的 `main` 归档或指定修复提交。

## 功能

入口位于 **账号菜单 → 设置 → Purge**。

| 页面 | 内容 |
| --- | --- |
| 破甲 | 本机补丁状态、分类明细、备份、应用、还原、卸载、提示词编辑，以及审批和审计入口 |
| 规则 | 工作区规则策略、本地 `AGENTS.md` / `CLAUDE.md` 扫描和规则管理 |
| 技能 | 宿主用户 Skill 列表、压缩包或文件夹导入 |
| 演练台 | 演练与资产库、环境适配、智能体、会话隧道、战果、攻击链、得分、报告、知识库和技能库 |

演练台相关代码、预设及 23 份技能随插件保留，无需另装独立红队插件。技能依赖的外部程序及其运行环境仍需单独准备。宿主的“用户 Skill”列表与演练台附带的技能库是两个不同入口。

## 本分支最近修复

- 为并发原子写入和备份使用唯一临时文件，并按目标路径串行提交，避免 Windows 上的临时文件冲突。
- 补齐真实磁盘文件描述符的 `closeSync`，修复备份和还原链路中的关闭失败。
- Windows 桌面重启改为独立监督进程：先确认准备完成，再退出选定安装的旧进程、切换 `app.asar` 并启动桌面，保留数据目录参数。
- 重启准备失败时保留原桌面程序，并记录诊断日志。停止后、重新启动前失败的恢复启动分支尚未做文件锁故障注入实测。
- 更新文件清单包含预设、技能、脚本与许可通知，避免升级遗漏资源。
- 补充分支来源说明，移除三张第三方聊天／直播截图。

## 安装

需要已安装官方 DeepSeek Harness，并能在终端运行 `dsh`。插件声明 Node.js ≥18；部分 Windows 无闪窗路径要求 Node.js ≥22。优先使用宿主配套运行环境。

桌面端使用 `desktop` profile，Web 使用 `web` profile。只安装自己使用的那一端；若两端都使用，则分别安装和应用。

### Windows 官方桌面端

```powershell
dsh plugin --profile desktop add https://github.com/ShadowCat2233/dsh-purge-plus/archive/refs/heads/main.tar.gz
```

### 官方 Web 宿主

```sh
dsh plugin --profile web add https://github.com/ShadowCat2233/dsh-purge-plus/archive/refs/heads/main.tar.gz
```

Web 接入代码保留，但本轮原生桌面验收不等于 Web 全流程验收。

### 从源码安装

```sh
git clone https://github.com/ShadowCat2233/dsh-purge-plus.git
cd dsh-purge-plus
dsh plugin --profile desktop add .
```

如需固定到已验证修复提交，在 `add .` 前执行：

```sh
git checkout f7061f3714e02b13a101a265b1c8a89f55ae38f1
```

Web 用户将命令中的 `desktop` 改为 `web`。若终端找不到 `dsh`，先检查宿主 CLI 安装和 PATH，不要用上游 npm 包名代替本分支归档。

安装后完全退出并重新打开对应宿主，确认 **设置 → Purge** 出现。写入 profile 与应用本机补丁是两个步骤。

## 使用与数据

1. 在自己的测试环境中备份宿主和需要保留的配置，结束当前任务并保存编辑内容。
2. 打开 **设置 → Purge**，查看补丁明细后点击 **应用**。
3. 完成重启后重新检查状态，再新建会话验证所需功能。Windows 重启会强制退出选定安装的进程，不保证未保存内容能够保留。
4. 使用演练台前阅读并完成其授权须知。测试数据使用独立演练，便于后续清理。

“已应用”表示对应文件的补丁检测结果；“待应用”表示仍有可处理原文；“跳过／没对上”需要结合目标组件和版本检查。不能把页面能打开、接口返回成功或待应用为 0 当作全部功能已验收。

插件使用所选宿主的 `DSH_HOME`。演练数据位于 `$DSH_HOME/redteam`，各演练目录位于其 `engagements` 子目录。并行测试副本应隔离安装目录、`DSH_HOME` 和 Electron `--user-data-dir`，不要让两份测试进程共用数据目录。

## 还原、卸载与更新

- **还原**：恢复已备份的宿主文件；完成后按界面提示重启，并核对状态。
- **卸载**：先尝试还原补丁，再移除插件注册和文件；还会清理提示词覆盖、规则配置及演练授权确认。需要保留的自定义内容应提前备份。卸载插件不等于清空演练数据库；恢复插件也不保证找回此前自定义内容。
- **更新**：本分支从 GitHub 归档分发。在线版本列表中的短提交号是 Git 提交标识，不是新的语义版本号。已观察到“最新”标签重复及同版本识别不清的问题，完整在线升级和失败回退尚未验收。

不要将旧标签、上游 npm 包与本分支 `main` 混用。手动重装或升级前先备份配置，并确认取得的源码包含所需修复。

## 验证记录

以下为 2026-10-22 在 Windows、官方 Harness `0.2.1-rc.2` 独立安装和数据目录中的结果。

| 验证项 | 结果 |
| --- | --- |
| 真实 Apply | `complete=true`、失败 0；一次从还原状态应用得到 64 项应用、7 项已存在 |
| 备份与还原 | 57 份备份；57/57 目标文件哈希与备份一致 |
| 自动重启 | 封装状态切换和解包状态再次重启通过；旧主进程与 Host 退出，新原生窗口返回 |
| 原生桌面 | 登录后工作区、Purge 及演练台可打开；操作对象为真实 Windows 窗口 |
| 数据持久化 | 合成演练、1 台资产和 1 个端口在重启后保留；未向合成地址发起探测 |
| 重启准备失败 | 缺少准备目录时拒绝重启计划，未进入停止桌面阶段 |
| 自动化回归 | gate 71 项、真实官方渲染器 cwd 21 项、并发原子 I/O 和 Windows 重启准备失败测试通过 |

本轮状态为 61/63、跳过 2 项；这不表示两个跳过项已通过。以下仍待专项验收：实际模型任务与工具调用、提示词和规则生效、用户 Skill 导入与执行、外部工具依赖、环境适配、隧道与多智能体、战果及报告等完整流程、在线更新、原生审批审计流程，以及其他系统／版本与长期运行。

### 开发者检查

```sh
node test/gate.mjs
node test/atomic-io.mjs
node test/windows-restart.mjs
```

`cwd` 回归需要指定所用官方宿主的真实渲染器。PowerShell 示例，将路径替换为自己环境中的实际文件：

```powershell
$env:DSH_SYSTEM_PROMPT = 'C:\path\to\dsh-system-prompt\lib\index.js'
node test/cwd-variable.mjs
```

Windows 重启测试会启动一个面对无效准备目录的真实监督进程，验证它在停止桌面之前报错。上述回归不能替代原生桌面和业务验收。

## 来源、许可与使用说明

| 来源 | 说明 |
| --- | --- |
| [YuJunZhiXue/dsh-purge](https://github.com/YuJunZhiXue/dsh-purge) | 原项目，作者小杨；保留 `Copyright (c) 2026 小杨` 及原 MIT 许可证 |
| [JeffKeeping/dsh-purge-plus](https://github.com/JeffKeeping/dsh-purge-plus) | 本分支继续修改的来源；本轮修复基于 1.4.3 / `e8e792b` |
| [Jueze-2019/dsh-redteam-mode](https://github.com/Jueze-2019/dsh-redteam-mode) | 演练台、预设及相关技能来源；保留其 MIT 许可证与披露 |
| [Minglink/dsh-infinite-gen-5](https://github.com/Minglink/dsh-infinite-gen-5) | 历史实现借鉴来源；相关模块的许可兼容性仍待核查 |

请一并阅读 [LICENSE](LICENSE)、[NOTICE.md](NOTICE.md)、[DISCLAIMER.md](DISCLAIMER.md)、[红队组件许可证](docs/redteam-upstream-LICENSE) 和 [用途披露](docs/redteam-upstream-DISCLOSURE)。历史变更见 [CHANGELOG.md](CHANGELOG.md)。

仓库保留的 MIT 文本、历史附加非商业声明之间的一致性，IG5 相关模块的许可条件，以及默认提示词来源尚未全部厘清。本次功能修复与文档整理不构成完整合规结论，也不授予维护者无权授予的第三方权利。再分发时保留相关版权、来源与许可文件。

## 反馈

在 [Issues](https://github.com/ShadowCat2233/dsh-purge-plus/issues) 中提供宿主版本、系统、安装来源及提交号、复现步骤和已脱敏的错误日志。请勿上传 API Key、登录令牌、账号数据或真实演练中的敏感信息。
