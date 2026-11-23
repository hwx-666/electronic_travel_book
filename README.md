# 电子旅游手账本（travel-journal）

在 3D 地球上点亮去过的地方，点击进入后可浏览按时间排列的旅行回忆；登录后回忆与照片
保存到云端（Supabase），多设备同步。

项目当前为**阶段 5**：邮箱+密码账号体系 + 图文回忆上云（Supabase 数据库 + Storage 存照片），
保留阶段 4 全部能力（中国/外国两级下钻、点亮由回忆推导）。

## 功能一览

| 能力 | 说明 |
| --- | --- |
| 账号体系 | 邮箱 + 密码注册/登录/登出（默认开启邮件确认），刷新不掉登录态，按账号隔离数据 |
| 3D 地球 | globe.gl 渲染，可旋转/缩放，hover 高亮，点击国家进入（自带点击容差修复） |
| 中国地图 | 省 → 市两级平面地图 + 地区搜索（DataV 数据按需加载） |
| 外国地图 | 任意国家 → ADM1 → ADM2 两级下钻 + 地区搜索（geoBoundaries 数据） |
| 离线加速 | 美国/印尼/意大利/澳洲/克罗地亚/俄罗斯 12 个 TopoJSON 内置在 `public/data/geo/` |
| 旅行回忆 | 任意地区页添加/浏览/删除回忆，三种形态：纯文字 / 纯图片 / 图文混合 |
| 照片回忆 | 单条最多 9 张，客户端压缩（展示图长边 ≤1280px / ≤300KB，缩略图 ≤200px）后传 Storage |
| 云端存储 | 回忆与照片存 Supabase（memories / memory_photos 表 + `photos` bucket），多设备同步 |
| 本地导入 | 登录后一键把旧版 localStorage 回忆导入云端（幂等，不重复） |
| 访问状态 | 点亮由回忆推导：某地有回忆（或下辖有回忆）才亮，无独立"已访问"标记 |

## 技术栈

- Vite + React + TypeScript
- globe.gl（three.js）渲染 3D 地球
- world-atlas 国界数据（TopoJSON，地球轮廓）
- geoBoundaries gbOpen 行政区划数据（TopoJSON，外国 ADM1/ADM2，按需加载）
- react-router-dom（hash 路由，为静态托管预留）
- @supabase/supabase-js（Auth + PostgREST + Storage，阶段 5 起）

## 目录结构

```
src/
├── theme/      # 配色主题（colors.ts + theme.css，业务代码不写死颜色）
├── data/       # 地图数据加载层
│   └── geo/    # world.ts（国家轮廓）、china.ts（中国省级）、
│               # foreign.ts（外国 ADM1/ADM2）、adminCoverage.ts + alpha3.ts（自动生成的覆盖清单）
├── lib/        # supabase.ts（client 单例 + auth 封装 + 错误规范化）、image.ts（图片压缩）
├── store/      # 全局状态（AuthContext/AuthProvider/useAuth + AppStoreProvider，云端读写）
├── components/ # Earth（3D 地球）、Navigation（面包屑）、CountryView（中国/外国地图）、
│               # Map2D（平面地图）、RegionSearch（地区搜索）、Memories（旅行回忆区）、
│               # AccountBar（全局登出条）
└── pages/      # AuthPage（登录/注册）、EarthPage、CountryPage、ProvincePage、CityPage、
                # ForeignRegionPage、ForeignCityPage（详情页已接入回忆区）
scripts/        # 数据验收脚本（verify-local / verify-foreign）与 supabase-schema.sql
public/data/geo/ # 内置离线行政区划 TopoJSON（12 个文件，约 19MB）
```

## 运行

```bash
npm install
npm run dev        # 开发服务器（默认 http://localhost:5173）
npm run build      # 类型检查 + 产物构建
npm run lint       # oxlint 静态检查
npm run preview    # 预览构建产物
npm run verify:data  # 数据验收（本地 6 国 + 远程抽样，需联网）
```

## 环境变量（阶段 5）

