use tauri::Manager;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      // 设置窗口图标（任务栏显示用）—— 编译期内嵌 icon.png
      // 注意：setup 闭包中 app 是 &mut App，需通过 app.handle() 获取 AppHandle
      let handle = app.handle();
      if let Some(window) = handle.get_webview_window("main") {
        // include_image! 将 PNG 编译期内嵌为 RGBA 像素，无需 image-png feature
        let icon = tauri::include_image!("icons/icon.png");
        let _ = window.set_icon(icon);
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
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
