---
description: "一键生成 Tauri v2 命令的 Rust 后端 + Vue 前端代码。Use when: 添加新的 Tauri command、封装 invoke 调用、创建 composable。触发词：生成 Tauri 命令、添加 command、create tauri command、invoke、tauri command 模板。"
argument-hint: "描述你要的 Tauri 命令：命令名、参数、返回值、用途"
---
你正在为 CodePet 项目生成一个完整的 Tauri v2 命令，包括 Rust 后端和 Vue 前端两端代码。

请先向用户确认以下信息（若未在输入中提供）：

1. **命令名称**：`snake_case`，如 `set_ignore_cursor_events`、`get_pet_config`
2. **命令用途**：一句话描述这个命令做什么
3. **输入参数**：参数名、类型、是否可选
4. **返回值**：返回类型（`()` 表示无返回值，或其他具体类型）
5. **所属模块**：新命令放在 `lib.rs` 中，还是拆到 `src-tauri/src/commands/` 下的独立文件？

确认后，按以下模板生成完整代码。

---

## 输出格式

### 1. Rust 端：Tauri Command

**放置位置**：`src-tauri/src/lib.rs`（在 `generate_handler![]` 宏中注册）

```rust
/// {命令用途的中文说明}
///
/// # 参数
/// - `window`: Tauri 自动注入的当前窗口句柄（若命令不操作窗口可省略此参数）
/// - `{param_name}`: {参数说明}
///
/// # 返回
/// - `Ok({返回值})`：{成功时说明}
/// - `Err(String)`：{失败时说明}
///
/// # 示例
/// 前端调用：`invoke('{command_name}', {{ {param_name}: {示例值} }})`
#[tauri::command]
fn {command_name}(window: tauri::Window, {param_name}: {param_type}) -> Result<{return_type}, String> {
    // TODO: 实现命令逻辑

    // 示例：窗口操作命令
    window
        .{window_method}({param_name})
        .map_err(|e| format!("{command_name} 失败: {}", e))?;

    Ok({返回值})
}
```

**注册命令**（在 `lib.rs` 的 `generate_handler![]` 中添加）：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 已有命令
    {command_name},  // ← 新增
])
```

> **若命令不涉及窗口操作**，移除 `window: tauri::Window` 参数。若需要访问应用状态（如 `AppHandle`），使用 `app: tauri::AppHandle`。

### 2. Vue 端：Composable 封装

**放置位置**：`src/composables/use{CommandName}.ts`（驼峰命名，不含下划线）

```typescript
// 文件路径: src/composables/use{CommandName}.ts
import { invoke } from '@tauri-apps/api/core'

/**
 * {命令用途的中文说明}
 *
 * 封装 Tauri 命令 `{command_name}` 的调用逻辑，
 * 提供类型安全的 Vue 组合式函数接口。
 */
export function use{CommandName}() {
  /**
   * {方法用途}
   *
   * @param {paramName} - {参数说明}
   * @returns Promise<{returnType}> {返回值说明}
   * @throws 若 Tauri 命令调用失败则抛出错误
   */
  const {methodName} = async ({paramName}: {paramType}): Promise<{returnType}> => {
    // 调用 Rust 后端命令
    const result = await invoke<{returnType}>('{command_name}', {
      {paramName},
    })

    return result
  }

  return { {methodName} }
}
```

> **命名约定**：
> - 文件名：`use{CommandName}.ts`（如 `useCursorEvents.ts`、`usePetConfig.ts`）
> - 导出函数：`use{CommandName}()`（与文件名同名）
> - 内部方法：去掉 `use` 前缀的驼峰命名（如 `setIgnoreCursorEvents`、`getPetConfig`）

### 3. Vue 端调用示例

在组件中使用：

```vue
<script setup lang="ts">
import { use{CommandName} } from '@/composables/use{CommandName}'

const { {methodName} } = use{CommandName}()

// 调用命令
const handleAction = async () => {
  try {
    await {methodName}({ /* 参数 */ })
    console.log('✅ {command_name} 执行成功')
  } catch (error) {
    console.error('❌ {command_name} 执行失败:', error)
  }
}
</script>
```

---

## 生成规则（必须遵守）

参考 `rust-coding.instructions.md` 和 `vue-component.instructions.md`：

- **Rust 端**：
  - 命令返回 `Result<T, String>`，禁止 `panic!` / `unwrap()`
  - 每个 `?` 传递的错误附加描述性前缀：`format!("{command_name} 失败: {}", e)`
  - 包含完整的 `///` 文档注释（参数说明、返回值、前端调用示例）

- **Vue 端**：
  - composable 使用 `<script setup lang="ts">` 兼容的函数签名
  - 所有参数和返回值带完整 TypeScript 类型
  - 包含 JSDoc `@param` 和 `@returns` 注释
  - 在 `onUnmounted` 中无需额外清理（除非命令注册了事件监听，此时需返回 `unlisten` 函数）

- **通用规则**：
  - 所有注释使用中文
  - Rust 命令名 `snake_case` ↔ Vue 方法名 `camelCase` 映射需一致
  - 若命令涉及异步 I/O（文件读写、网络请求），在 Rust 端使用 `tokio::spawn` 或标记为 `async`

---

## 边界情况处理清单

生成代码时，务必包含以下边界情况的处理：

-   **命令调用失败**：Vue 端必须 `try/catch`，给出用户友好的错误提示
-   **重复调用**：若命令不可重入，需在前端添加 `isPending` 状态防止重复触发
-   **窗口已销毁**：窗口操作类命令需在 Rust 端检查窗口有效性
-   **参数校验**：在 Rust 端对输入参数做合法性校验（非空、范围检查等），返回明确的错误信息
-   **平台差异**：标注仅在 Windows / macOS / Linux 生效的命令
