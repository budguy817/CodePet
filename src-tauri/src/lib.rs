use tauri::{
    Manager,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
    Emitter,
};

/// 设置窗口是否忽略光标事件（鼠标穿透）
///
/// 当 ignore=true 时，鼠标事件会穿透窗口到达桌面，
/// 允许用户与桌面图标和其他窗口交互。
/// 当 ignore=false 时，窗口正常响应鼠标事件。
///
/// # 参数
/// - `window`: Tauri 自动注入的当前窗口句柄
/// - `ignore`: true = 鼠标穿透开启，false = 鼠标穿透关闭
///
/// # 返回
/// - `Ok(())`: 设置成功
/// - `Err(String)`: 设置失败时的错误描述
///
/// # 前端调用示例
/// ```typescript
/// import { invoke } from '@tauri-apps/api/core';
/// await invoke('set_ignore_cursor_events', { ignore: true });
/// ```
#[tauri::command]
fn set_ignore_cursor_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window
        .set_ignore_cursor_events(ignore)
        .map_err(|e| format!("鼠标穿透设置失败: {}", e))
}

/// 彻底退出应用程序（包括系统托盘图标）
///
/// 当用户通过右键菜单"退出"或托盘菜单"退出"确认离开时调用。
/// 此命令调用 app.exit(0) 会终止整个进程，
/// 确保托盘图标也被清理，不会在后台残留。
///
/// # 参数
/// - `app`: Tauri 自动注入的 AppHandle
///
/// # 前端调用示例
/// ```typescript
/// import { invoke } from '@tauri-apps/api/core';
/// await invoke('quit_app');
/// ```
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    // 退出整个应用进程，清理托盘图标
    app.exit(0);
}

/// 隐藏宠物窗口到系统托盘
///
/// 窗口隐藏后应用仍在后台运行，用户可通过系统托盘图标
/// 重新显示宠物。此命令不会退出进程。
///
/// # 参数
/// - `app`: Tauri 自动注入的 AppHandle
///
/// # 错误
/// 若找不到主窗口或隐藏失败则返回错误
#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| format!("隐藏窗口失败: {}", e))
    } else {
        // 窗口可能已被销毁，返回错误让前端感知
        Err("主窗口不存在".to_string())
    }
}

/// 显示宠物窗口（从系统托盘恢复）
///
/// 显示之前被隐藏的宠物窗口，并使其获得焦点。
///
/// # 参数
/// - `app`: Tauri 自动注入的 AppHandle
///
/// # 错误
/// 若找不到主窗口或显示失败则返回错误
#[tauri::command]
fn show_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.show().map_err(|e| format!("显示窗口失败: {}", e))?;
        // 显示后将窗口置顶并聚焦
        window.set_focus().map_err(|e| format!("聚焦窗口失败: {}", e))
    } else {
        Err("主窗口不存在".to_string())
    }
}

/// 系统托盘菜单项 ID 常量
///
/// 这些 ID 与托盘菜单项一一对应，
/// 用于在 on_menu_event 回调中识别用户点击了哪个菜单项。
mod tray_menu_ids {
    pub const SHOW: &str = "tray_show";       // 显示宠物
    pub const HIDE: &str = "tray_hide";       // 隐藏宠物
    pub const WORKSPACE: &str = "tray_workspace"; // 工作台
    pub const CHAT: &str = "tray_chat";       // 智能问答
    pub const QUIT: &str = "tray_quit";       // 退出
}

/// 构建系统托盘菜单
///
/// 创建包含以下选项的托盘右键菜单：
/// - 显示宠物 / 隐藏宠物
/// - 工作台 / 智能问答
/// - 退出
///
/// 菜单项的启用/禁用状态根据窗口当前可见性动态调整。
fn build_tray_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let show_item = MenuItemBuilder::with_id(tray_menu_ids::SHOW, "显示宠物")
        .build(app)?;
    let hide_item = MenuItemBuilder::with_id(tray_menu_ids::HIDE, "隐藏宠物")
        .build(app)?;
    let workspace_item = MenuItemBuilder::with_id(tray_menu_ids::WORKSPACE, "工作台")
        .build(app)?;
    let chat_item = MenuItemBuilder::with_id(tray_menu_ids::CHAT, "智能问答")
        .build(app)?;
    let quit_item = MenuItemBuilder::with_id(tray_menu_ids::QUIT, "退出")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&hide_item)
        .separator()
        .item(&workspace_item)
        .item(&chat_item)
        .separator()
        .item(&quit_item)
        .build()?;

    Ok(menu)
}

