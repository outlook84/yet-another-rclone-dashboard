# Yet Another Rclone Dashboard

[中文说明](./README.zh-CN.md)

Modern Web Dashboard for `rclone rcd` (Rclone v1.72.0 or later recommended).



<p align="center">
  <img src="docs/screenshots/overview.png" width="600" />
</p>

<details>
  <summary>Click to view more screenshots</summary>
  <div align="center">
    <table>
      <tr>
        <td valign="top"><img src="docs/screenshots/connect.png"/><br/>Connect</td>
        <td valign="top"><img src="docs/screenshots/remotes.png"/><br/>Remotes</td>
      </tr>
      <tr>
        <td valign="top"><img src="docs/screenshots/explorer.png"/><br/>Explorer</td>
        <td valign="top"><img src="docs/screenshots/transfers.png"/><br/>Transfers</td>
      </tr>
      <tr>
        <td valign="top"><img src="docs/screenshots/settings.png"/><br/>Settings</td>
        <td valign="top"><img src="docs/screenshots/mobile.png" width="220"/><br/>Mobile</td>
      </tr>
    </table>
  </div>
</details>

## Features

- connect to `rclone rcd` running in daemon mode, supporting multiple connection profiles
- inspect Rclone system information and status summary
- inspect remotes and import/export rclone configuration
- browse directories, filter, sort, and create folders
- copy, sync, move, and delete files or directories
- show public links only when the backend reports native `PublicLink` support
- inspect running and completed jobs, and stop active jobs
- multiple built-in themes (Light/Dark/Vivid)
- mobile friendly

## Deliberate Non-Goals & Not Planned

- **Local File Operations & Media Streaming**: Uploading, downloading, or previewing files. The current `rclone rc` interface is not optimized for streaming large files through WebUI interface.
- **Auth-derived Public Links**: For security reasons, this project does not support generating public or download links by deriving them from RC Basic Auth credentials.
- **Mount Management**: Mounting or unmounting remotes. These operations typically require specific OS permissions and complex lifecycle management (e.g., handling hangs or abnormal exits) in the environment where Rclone is physically running, making them unsuitable for reliable remote WebUI control.
- **Remote Configuration & Auth**: Performing complex interactive configurations (`config/create`, `config/update`) or OAuth flows. OAuth authentication is often problematic in headless environments and not suitable for remote WebUI completion.

## Quick Start

This dashboard is a static Web application that can be served directly using Rclone's `rc-files` feature.

### 1. Download & Prepare
Download the latest release and extract it.

### 2. Run Command

#### Desktop Environment (Local)
```bash
rclone rcd --rc-files="path/to/dist" --rc-no-auth --rc-addr=127.0.0.1:5572 --rc-allow-origin=http://127.0.0.1:5572
```

#### Headless / Server Environment
When deploying on a remote server, ensure authentication is enabled and the origin is correctly configured:
```bash
rclone rcd --rc-files="path/to/dist" --rc-user=your_user --rc-pass=your_password --rc-addr=0.0.0.0:5572 --rc-allow-origin=http://your-server-ip:5572
```
> [!TIP]
> Set `--rc-allow-origin` to the actual URL used to access the dashboard in your browser (e.g., your domain if using a reverse proxy).

### 3. Open Browser
Navigate to the configured address to start using the dashboard.
