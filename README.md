# 电子旅游手账本（travel-journal）

在 3D 地球上点亮去过的地方，点击进入后可浏览按时间排列的旅行回忆（回忆内容阶段 4 接入）。

项目当前为**阶段 3**：中国两级下钻 + 外国两级下钻均已可用，内置 6 个常用国家离线数据。

## 功能一览

| 能力 | 说明 |
| --- | --- |
| 3D 地球 | globe.gl 渲染，可旋转/缩放，hover 高亮，点击国家进入（自带点击容差修复） |
| 中国地图 | 省 → 市两级平面地图 + 地区搜索（DataV 数据按需加载） |
| 外国地图 | 任意国家 → ADM1 → ADM2 两级下钻 + 地区搜索（geoBoundaries 数据） |
| 离线加速 | 美国/印尼/意大利/澳洲/克罗地亚/俄罗斯 12 个 TopoJSON 内置在 `public/data/geo/` |
| 访问状态 | visited 标记全局状态（读写接口预留，阶段 4 接持久化） |

## 技术栈

- Vite + React + TypeScript
- globe.gl（three.js）渲染 3D 地球
- world-atlas 国界数据（TopoJSON，地球轮廓）
- geoBoundaries gbOpen 行政区划数据（TopoJSON，外国 ADM1/ADM2，按需加载）
- react-router-dom（hash 路由，为静态托管预留）

## 目录结构

```
src/
├── theme/      # 配色主题（colors.ts + theme.css，业务代码不写死颜色）
├── data/       # 地图数据加载层
│   └── geo/    # world.ts（国家轮廓）、china.ts（中国省级）、
│               # foreign.ts（外国 ADM1/ADM2）、adminCoverage.ts + alpha3.ts（自动生成的覆盖清单）
├── store/      # 全局状态（visited 等，读写接口预留存储接入）
├── components/ # Earth（3D 地球）、Navigation（面包屑）、CountryView（中国/外国地图）、
│               # Map2D（平面地图）、RegionSearch（地区搜索）
└── pages/      # EarthPage、CountryPage、ProvincePage、CityPage、
                # ForeignRegionPage、ForeignCityPage
scripts/        # 数据验收脚本（verify-local / verify-foreign，见下文）
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
- visitedKey 命名空间：外国 ADM1 用 `<alpha2>-<adminCode>`（如 `US-CA`），
  ADM2 用 `<alpha2>-<shapeID>`，避免不同国家同 code 撞名。
- 跨 180° 经线的国家（美国阿留申群岛、俄罗斯楚科奇）在数据层做了「以中位质心
  经度为中心重投影」，并剔除关岛/美属萨摩亚这类太平洋深处离群板块后再适配
  fitSize，避免主体被压缩成一条细线（`foreign.ts` recenter + `Map2D` fitProjection）。

## 数据验收脚本

- `scripts/verify-local.mjs`：校验内置 6 国的 12 个 TopoJSON（特征数、空路径、
  父级推导全覆盖）。**离线可跑**，是最常用的回归手段。
- `scripts/verify-foreign.mjs`：联网抽样验证远程数据（美国/日本/巴西/法国等），
  并确认"无 ADM1 的国家返回 404 → 触发轮廓兜底"这条路径。

修改或替换数据源后，务必运行 `npm run verify:data` 再提交。

## 当前进度（阶段 3）

- 3D 地球：可旋转、hover 高亮、可点击，按 visited 状态着色
- 中国：省 → 市两级平面地图 + 搜索（阶段 2 完成）
- 外国：任意国家 → ADM1 平面地图，有 ADM2 的国家继续下钻到 ADM2 详情页
  （路由 `#/country/US` → `#/country/US/CA` → `#/country/US/CA/San_Francisco`）
- 每个国家页、一级详情页都带地区搜索；断网时显示错误态并可重试
- 城市/二级详情页目前是空态（旅行回忆在阶段 4 接入）

## 版本历史

| 版本 | 内容 |
| --- | --- |
| v0.1.0 | 阶段 3 完整：外国两级下钻 + 6 国离线数据 + 数据验收脚本 + 全文件注释 |

（首次发布打 tag `v0.1.0`，此后每次发布在 CHANGELOG 或此表追加一行。）
