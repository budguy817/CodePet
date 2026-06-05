# CodePet 发布流程

<!--
  文件路径: RELEASE.md
  本文件详细记录了 CodePet 从开发到发布上线的完整流程。
  请严格按照步骤操作，避免遗漏签名、发布等关键环节。
-->

---

## 📋 目录

- [前置条件](#前置条件)
- [一、发布前准备](#一发布前准备)
- [二、更新版本号](#二更新版本号)
- [三、构建测试](#三构建测试)
- [四、提交与打标签](#四提交与打标签)
- [五、GitHub Actions 自动构建](#五github-actions-自动构建)
- [六、验证发布结果](#六验证发布结果)
- [七、客户端验证更新](#七客户端验证更新)
- [故障排查](#故障排查)
- [附录](#附录)

---

## 前置条件

### 1.1 工具链要求

| 工具 | 用途 | 验证命令 |
|------|------|---------|
| Node.js ≥ 20 | 前端构建 | `node --version` |
| pnpm | 包管理 | `pnpm --version` |
| Rust ≥ 1.77 | Tauri 后端编译 | `rustc --version` |
| Git | 版本控制 | `git --version` |

### 1.2 签名密钥（首次发布必做）

Tauri 要求更新包必须经过签名验证，需要提前生成密钥对。

```bash
# 生成密钥对（如果还没有）
pnpm tauri signer generate -w "$env:USERPROFILE\.tauri\app.key"
```

> 系统会提示输入密码保护私钥，**直接回车两次**即可（不设密码）。
>
> 生成后得到两个文件：
> - `C:\Users\<你的用户名>\.tauri\app.key` — **私钥，必须保密，不可提交到仓库**
> - `C:\Users\<你的用户名>\.tauri\app.key.pub` — **公钥，需要配置到 `tauri.conf.json`**

生成后检查 `src-tauri/tauri.conf.json` 中的 `pubkey` 字段是否已更新：

```json
"plugins": {
  "updater": {
    "pubkey": "dW50cnVzdGVk...",  // ← 必须与 app.key.pub 内容一致
    "endpoints": ["https://api.github.com/repos/budguy817/CodePet/releases/latest"],
    "windows": { "installMode": "passive" }
  }
}
```

### 1.3 配置 GitHub Secrets（首次发布必做）

GitHub Actions 需要私钥来签名安装包。打开仓库的 Secrets 页面：

> **Settings → Secrets and variables → Actions → New repository secret**

需要添加以下两个 secret：

#### `TAURI_SIGNING_PRIVATE_KEY`

获取私钥内容：

```bash
Get-Content "$env:USERPROFILE\.tauri\app.key"
```

复制全部输出（包括 `-----BEGIN RSA PRIVATE KEY-----` 等标记），粘贴到 secret 的值中。

#### `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

设为空字符串（因为生成时没设密码）。

![GitHub Secrets 配置示意图](https://docs.github.com/assets/cb-25923/images/help/settings/actions-secrets-setting-docs.png)

> 配置完成后，GitHub Actions 工作流（`.github/workflows/release.yml`）才能正确签名安装包。

---

## 二、发布前准备

### 2.1 确认代码就绪

```bash
# 确保工作区干净
git status

# 确保当前在 master 分支
git branch --show-current
# 输出应为: master

# 确保所有改动已提交
git log --oneline -5
```

### 2.2 运行完整测试

```bash
# 1. 前端类型检查
cd f:\前端项目\CodePet
npx vue-tsc --noEmit

# 2. Rust 编译检查
cd src-tauri
cargo check

# 3. 完整构建测试
cd ..
pnpm tauri build
```

> **注意：** `pnpm tauri build` 会生成最终安装包，确保没有编译错误。如果构建失败，请先修复错误再继续。

---

## 三、更新版本号

### 3.1 修改版本号

打开 `src-tauri/tauri.conf.json`，找到 `version` 字段：

```json
{
  "version": "0.1.0",   // ← 改为新版本号，例如 "0.2.0"
  "productName": "CodePet",
  // ...
}
```

> **版本号规范（语义化版本）：**
> - 修复性发布（bug fix）：`0.1.0` → `0.1.1`
> - 功能性发布（新功能）：`0.1.0` → `0.2.0`
> - 重大变更：`0.2.0` → `1.0.0`

### 3.2 更新 `Cargo.toml`（可选）

`src-tauri/Cargo.toml` 中的 `version` 字段通常与 `tauri.conf.json` 保持一致：

```toml
[package]
name = "app"
version = "0.1.0"   // ← 同步更新
```

### 3.3 更新 `CHANGELOG.md`

如果项目有 `CHANGELOG.md`，添加本次发布的变更记录：

```markdown
## [0.2.0] - 2026-06-05

### 新增
- 自动更新功能
- 工作台模式

### 修复
- 鼠标穿透失效问题
```

> 如果没有创建 `CHANGELOG.md`，可以跳过此步，GitHub Release 会自动生成发布说明。

---

## 四、提交与打标签

### 4.1 提交版本变更

```bash
cd f:\前端项目\CodePet

git add -A
git commit -m "release: v0.2.0"
```

### 4.2 创建 Git 标签

```bash
# 打标签（标签名必须为 v 开头，与 GitHub Actions 触发器匹配）
git tag v0.2.0

# 查看标签
git tag -l 'v*'
# 输出: v0.2.0
```

### 4.3 推送到 GitHub

```bash
# 推送代码和标签（SSH 方式）
git push origin master
git push origin v0.2.0
```

> ⚠️ **推送顺序：先推代码，再推标签。** 如果标签推送失败，检查网络：
> ```bash
> # 测试 SSH 连接
> ssh -T git@github.com
> # 成功输出: Hi budguy817! You've successfully authenticated...
> ```

---

## 五、GitHub Actions 自动构建

### 5.1 查看构建进度

推送标签后，GitHub Actions 会自动触发。可以在浏览器中查看构建进度：

```
https://github.com/budguy817/CodePet/actions
```

![GitHub Actions 页面](https://docs.github.com/assets/cb-59943/images/help/actions/actions-tab.png)

### 5.2 构建流程说明

工作流文件：`.github/workflows/release.yml`

构建包含两个 Job，并行执行：

```
推送标签 v0.2.0
       │
       ├──▶ build-windows (windows-latest)
       │        │
       │        ├── 安装 Node.js + Rust + pnpm
       │        ├── 缓存依赖加速构建
       │        ├── pnpm install
       │        ├── pnpm tauri build  (自动签名)
       │        └── 上传 .msi/.exe + .sig 到 Release
       │
       └──▶ build-macos (macos-latest)
                │
                ├── 安装 Node.js + Rust + pnpm
                ├── 缓存依赖加速构建
                ├── pnpm install
                ├── pnpm tauri build  (自动签名)
                └── 上传 .dmg + .sig 到 Release
```

### 5.3 构建产物

构建成功后，GitHub Actions 会自动创建 Release，产物包括：

**Windows 版：**
| 文件 | 说明 |
|------|------|
| `CodePet_0.2.0_x64-setup.exe` | NSIS 安装包 |
| `CodePet_0.2.0_x64-setup.exe.sig` | 安装包签名文件 |
| `CodePet_0.2.0_x64.msi` | MSI 安装包 |
| `CodePet_0.2.0_x64.msi.sig` | MSI 签名文件 |

**macOS 版：**
| 文件 | 说明 |
|------|------|
| `CodePet_0.2.0_x64.dmg` | DMG 安装包 |
| `CodePet_0.2.0_x64.dmg.sig` | 安装包签名文件 |

### 5.4 构建失败排查

如果 GitHub Actions 构建失败：

1. **检查日志** — 点击失败的任务，查看具体错误行
2. **常见问题：**
   - `TAURI_SIGNING_PRIVATE_KEY` 未设置 → 检查 GitHub Secrets 配置
   - Rust 编译错误 → 本地先跑 `cargo check` 确认
   - 前端构建错误 → 本地先跑 `pnpm build` 确认
   - 网络超时 → Actions 重跑（Re-run jobs）
3. **修复后重新发布：**
   ```bash
   # 删除失败标签，修复后重新推送
   git tag -d v0.2.0
   git push origin :refs/tags/v0.2.0
   # 修复后重新打标签推送
   git tag v0.2.0
   git push origin v0.2.0
   ```

---

## 六、验证发布结果

### 6.1 检查 Release 页面

构建完成后，打开 GitHub Release 页面确认：

```
https://github.com/budguy817/CodePet/releases
```

![GitHub Release 页面](https://docs.github.com/assets/cb-21438/images/help/releases/releases-overview.png)

确认内容包括：
- ✅ Release 标题和标签正确（如 `v0.2.0`）
- ✅ 发布说明已自动生成
- ✅ 所有平台的安装包已上传（`.msi`、`.exe`、`.dmg`）
- ✅ 每个安装包都有对应的 `.sig` 签名文件

### 6.2 手动下载验证

可以手动下载安装包并安装，确认安装包正常：

1. 点击 Release 中的 `.exe` 或 `.msi` 文件下载
2. 运行安装程序，确认安装成功
3. 启动 CodePet，确认功能正常

---

## 七、客户端验证更新

### 7.1 手动检查更新

在已安装的旧版本 CodePet 中：

1. 右键系统托盘图标
2. 点击 **「检查更新」**
3. 如果配置正确，应弹出更新对话框

### 7.2 更新流程展示

```
托盘菜单「检查更新」
       │
       ▼
  调用 GitHub Releases API
       │
       ▼
  解析最新 Release 信息
       │
       ├── 版本相同 ──▶ 显示"已是最新版本"
       │
       └── 版本更高 ──▶ 显示版本信息 + 更新说明
                            │
                     点击「下载并安装」
                            │
                            ▼
                     下载安装包（显示进度条）
                            │
                            ▼
                     运行安装程序（MSI/DMG）
                            │
                            ▼
                     安装完成，应用自动重启
```

### 7.3 更新验证清单

- [ ] 旧版本能检测到新版本
- [ ] 版本号和更新说明显示正确
- [ ] 下载进度正常
- [ ] 安装后能正常启动
- [ ] 安装后版本号已更新

---

## 故障排查

### 签名验证失败

```
错误信息: "signature verification failed"
```

**原因：** 客户端公钥与构建时使用的私钥不匹配。

**解决：**
1. 检查 `tauri.conf.json` 中的 `pubkey` 是否与 `app.key.pub` 一致
2. 检查 GitHub Actions 中的 `TAURI_SIGNING_PRIVATE_KEY` 是否与本地私钥一致
3. 更新配置后重新构建发布

### 更新检查失败

```
错误信息: "check update failed" 或网络相关错误
```

**原因：** 客户端无法访问 GitHub API。

**解决：**
1. 确认客户端网络能访问 `api.github.com`
2. 如果在中国大陆，可能需要代理或改用其他更新源

### Release 文件未找到

```
错误信息: "No release asset found for current platform"
```

**原因：** Release 中的安装包名称与 Tauri 期望的不匹配。

**解决：**
1. 检查 Release assets 中是否有对应平台的安装包
2. 确认 `tauri.conf.json` 中的 `productName` 与 assets 名称匹配
3. 重新构建并更新 Release

---

## 附录

### A. 快速发布命令速查

```bash
# 一键发布（注意替换版本号）
$version = "0.2.0"
cd f:\前端项目\CodePet

# 更新版本号（手动修改 tauri.conf.json）

# 提交
git add -A
git commit -m "release: v$version"
git tag "v$version"
git push origin master
git push origin "v$version"
```

### B. 相关文件参考

| 文件 | 作用 |
|------|------|
| `.github/workflows/release.yml` | GitHub Actions 自动构建配置 |
| `src-tauri/tauri.conf.json` | 版本号、更新端点、公钥配置 |
| `src-tauri/Cargo.toml` | Rust 后端版本号 |
| `src/composables/useUpdater.ts` | 前端更新检查逻辑 |
| `src/components/UpdateDialog.vue` | 更新对话框 UI |
| `src-tauri/src/lib.rs` | Rust 端 updater 插件注册 |

### C. 版本号记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1.0 | — | 初始版本 |
| | | |
| | | |