项目使用 Supabase 云端后端，需要两个环境变量（见 `.env.example`，**勿提交 `.env`**）：

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key>
```

- `VITE_SUPABASE_URL`：项目的 REST 端点（Dashboard → Settings → API）。
- `VITE_SUPABASE_ANON_KEY`：publishable key（公开密钥，仅受 RLS 策略约束，可放心放前端；
  **严禁**使用 service_role/secret key 在客户端）。

本地开发复制 `.env.example` 为 `.env` 填入真实值；部署到 GitHub Pages 时，
在仓库 Settings → Secrets and variables → Actions 配置同名变量
（部署工作流 `deploy-pages.yml` 已按此读取）。

## Supabase 设置（阶段 5）

1. 创建项目（区域建议：组织级 Asia-Pacific；项目级 Tokyo `ap-northeast-1` 或
   Singapore `ap-southeast-1`）。
2. 在 SQL Editor 整段执行 `scripts/supabase-schema.sql`（幂等，可重复跑）：
   - 建表 `memories` / `memory_photos`（无默认值：id/user_id/created_at 等全部由前端提供）；
   - 建 `photos` bucket（public，**只有 SQL Editor 的 postgres 角色能建，anon key 无权**）；
   - **RLS 收紧**：表策略按 `auth.uid()` 隔离，Storage 对象策略限制登录用户只能写
     `photos/<自己的user_id>/…` 路径。
3. 确认 Auth 配置：开启 Email 确认（默认），密码长度 ≥6 位。
4. 若之前执行过放行版策略，本文件会先 drop 再建新策略；文末附回退 SQL。

> 表内无任何默认值：`memories` 的 `id / user_id / created_at / updated_at`、
> `memory_photos` 的 `id / created_at` 均由前端 `crypto.randomUUID() + Date.toISOString()`
> 生成后 insert（与需求文档一致）。`memory_photos` 不含 `user_id`，归属由
> `memory_id` 反查 `memories.user_id` 推导（RLS 用子查询实现）。

## 存储方案说明（阶段 5）

- **云端为真源**：登录后拉全量回忆（含照片元数据）到内存，`getVisited/getMemories`
  保持同步读（渲染层零感知云端）；增/删回忆都是异步云端写入，成功后更新内存态。
- **写入顺序（带照片）**：先 insert `memories`（拿 id）→ 压缩 + 上传每张图到
  `photos/<userId>/<memoryId>/<文件名>`（展示图 + 缩略图）→ 批量 insert `memory_photos`
  （`sort_order` 递增）；任一步失败回滚（删已传文件 + 删 memories 记录），表单输入不丢。
- **删除顺序**：先按 storage_path 清单删 Storage 文件（尽力，失败仅 warn，避免孤儿文件
  阻塞主流程）→ 删 `memories`（`memory_photos` 由 `on delete cascade` 连带清除）。
- **本地 v2 数据**：登录后回忆区出现「导入本地回忆」按钮，逐条 upsert（按 id 幂等，
  失败可重试不重复），全部成功清空本地。
- 免费层配额提醒：DB 500MB、Storage 1GB。照片已压到 ≤300KB/张，但请勿无限上传。

## 数据源说明（阶段 3）

外国行政区划来自 **geoBoundaries（gbOpen，CC BY 4.0）**。选它的原因：

1. 覆盖广：world-atlas 可点击的 174 个国家里 168 国有 ADM1、163 国有 ADM2；
2. 提供简化版 TopoJSON，体积小（美国 50 州约 0.9MB），按需 + 模块级缓存很轻；
3. 经 GitHub media 直链拉取，响应带 CORS 头，浏览器可直接 fetch。

加载策略：

- 常用国家（美国 / 印度尼西亚 / 意大利 / 澳大利亚 / 克罗地亚 / 俄罗斯，ADM1+ADM2）
  已内置在 `public/data/geo/`，同源加载最快且离线可用；
- 其余国家按需从远程拉取，URL 模板（固定完整 commit 锚点）：

```
https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/<ISO3>/ADM<1|2>/geoBoundaries-<ISO3>-ADM<1|2>_simplified.topojson
```

注意：**不能走 `github.com/raw`**——它先返回 302 且该重定向响应不带 CORS 头，
浏览器跨域 fetch 在重定向阶段就被拦下（此前"除中国外都加载不出来"的根因；
Node 验证不受 CORS 约束所以发现不了）。media 直链直接返回带
`access-control-allow-origin: *` 的数据。

其他说明：

- TopoJSON 的 feature 属性只有 `shapeName / shapeISO / shapeID / shapeGroup / shapeType`，
  没有层级字段，ADM2 的父级用「质心落在哪个 ADM1 里」推导（边缘的群岛县质心在
  简化边界外，退回球面距离最近的 ADM1）。
- 无 ADM1 数据的 6 国（ESH / FLK / ATF / PRI / NCL / ATA）统一回退到 world-atlas
  国家整体轮廓（单 feature，不可下钻），保证点任何国家都有图。
- visitedKey 命名空间：国家用 `<alpha2>`（如 `CN`、`US`），中国省级/市级用 `CN-<adcode>`
  （如 `CN-440000`、`CN-440300`），外国 ADM1 用 `<alpha2>-<adminCode>`（如 `US-CA`），
  ADM2 用 `<alpha2>-<shapeID>`；ADM2 键无法从 URL 构造，进入详情页时反查数据获得。
- **点亮语义（阶段 4.1 修正）**：没有独立 visited 状态，"去过"完全由回忆推导——
  某地亮当且仅当存在一条回忆的 `visitedKey` 等于它，或其 `ancestorKeys`（回忆里冗余
  存的父层键链）包含它。即：**添加回忆才点亮（含父层），删掉最后一条回忆自动熄灭**；
  进入页面不会点亮任何地方。
- 跨 180° 经线的国家（美国阿留申群岛、俄罗斯楚科奇）在数据层做了「以中位质心
  经度为中心重投影」，并剔除关岛/美属萨摩亚这类太平洋深处离群板块后再适配
  fitSize，避免主体被压缩成一条细线（`foreign.ts` recenter + `Map2D` fitProjection）。

## 数据验收脚本

- `scripts/verify-local.mjs`：校验内置 6 国的 12 个 TopoJSON（特征数、空路径、
  父级推导全覆盖）。**离线可跑**，是最常用的回归手段。
- `scripts/verify-foreign.mjs`：联网抽样验证远程数据（美国/日本/巴西/法国等），
  并确认"无 ADM1 的国家返回 404 → 触发轮廓兜底"这条路径。

修改或替换数据源后，务必运行 `npm run verify:data` 再提交。

## 阶段回顾（阶段 1 → 5）

项目按阶段推进，每个阶段交付一块独立能力，累计成当前版本：

- **阶段 1（工程骨架 + 3D 地球）**：搭建 Vite + React + TS 工程与主题系统
  （theme/colors.ts + theme.css，业务代码不写死颜色）；globe.gl 渲染 3D 地球，
  支持旋转/缩放、hover 高亮、点击国家进入详情页（自带点击容差修复），
  国界轮廓来自 world-atlas（TopoJSON）；确立 hash 路由（为静态托管预留）与
  面包屑导航骨架；国家页尚无平面地图时显示占位视图。
- **阶段 2（中国地图）**：中国省 → 市两级平面地图 + 地区搜索。省级地图数据
  来自 DataV（TopoJSON 按需加载 + 模块级缓存），市级渲染复用 2D 通用组件，
  城市名录来自 china-division 静态表；中国国家页接入专属视图与中文面包屑；
  同时预留 `CN-<adcode>` 访问键命名空间（给阶段 4 的存储用）。
- **阶段 3（外国地图）**：任意国家 → ADM1 → ADM2 两级下钻 + 地区搜索
  （geoBoundaries 数据按需加载）；美国/印尼/意大利/澳洲/克罗地亚/俄罗斯
  6 国 12 个 TopoJSON 内置 `public/data/geo/` 离线可用；配套数据验收脚本；
  修复跨 180° 经线国家（阿留申、楚科奇）重投影与 raw 链接 CORS 重定向问题。
- **阶段 4 / 4.1（旅行回忆 + 点亮推导）**：任意地区页接入旅行回忆
  （增/删/浏览，日期倒序，无地图地区页也有回忆区）；点亮改为由回忆推导
  （无独立 visited 状态，添加回忆即点亮含父层、删尽自动熄灭）；回忆持久化到
  localStorage（schema v2，v1 数据自动迁移），存储不可用时静默降级。
- **阶段 5（账号体系 + 图文回忆上云）**：Supabase 邮箱+密码注册/登录/登出与
  会话保持；回忆存云端（memories / memory_photos 表），照片压缩后传 Storage
  `photos` bucket（公开读、按用户目录隔离写）；RLS 收紧为 `auth.uid()` 隔离；
  本地 v2 回忆一键导入（幂等）；Cloudflare 数据本地化（2026-11 起 1.1.1.1 被禁，
  走 CNAME + 环境变量区）。

## 当前进度（阶段 5）

- 3D 地球：可旋转、hover 高亮、可点击，按点亮状态着色
- 中国：省 → 市两级平面地图 + 搜索（阶段 2 完成）
- 外国：任意国家 → ADM1 平面地图，有 ADM2 的国家继续下钻到 ADM2 详情页
  （路由 `#/country/US` → `#/country/US/CA` → `#/country/US/CA/San_Francisco`）
