# InvenMate 桌面应用

周转库配件耗材管理系统（Electron + React + Ant Design + SQLite）。

## 技术栈
- Electron 27（主进程：public/electron.js）
- React 18 + Ant Design 5
- SQLite（better-sqlite3）单文件数据库：%APPDATA%/InvenMate/invenmate.db
- Excel 导出：exceljs

## 主要功能
- 仪表盘：低库存预警（前 5 条），可跳转库存页
- 配件型号管理：新增/编辑/删除，支持"最低库存"阈值
- 入库管理：创建/编辑/删除，服务端分页与筛选（型号、订单号、日期范围），导出 Excel
- 出库管理：创建/编辑/删除，服务端分页与筛选（型号、部门、日期范围），导出 Excel
- 订单管理：创建/编辑/删除订单，订单详情可新增/删除"订单明细"；服务端分页与筛选（订单号、供应商、状态、日期范围），导出 Excel
- 库存管理：基于入库/出库表动态聚合，支持搜索与分类过滤，阈值标红，导出 Excel

## 运行与打包
- 开发运行：
```
npm install
npm run electron-dev
```
- 打包安装包（Windows）：
```
npm run dist
```
安装包输出：dist/ 目录。

## 数据存储
- 数据库文件：
  - Windows: C:\Users\<用户名>\AppData\Roaming\InvenMate\invenmate.db
- 写入模式：SQLite journal_mode=DELETE（保存后立即写入主文件）
- 表结构（核心）：
  - part_models（含 min_threshold 最低库存阈值）
  - stock_in / stock_out
  - orders / order_items
  - app_data（仅保留少量通用KV）
- 示例数据：首次安装时自动初始化示例数据（8个配件型号、5个部门、3个供应商、2个订单及明细、入库出库记录）

## 导入/导出与日志
- Excel 导出：各业务页右上角"导出 Excel"（按当前筛选导出）
- 主进程日志：%APPDATA%/InvenMate/main.log（系统设置可打开目录/清空）

## 常见问题
- 看不到日志？
  - 首次运行或未触发写入时不会生成；做一次保存操作后再查看
- 数据未即时写入？
  - 已使用 DELETE 模式，保存后应立刻更新 invenmate.db 修改时间
- better-sqlite3 安装/打包慢？
  - 网络不佳时会退回源码编译；保持网络通畅或重试

## 目录结构（关键）
- public/
  - electron.js（主进程、IPC、日志、导出、分页筛选）
  - database.js（SQLite 封装与表结构初始化）
- src/
  - App.js（布局、导航）
  - components/
    - Dashboard.js（低库存卡片）
    - PartModels.js（型号管理，含最低库存）
    - StockIn.js / StockOut.js（分页筛选 + Excel 导出）
    - Orders.js（分页筛选 + 订单明细 + Excel 导出）
    - Inventory.js（动态聚合 + 阈值标红 + Excel 导出）
  - services/
    - partModelsService.js（型号表 CRUD 调用）

## 快速说明
- 低库存判定：current_quantity < min_threshold
- 库存计算：按 stock_in.total - stock_out.total 动态汇总
- 筛选/分页：均为服务端（IPC）实现，前端仅透传条件

## 版本
- 当前版本：1.0.12 