# 数据库 Schema 设计

## 概述

本文档定义 EasyMotion 项目使用的 SQLite 数据库（`~/EasyMotion/library.db`）的完整表结构、索引设计、字段约束和迁移策略。

> **说明**：SQLite 仅用于存储**素材元数据、应用设置和最近项目索引**。项目配置（`project.json`、`subproject.json`）和对话历史（`conversation.json`）仍以 JSON 文件形式存储在项目目录中。

---

## 数据库配置

| 参数 | 值 | 说明 |
|------|-----|------|
| 数据库文件 | `~/EasyMotion/library.db` | macOS/Linux: `~` = `$HOME`；Windows: `~` = `%USERPROFILE%` |
| 连接模式 | 单文件 + WAL（Write-Ahead Logging） | 提高并发性能，支持多读单写 |
| 编码 | UTF-8 | 支持中文文件名和描述 |
| 最大连接数 | 1 写 + 多读 | 写操作通过主进程队列串行执行 |
| 备份策略 | 每日自动备份 `library.db` → `library.db.bak` | 损坏时自动恢复 |

---

## 表结构

### 1. projects（项目索引表）

用于项目窗口快速展示最近打开的项目列表，避免每次扫描文件系统。

```sql
CREATE TABLE projects (
  id              TEXT PRIMARY KEY,              -- 项目 UUID
  name            TEXT NOT NULL,                 -- 项目名称
  path            TEXT NOT NULL UNIQUE,          -- 项目绝对路径
  thumbnail_path  TEXT,                          -- 项目缩略图路径（最近子项目首帧）
  resolution      TEXT,                          -- 分辨率，如 "1920x1080"
  fps             INTEGER,                       -- 帧率
  subproject_count INTEGER DEFAULT 0,             -- 子项目数量
  created_at      INTEGER NOT NULL,              -- 创建时间（Unix 时间戳毫秒）
  modified_at     INTEGER NOT NULL,              -- 最后修改时间（Unix 时间戳毫秒）
  last_opened_at  INTEGER,                       -- 最后打开时间（Unix 时间戳毫秒）
  is_deleted      INTEGER DEFAULT 0              -- 软删除标记（0=正常，1=已删除）
);
```

**索引：**
```sql
CREATE INDEX idx_projects_modified ON projects(modified_at DESC);
CREATE INDEX idx_projects_last_opened ON projects(last_opened_at DESC);
CREATE INDEX idx_projects_deleted ON projects(is_deleted);
```

