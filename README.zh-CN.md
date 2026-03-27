# Yet Another Rclone Dashboard

[English README](./README.md)

面向 `rclone rcd` 的现代 Web 面板（推荐配合 Rclone v1.72.0 及以上版本使用）。



<p align="center">
  <img src="docs/screenshots/overview_cn.png" />
</p>

<details>
  <summary>点击查看更多截图</summary>
  <p><strong>连接 (Connect)</strong></p>
  <img src="docs/screenshots/connect_cn.png" />

  <p><strong>存储列表 (Remotes)</strong></p>
  <img src="docs/screenshots/remotes_cn.png" />

  <p><strong>文件浏览 (Explorer)</strong></p>
  <img src="docs/screenshots/explorer_cn.png" />

  <p><strong>任务状态 (Transfers)</strong></p>
  <img src="docs/screenshots/transfers_cn.png" />

  <p><strong>设置 (Settings)</strong></p>
  <img src="docs/screenshots/settings_cn.png" />

  <p><strong>移动端 (Mobile)</strong></p>
  <img src="docs/screenshots/mobile_cn.png" />
</details>

## 功能概览

- 连接到以 daemon 模式运行的 `rclone rcd`，并支持保存多个连接配置 (profiles)
- 查看 Rclone 基本信息与统计摘要
- 查看 remotes 以及导入/导出 rclone 配置
- 浏览目录、筛选、排序、创建目录
- 复制、同步、移动、删除文件或目录
- 在后端原生支持 `PublicLink` 时显示分享链接
- 查看运行中与历史任务，停止运行中的任务
- 多种内置主题 (Light/Dark/Vivid)
- 移动端友好

## 非开发目标与限制

- **本地文件操作与媒体流**：上传、下载、预览文件。目前的 `rclone rc` 接口设计并不能很好地支持通过 Web 界面进行大规模的文件流传输。
- **基于认证推导的公开链接**：出于安全考虑，不提供生成基于 RC Basic Auth 凭据的下载或公开链接。
- **挂载管理 (Mount/Unmount)**：在 WebUI 中远程执行挂载操作。挂载往往需要在 Rclone 运行的实际宿主环境中处理复杂的权限问题、异常退出后的清理等，不适合通过远程 Web 界面进行操作。
- **远程配置与认证**：通过复杂的交互式表单或 OAuth 流程执行 `config/create` 等远程配置操作。OAuth 流程在无头 (headless) 环境下不适合通过 Web 界面远程完成。

## 快速开始

本项目是纯静态 Web 应用，支持使用 Rclone 的 `rc-files` 参数进行部署。

### 1. 下载与准备
下载最新 Release 并解压。

### 2. 启动命令

#### 桌面环境 (本地运行)
```bash
rclone rcd --rc-files="path/to/dist" --rc-no-auth --rc-addr=127.0.0.1:5572 --rc-allow-origin=http://127.0.0.1:5572
```

#### 服务器 / 无头 (Headless) 环境
在远程服务器部署时，请务必开启认证并配置正确的访问地址：
```bash
rclone rcd --rc-files="path/to/dist" --rc-user=your_user --rc-pass=your_password --rc-addr=0.0.0.0:5572 --rc-allow-origin=http://your-server-ip:5572
```
> [!TIP]
> `--rc-allow-origin` 应当配置为浏览器实际访问该控制台的 URL（例如通过反向代理访问时的域名）。

### 3. 访问
在浏览器打开配置的地址即可开始使用。

## 鸣谢

Favicon 图标基于 Noto Emoji 资源制作。随仓库附带的授权文本见 [LICENSES/Noto-Emoji-LICENSE.txt](./LICENSES/Noto-Emoji-LICENSE.txt)。