/// 向宠物窗口前端发送模式切换事件
///
/// 当用户从托盘菜单选择"工作台"或"智能问答"时，
/// 通过此函数向前端发送 `tray-switch-mode` 事件。
/// 前端 App.vue 监听此事件并调用 petStore 切换模式。
///
/// # 参数
/// - `app`: 应用句柄，用于获取窗口和触发事件
/// - `mode`: 目标模式名称（"workspace" 或 "chat"）
fn emit_mode_switch(app: &tauri::AppHandle, mode: &str) {
    if let Some(window) = app.get_webview_window("main") {
        // 先确保窗口可见
        let _ = window.show();
        let _ = window.set_focus();
        // 发送模式切换事件到前端
        let _ = window.emit("tray-switch-mode", mode);
    }
}

/// 创建系统托盘图标
///
/// 使用编译期内嵌的 icon.png 作为托盘图标。
/// 托盘图标支持：
/// - 左键点击：切换窗口显示/隐藏
/// - 右键点击：显示自定义菜单
/// - 菜单事件：显示、隐藏、切换模式、退出
///
/// # 参数
/// - `app`: 应用句柄
/// - `menu`: 托盘右键菜单
fn create_tray(
    app: &tauri::AppHandle,
    menu: tauri::menu::Menu<tauri::Wry>,
) -> Result<(), Box<dyn std::error::Error>> {
    // 编译期内嵌托盘图标（复用窗口图标）
    let icon = tauri::include_image!("icons/icon.png");

    // 构建托盘图标
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .tooltip("CodePet 桌面宠物")
        .menu(&menu)
        // 处理托盘菜单点击事件
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                tray_menu_ids::SHOW => {
                    // 显示宠物窗口
                    let _ = show_window(app.clone());
                }
                tray_menu_ids::HIDE => {
                    // 隐藏宠物窗口
                    let _ = hide_window(app.clone());
                }
                tray_menu_ids::WORKSPACE => {
                    // 切换到工作台模式
                    emit_mode_switch(app, "workspace");
                }
                tray_menu_ids::CHAT => {
                    // 切换到智能问答模式
                    emit_mode_switch(app, "chat");
                }
                tray_menu_ids::QUIT => {
                    // 彻底退出应用
                    app.exit(0);
                }
                _ => {
                    // 未知菜单项，忽略
                }
            }
        })
        // 处理托盘图标左键点击：切换窗口显示/隐藏
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                // 左键点击托盘图标 → 切换窗口可见性
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        // 窗口可见 → 隐藏到托盘
                        let _ = window.hide();
                    } else {
                        // 窗口隐藏 → 显示并聚焦
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let handle = app.handle();

            // 设置窗口图标（任务栏显示用）—— 编译期内嵌 icon.png
            if let Some(window) = handle.get_webview_window("main") {
                let icon = tauri::include_image!("icons/icon.png");
                let _ = window.set_icon(icon.clone());

                // 监听窗口关闭请求：隐藏到托盘而非真正关闭
                // 这样用户按 Alt+F4 或通过其他方式关闭窗口时，
                // 应用不会退出，而是继续在托盘运行
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // 阻止默认的关闭行为
                        api.prevent_close();
                        // 隐藏窗口到托盘（后台继续运行）
                        let _ = window_clone.hide();
                    }
                });
            }

            // 构建托盘菜单并创建托盘图标
            if let Ok(menu) = build_tray_menu(handle) {
                if let Err(e) = create_tray(handle, menu) {
                    eprintln!("[CodePet] 创建系统托盘图标失败: {}", e);
                    // 托盘创建失败不影响应用继续运行
                    // 用户仍可通过右键菜单使用完整功能
                } else {
                    println!("[CodePet] 系统托盘图标已就绪");
                }
            } else {
                eprintln!("[CodePet] 构建托盘菜单失败");
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_ignore_cursor_events,
            quit_app,
            hide_window,
            show_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