**说明：**
- `path` 使用绝对路径，跨平台统一存储（Windows 路径自动转换 `\` → `/`）
- `is_deleted` 软删除：用户删除项目时标记为 1，实际文件异步清理
- 与 `project.json` 的关系：此表是索引，真实数据以 `project.json` 为准。打开项目时如发现不一致，以文件为准并同步更新索引

---

### 2. assets（素材元数据表）

存储所有导入素材的元信息，支持素材库搜索、去重和统计。

```sql
CREATE TABLE assets (
  id              TEXT PRIMARY KEY,              -- 素材 UUID（同文件名前缀）
  project_id      TEXT NOT NULL,                 -- 所属总项目 UUID
  name            TEXT NOT NULL,                 -- 文件名（含扩展名）
  original_name   TEXT,                          -- 原始文件名（用户上传时的名字）
  type            TEXT NOT NULL CHECK(type IN ('image', 'video', 'audio', 'font', 'data')), -- 素材类型
  mime_type       TEXT,                          -- MIME 类型，如 "image/png"
  path            TEXT NOT NULL,                 -- 相对路径（相对于项目根目录）
  absolute_path   TEXT,                          -- 绝对路径（缓存，加速读取）
  content_hash    TEXT NOT NULL,                 -- SHA-256 文件内容哈希（用于去重）
  size_bytes      INTEGER NOT NULL,              -- 文件大小（字节）
  width           INTEGER,                       -- 图片/视频宽度（像素）
  height          INTEGER,                       -- 图片/视频高度（像素）
  duration_ms     INTEGER,                       -- 视频/音频时长（毫秒）
  thumbnail_path  TEXT,                          -- 缩略图相对路径
  tags            TEXT,                          -- 标签，JSON 数组序列化，如 "[\"logo\",\"blue\"]"
  is_favorite     INTEGER DEFAULT 0,              -- 是否收藏（0=否，1=是）
  usage_count     INTEGER DEFAULT 0,              -- 使用次数（用于"最近使用"排序）
  last_used_at    INTEGER,                       -- 最后使用时间（Unix 时间戳毫秒）
  imported_at     INTEGER NOT NULL,              -- 导入时间（Unix 时间戳毫秒）
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**索引：**
```sql
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_assets_content_hash ON assets(content_hash);
CREATE INDEX idx_assets_imported ON assets(imported_at DESC);
CREATE INDEX idx_assets_favorite ON assets(is_favorite, project_id);
CREATE INDEX idx_assets_name ON assets(name COLLATE NOCASE);  -- 不区分大小写搜索
```

**说明：**
- `content_hash` 用于全局去重：同一文件导入到不同项目时，提示引用现有文件
- `width`/`height`/`duration_ms` 根据素材类型选择性填充（图片/视频有宽高，音频/视频有时长）
- `tags` 用 JSON 字符串存储，查询时通过应用层解析（SQLite 原生不支持数组类型）
- `usage_count` 和 `last_used_at` 用于右侧面板"快捷素材区"的"最近使用"排序

---

### 3. asset_relations（素材引用关系表）

记录素材在子项目中的使用关系（哪个素材被哪个子项目的哪个片段引用）。

```sql
CREATE TABLE asset_relations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id        TEXT NOT NULL,
  project_id      TEXT NOT NULL,
  subproject_id   TEXT NOT NULL,                 -- 子项目 ID（project.json 中的 subprojects[].id）
  clip_id         TEXT,                          -- 引用该素材的片段 ID（可为空，表示未使用）
  created_at      INTEGER NOT NULL,
  FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**索引：**
```sql
CREATE INDEX idx_relations_asset ON asset_relations(asset_id);
CREATE INDEX idx_relations_subproject ON asset_relations(subproject_id);
CREATE UNIQUE INDEX idx_relations_unique ON asset_relations(asset_id, subproject_id, clip_id);
```

**说明：**
- 删除子项目时，可查询此表清理不再被引用的素材（垃圾回收）
- `clip_id` 为 `NULL` 时表示素材已导入但尚未被任何片段引用

---

### 4. presets（预设表）

存储官方预设和用户自定义预设。

```sql
CREATE TABLE presets (
  id              TEXT PRIMARY KEY,              -- 预设 UUID
  name            TEXT NOT NULL,                 -- 预设名称
  category        TEXT NOT NULL CHECK(category IN ('data-chart', 'title', 'transition', 'intro-outro', 'social-media', 'custom')),
  description     TEXT,                          -- 描述
  template_json   TEXT NOT NULL,                -- 预设模板 JSON（timeline 片段数据）
  thumbnail_path  TEXT,                          -- 预设缩略图路径
  is_builtin      INTEGER DEFAULT 0,             -- 是否内置（0=用户自定义，1=官方预设）
  is_deleted      INTEGER DEFAULT 0,              -- 软删除
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
```

**索引：**
```sql
CREATE INDEX idx_presets_category ON presets(category);
CREATE INDEX idx_presets_builtin ON presets(is_builtin);
```

**说明：**
- `template_json` 存储完整的 clip 模板 JSON（格式见 `核心功能.md` 预设存储格式）
- 内置预设随应用升级更新，`is_builtin=1` 的记录只读
- 用户自定义预设 `is_builtin=0`，可编辑和删除

---

### 5. app_settings（应用设置表）

存储用户级应用配置（非项目级）。

```sql
CREATE TABLE app_settings (
  key             TEXT PRIMARY KEY,              -- 配置键
  value           TEXT NOT NULL,                -- 配置值（JSON 字符串）
  updated_at      INTEGER NOT NULL              -- 更新时间
);
```

**预设配置项：**

| key | 默认值 | 说明 |
|-----|--------|------|
| `theme` | `"system"` | 主题：`light` / `dark` / `system` |
| `language` | `"zh-CN"` | 界面语言 |
| `default_resolution` | `"1920x1080"` | 新建项目默认分辨率 |
| `default_fps` | `30` | 新建项目默认帧率 |
| `default_duration` | `300` | 新建项目默认时长（帧） |
| `llm_provider` | `"openai"` | LLM 提供商 |
| `llm_model` | `"gpt-4o"` | LLM 模型 |
| `llm_api_key_encrypted` | `null` | 加密存储的 API Key |
| `auto_save_interval` | `30` | 自动保存间隔（秒） |
| `preview_quality` | `"high"` | 预览质量：`high` / `medium` / `low` |
| `panel_left_width` | `240` | 左侧面板宽度（像素） |
| `panel_right_width` | `280` | 右侧面板宽度（像素） |
| `panel_timeline_height` | `180` | 时间线面板高度（像素） |
| `show_welcome` | `1` | 首次启动是否显示欢迎窗口 |
| `check_update` | `1` | 是否自动检查更新 |
| `debug_mode` | `0` | 调试模式开关 |
| `recent_projects_limit` | `20` | 最近项目列表最大数量 |

**说明：**
- 所有值以 JSON 字符串存储，读取时根据 key 解析为对应类型
- `value` 为 `null` 时使用默认值
- 设置变更时立即写入（不防抖），避免丢失

---

### 6. conversations（对话历史索引表）

> **注意**：完整的对话历史存储在子项目的 `conversation.json` 中。此表仅用于全局搜索和统计。

```sql
CREATE TABLE conversations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  subproject_id   TEXT NOT NULL,                 -- 子项目 ID
  project_id      TEXT NOT NULL,
  message_count   INTEGER DEFAULT 0,              -- 消息数量（缓存）
  last_message_at INTEGER,                       -- 最后对话时间
  updated_at      INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

**索引：**
```sql
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_subproject ON conversations(subproject_id);
```

---

## 数据库初始化脚本

```sql
-- 启用 WAL 模式（提高并发性能）
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 创建表
-- ...（上述所有 CREATE TABLE 语句）

-- 插入默认设置
INSERT INTO app_settings (key, value, updated_at) VALUES
  ('theme', '"system"', strftime('%s', 'now') * 1000),
  ('language', '"zh-CN"', strftime('%s', 'now') * 1000),
  ('default_resolution', '"1920x1080"', strftime('%s', 'now') * 1000),
  ('default_fps', '30', strftime('%s', 'now') * 1000),
  ('default_duration', '300', strftime('%s', 'now') * 1000),
  ('auto_save_interval', '30', strftime('%s', 'now') * 1000),
  ('preview_quality', '"high"', strftime('%s', 'now') * 1000),
  ('panel_left_width', '240', strftime('%s', 'now') * 1000),
  ('panel_right_width', '280', strftime('%s', 'now') * 1000),
  ('panel_timeline_height', '180', strftime('%s', 'now') * 1000),
  ('show_welcome', '1', strftime('%s', 'now') * 1000),
  ('check_update', '1', strftime('%s', 'now') * 1000),
  ('debug_mode', '0', strftime('%s', 'now') * 1000),
  ('recent_projects_limit', '20', strftime('%s', 'now') * 1000)
ON CONFLICT(key) DO NOTHING;

-- 插入内置预设（示例）
INSERT INTO presets (id, name, category, description, template_json, is_builtin, created_at, updated_at) VALUES
  ('preset-title-fade-in', '标题-淡入', 'title', '标题从透明渐显，带轻微上移', '{"type":"text","transform":{"position":{"x":960,"y":540},"opacity":0},"animations":{"in":{"type":"fade","durationInFrames":20}}}', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('preset-chart-bar-blue', '柱状图-商务蓝', 'data-chart', '蓝色主题柱状图', '{"type":"chart","chartType":"bar","style":{"colors":["#0066FF"]}}', 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);
```

---

## 迁移策略

### 版本控制

在 `app_settings` 表中存储数据库 schema 版本：

| key | value |
|-----|-------|
| `db_version` | `1` |

### 升级流程

```
应用启动
  ↓
读取 db_version
  ↓
对比当前应用期望的版本
  ├── 一致 → 正常启动
  └── 不一致 → 执行迁移脚本
        ↓
  迁移脚本按版本顺序执行（v1 → v2 → v3）
  每个迁移在事务中执行，失败则回滚
        ↓
  更新 db_version
```

### 迁移脚本示例

```sql
-- v1 → v2：新增 assets.tags 字段
ALTER TABLE assets ADD COLUMN tags TEXT DEFAULT '[]';
UPDATE app_settings SET value = '2', updated_at = strftime('%s', 'now') * 1000 WHERE key = 'db_version';
```

---

## 核心查询示例

### 素材库搜索

```sql
-- 按名称搜索（不区分大小写）
SELECT * FROM assets 
WHERE project_id = ? 
  AND is_deleted = 0
  AND (name LIKE '%' || ? || '%' COLLATE NOCASE 
       OR original_name LIKE '%' || ? || '%' COLLATE NOCASE)
ORDER BY imported_at DESC 
LIMIT 50 OFFSET ?;
```

### 去重查询

```sql
-- 查找相同内容的素材
SELECT a.*, p.name as project_name 
FROM assets a
JOIN projects p ON a.project_id = p.id
WHERE a.content_hash = ?
ORDER BY a.imported_at DESC;
```

### 最近使用素材

```sql
-- 当前子项目的最近使用素材
SELECT a.* FROM assets a
JOIN asset_relations r ON a.id = r.asset_id
WHERE r.subproject_id = ?
ORDER BY a.last_used_at DESC
LIMIT 10;
```

### 项目统计

```sql
-- 项目素材统计
SELECT 
  type,
  COUNT(*) as count,
  SUM(size_bytes) as total_size
FROM assets
WHERE project_id = ? AND is_deleted = 0
GROUP BY type;
```

---

## 数据流与文件系统的关系

```
用户导入素材
  ↓
[主进程]
  ├── 复制文件 → 项目/assets/{类型}/{uuid}_{文件名}
  ├── 生成缩略图 → 项目/.thumbnails/{uuid}_{宽}x{高}.jpg
  └── 写入 SQLite assets 表（元数据）
        ↓
[渲染进程]
  ├── 查询 SQLite 获取素材列表（搜索/筛选）
  ├── 读取缩略图路径显示预览
  └── 素材拖拽到时间线 → 创建 asset_relations 记录
        ↓
[Generator]
  ├── 读取 assets 表获取素材路径
  └── 生成 Remotion 代码时引用相对路径
```

---

*文档版本：v0.1 | 最后更新：2026-05-30*