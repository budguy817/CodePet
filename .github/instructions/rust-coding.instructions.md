---
description: "CodePet Rust 编码规范 — Tauri v2 命令、错误处理、窗口操作。Use when: 编写或修改 src-tauri 下的 .rs 文件、添加 Tauri command、处理窗口事件、Rust 后端逻辑。触发词：rust、tauri command、lib.rs、main.rs、set_ignore_cursor_events、窗口操作、invoke_handler。"
applyTo: "src-tauri/**/*.rs"
---
# CodePet Rust 编码规范

本规范适用于 `src-tauri/` 下的所有 `.rs` 文件，遵循 Tauri v2 的 API 风格和 CodePet 项目的特定约定。

## 项目结构

```
src-tauri/
├── src/
│   ├── main.rs      # 入口文件：调用 app_lib::run()，不写业务逻辑
│   └── lib.rs       # 核心文件：窗口创建、命令注册、插件配置
├── Cargo.toml       # 依赖管理
└── tauri.conf.json  # Tauri 窗口配置
```

> **main.rs 原则**：`main.rs` 只负责调用 `app_lib::run()`，所有逻辑放在 `lib.rs` 中。

## Tauri Command 规范

### 命令签名

所有 Tauri command 必须返回 `Result<T, String>` 以提供前端可读的错误信息：

```rust
use tauri::Manager;

/// 设置窗口是否忽略光标事件（鼠标穿透）
/// 
/// # 参数
/// - `window`: Tauri 自动注入的当前窗口句柄
/// - `ignore`: true = 鼠标穿透（背景可点到桌面），false = 正常响应鼠标
/// 
/// # 错误
/// 若窗口操作失败则返回错误描述字符串
#[tauri::command]
fn set_ignore_cursor_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| e.to_string())
}
```

### 命令注册

在 `lib.rs` 的 `run()` 函数中集中注册所有命令：

```rust
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            // 在此添加更多命令
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 命令禁用规则

-   不要为纯前端逻辑（动画状态、UI 切换）创建命令，仅 I/O、窗口操作、系统调用需要 Rust 命令
-   命令命名使用 `snake_case`，与前端 `invoke()` 调用名称一致
-   每个命令必须包含 `///` 文档注释，说明参数和返回值

## 错误处理

### 窗口操作的错误处理

所有窗口操作（`set_ignore_cursor_events`、`set_position`、`set_size` 等）必须：
1.  使用 `.map_err(|e| e.to_string())` 转换为前端可读的错误字符串
2.  考虑跨平台兼容性：Windows 和 macOS 对某些窗口属性的行为不同
3.  不在命令中 `panic!` 或 `unwrap()`，始终向上传播错误

```rust
// ✅ 正确：错误向上传播
fn do_something(window: tauri::Window) -> Result<(), String> {
    window.set_position(tauri::PhysicalPosition::new(100, 100))
        .map_err(|e| format!("无法设置窗口位置: {}", e))?;
    Ok(())
}

// ❌ 错误：直接 panic 会杀死整个进程
fn do_something(window: tauri::Window) {
    window.set_position(tauri::PhysicalPosition::new(100, 100)).unwrap();
}
```

### Plugin 初始化

插件（如 `tauri-plugin-log`）仅在 `debug_assertions` 下初始化，避免生产环境暴露日志：

```rust
.setup(|app| {
    if cfg!(debug_assertions) {
        app.handle().plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )?;
    }
    Ok(())
})
```

## 代码风格

### 命名

-   函数/变量/命令：`snake_case`
-   类型/trait：`CamelCase`（遵循 Rust 惯例）
-   常量：`SCREAMING_SNAKE_CASE`

### 导入顺序

1.  `use` 导入（std / 外部 crate / 内部模块）
2.  模块声明（`mod xxx;`）
3.  函数和命令定义

### 注释

-   所有公开函数和 Tauri command 使用 `///` 文档注释
-   内部逻辑使用 `//` 行注释
-   复杂逻辑必须用中文注释说明意图

## 行数限制

-   `lib.rs` 若超过 300 行，将命令拆分为独立模块（`src/commands/`），在 `lib.rs` 中通过 `mod commands;` 引入
-   单一函数不超过 40 行

## 禁止事项

-   **禁止** 在 `main.rs` 中编写业务逻辑或命令注册
-   **禁止** 在 Tauri command 中使用 `panic!` 或 `unwrap()` 
-   **禁止** 使用已废弃的 Tauri v1 API（如 `tauri::command` 的旧签名）
-   **禁止** 在 Rust 端硬编码窗口尺寸/位置常量（应从 tauri.conf.json 读取或由前端传入）