- 每个国家页、一级详情页都带地区搜索；断网时显示错误态并可重试
- **账号体系（阶段 5）**：未登录时整站只显示登录/注册页；邮箱+密码注册（邮件确认）
  与登录，右上角全局登出条；刷新不掉登录态；登出/换账号自动清空本地数据
- **图文回忆（阶段 5）**：任意地区页回忆区支持三态（纯文字/纯图片/图文混合）；
  照片多选（≤9 张）+ 本地预览 + 移除；提交异步写云，上传中禁用按钮，失败保留输入
- **照片链路（阶段 5）**：客户端压缩（展示图长边 ≤1280px、体积 ≤300KB；缩略图
  ≤200px，JPEG，EXIF 自动修正、透明底转白）→ 上传 Storage → 大图查看（左右切换）
- **云端存储（阶段 5）**：回忆存 Supabase 表、照片存 `photos` bucket；写入/删除
  带回滚；storageOk 语义改为"云端可用"，不可用时顶部提示且不白屏
- **本地导入（阶段 5）**：登录后一键把旧版 localStorage 回忆导入云端（幂等，
  成功后清除本地）

## 版本历史

| 版本 | 内容 |
| --- | --- |
| v0.1.0 | 阶段 3 完整：外国两级下钻 + 6 国离线数据 + 数据验收脚本 + 全文件注释 |
| v0.2.0 | 阶段 4 完整：visited 全层级标记 + localStorage 持久化 + 旅行回忆（增/删/浏览） |
| v0.2.1 | 阶段 4.1：点亮改为由回忆推导（无独立 visited），storage schema v2 + v1 自动迁移 |
| v0.3.0 | 阶段 5 完整：Supabase 账号体系 + 图文回忆上云（数据库 + Storage）+ RLS 隔离 + 本地导入 |

（首次发布打 tag `v0.1.0`，此后每次发布在 CHANGELOG 或此表追加一行。）
