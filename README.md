# RinCast 简体中文分支（zh-CN，非官方）

> 本仓库是基于 [TheReal-Flo/RinCast](https://github.com/TheReal-Flo/RinCast) 的非官方简体中文本地化分支，主要维护 PC 串流端与 Quest/PICO 头显端的中文界面及必要的字体、界面适配。RinCast 原项目和上游代码归原作者及贡献者；本分支不主张原创或所有权。

RinCast 是一款免费开源软件，可将 Windows 电脑串流到 Meta Quest 3 或 PICO 4。你可以在沉浸式空间中查看和控制多台显示器，也可以通过 SteamVR 游玩 PC VR 游戏。无需订阅或购买软件。

- **桌面串流：**每台显示器都可以作为独立的悬浮屏幕，支持曲面或平面显示，并可使用控制器和虚拟键盘操作。
- **PC VR：**SteamVR 会识别头显与 Touch 控制器；你可以从头显启动 Steam VR 游戏。OpenXR 游戏通过 SteamVR 运行；本版本不包含独立的 OpenXR 运行时。
- **视频编码：**支持由 NVIDIA NVENC、AMD AMF 或 Windows Media Foundation 硬件编码的 H.264、HEVC 和 AV1。
- **隐私：**所有数据包均经过加密；串流数据始终在头显与电脑之间直接传输。
- **家庭网络无需账号：**同一网络中的电脑会自动显示。可选账号支持从其他网络连接。

## 系统要求

- 64 位 Windows 10 或 Windows 11，并配备支持视频编码的 NVIDIA、AMD 或 Intel 显卡。
- [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)（Windows 11 和大多数 Windows 10 电脑已预装）。
- Meta Quest 3；安装应用需开启[开发者模式](https://developers.meta.com/horizon/documentation/native/android/mobile-device-setup/)。PICO 4 和 PICO 4 Ultra 使用同一应用（尚未实机验证）：在 **设置 > 通用 > 关于** 中连续点击 **软件版本** 七次，再进入 **开发者 > USB 调试** 开启 USB 调试。
- 游玩 VR 游戏需要 Steam 和 SteamVR。
- 建议电脑通过网线连接路由器，头显使用 5 GHz 或 6 GHz Wi-Fi。

## 快速开始

1. 从本分支的 [Releases 发布页](../../releases) 下载同版本的 `RinCast-<版本>-Setup.exe` 和 `RinCast-<版本>.apk`。如果发布页尚无安装包，请按下方“从源码构建”说明自行构建。
2. 运行 `RinCast-<版本>-Setup.exe`。Windows 会请求管理员权限。也可以解压 `RinCast-<版本>-windows-x64.zip`，右键 `install.ps1` 并选择“使用 PowerShell 运行”。
3. 在头显上安装应用：可运行 `adb install -r RinCast-<版本>.apk`，也可使用 SideQuest 等侧载工具。
4. 在头显应用列表中打开 **RinCast**（Quest 上位于“未知来源”）。
5. 从列表中选择电脑；首次连接时，在电脑端允许该头显连接。

安装程序会为专用网络和域网络添加防火墙规则。如果 Windows 将当前网络设为公用，RinCast Streamer 主页会显示提示。你可以在 Windows 中将网络改为专用，或在串流端 **通用 > 网络** 中开启 **允许头显在公用网络上连接**。开启后，同一公用网络中的其他设备可能看到电脑并请求连接；新头显仍需在电脑端获准。卸载请前往 Windows **设置 > 应用 > 已安装的应用**。

发行文件目前尚未进行代码签名，Windows SmartScreen 可能会显示安全提示。

## 音频

RinCast 可将电脑声音传到头显，也可以将头显麦克风传回电脑。完整音频功能需要虚拟音频设备。串流端 **音频 > 音频设备** 提供三种模式：

| 模式 | 适用情况 | 麦克风 |
|---|---|---|
| **Steam 串流设备** | 默认发行配置；需要 Steam 的设备 | 支持 |
| **RinCast 自有设备** | 仅适用于带有微软签名驱动的安装包 | 支持 |
| **系统默认设备** | 无需虚拟设备 | 不支持 |

Windows 不会加载未经微软签名的内核驱动，因此正式发行包通常不附带 RinCast 音频驱动，而使用 Steam 自带设备。启用方法见[构建文档中的音频模式说明](docs/BUILDING.md#audio-modes)。

## 使用 USB 数据线连接

Horizon OS 2.5 或更高版本支持用 USB-C 数据线代替 Wi-Fi 连接电脑，可避免无线干扰；使用 USB 3 数据线和接口时，带宽通常也高于 Wi-Fi。

1. 在 Quest 的设置中开启 **通用 > USB 数据线**，然后将头显连接到电脑。
2. 头显首次询问 RinCast 是否可以使用数据线时，选择允许。
3. 电脑列表中会显示 **USB 数据线**，选择它即可连接。

Windows 会将这条数据线网络识别为未知网络，并将其归类为公用网络。RinCast Streamer 主页会提供 **允许 USB 数据线** 按钮；允许后只开放这条 USB 网络，不影响其他网络。Windows 11 通常可自动识别头显；Windows 10 可能需要相应的 USB 网络驱动。

## PICO 动作追踪器

在 PICO 头显中，开启 **VR 画质 > 身体追踪** 后，PICO Motion Tracker 会作为追踪器传给 SteamVR，使用方式与 Quest 身体追踪类似。请先在 PICO 的 Motion Tracker 应用中配对追踪器。追踪器不会报告佩戴位置，因此 RinCast 会根据初次识别时的高度推断：地面高度为脚部、膝盖高度为膝部，更高的位置会推断为腰部或胸部。开启 **身体追踪** 时请保持站直；移动追踪器后，先关闭再重新开启该选项。如果头显能依据追踪器估算全身姿态，此选项会优先使用该功能，**校准**按钮会打开 PICO 校准界面。

## 不使用账号，通过 VPN 连接

如果电脑和头显连接到同一个 VPN（例如 Tailscale、ZeroTier 或 WireGuard），就不需要账号：

1. 在电脑和 Quest 上都连接 VPN。
2. 在 RinCast Streamer 的 **主页** 查看电脑的 VPN 地址。
3. 在 Quest 上选择 **输入电脑地址** 并输入该地址；找到后即可从电脑列表连接。

如果本地网络和 VPN 都能访问电脑，RinCast 会优先使用本地网络。如果 Windows 将 VPN 网络设为公用，请开启 **允许头显在公用网络上连接**，或将该网络改为专用网络。

## 从其他网络连接

在 PC 串流端的 **账户** 页面和头显上登录同一个 RinCast 账号。头显会显示一个短代码，需要在电脑或手机上确认。服务器只负责帮助设备相互发现；串流仍通过 IPv6、UDP 打洞或路由器端口映射，在两台设备间直接传输。

你也可以自行运行账户服务器，详见 [server/README.md](server/README.md)。

## RinCast 尚未实现的功能

与 [Virtual Desktop](https://www.vrdesktop.net/) 相比，目前仍缺少以下功能；现有功能清单见 [`docs/FEATURES.md`](docs/FEATURES.md)。

**已实现但尚未在头显实机验证的功能（部分默认关闭）：**

- 类似 Synchronous Spacewarp（SSW）的帧生成
- 头显端升频，例如 Snapdragon Game Super Resolution
- 将身体追踪数据作为 SteamVR 追踪器，以及 PICO Motion Tracker 支持
- 在 PC 游戏中使用手部和手指追踪
- 面部与眼动追踪（供 VRCFaceTracking 使用）
- USB 数据线连接
- PICO 头显上的全部功能

**画面与流畅度：**

- 锐化强度滑块（目前自动锐化）
- AMD 和 Intel 显卡的固定注视点编码区域（目前仅支持 NVENC）
- 超高码率 H.264 模式，例如 H.264+
- 伽马、鲜艳度和视频范围控制

**追踪：**

- 眼动追踪注视点串流
- 支持与真实追踪器混合使用的舞台追踪选项

**游戏：**

- 不依赖 SteamVR 的 OpenXR 运行时
- Oculus Rift 游戏
- 从头显启动非 Steam 游戏
- Xbox 手柄模拟

**透视：**

- 在运行 VR 游戏时叠加透视画面，并可调节透明度
- 仅显示手部的透视、桌面窗口和受追踪键盘

**视频与桌面：**

- 在桌面屏幕播放左右格式（SBS）的 3D 视频
- 在头显播放本地视频文件
- PC 端键盘快捷键
- 只串流单个窗口或应用，而不是整台显示器

**平台：**

- Quest 3 和 PICO 4 以外的头显
- Linux 串流：计划先支持桌面；Linux 上的 PC VR 需要基于 Monado 的运行时，因为 Linux 版 SteamVR 无法向驱动传递画面帧。
- macOS 串流

## 从源码构建

完整步骤见 [`docs/BUILDING.md`](docs/BUILDING.md)。简要构建命令如下：

```powershell
scripts\build-all.ps1           # 将全部构建产物输出到 dist\
```

## 文档

- [`docs/FEATURES.md`](docs/FEATURES.md)：当前已实现和计划中的功能。
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)：各模块的组成方式。
- [`docs/PROTOCOL.md`](docs/PROTOCOL.md)：网络协议。
- [`docs/BUILDING.md`](docs/BUILDING.md)：工具链、构建、测试、签名与发行说明。
- [`server/README.md`](server/README.md)：账户服务器的运行方法。
- [`CONTRIBUTING.md`](CONTRIBUTING.md) 和 [`SECURITY.md`](SECURITY.md)：贡献指南与安全政策。

| 组件 | 路径 | 说明 |
|---|---|---|
| RinCast Streamer | `pc/streamer` | Windows 托盘程序和 WebView2 界面，负责画面采集、编码、输入、音频、配对和 SteamVR 控制。 |
| SteamVR 驱动 | `pc/driver-openvr` | 向 SteamVR 注册 RinCast 头显与控制器。 |
| 音频驱动 | `pc/audio-driver` | 可选的 RinCast 虚拟音频设备内核驱动。 |
| 头显应用 | `headset` | 基于 OpenXR 的原生应用，支持 Quest 与 PICO；两类设备的差异代码位于 `headsets/`。 |
| 账户服务器 | `server` | 提供账号、头显登录代码、PC 在线状态和连接协商服务的 Go 程序。 |
| rincast-core | `shared` | PC 与头显共用的协议、加密、传输、前向纠错、Opus 音频及设备发现代码。 |

## 许可证

RinCast 采用 [MIT 许可证](LICENSE)，但 `pc/audio-driver/src` 源自微软示例，仍采用 Microsoft Public License。第三方组件各自保留原许可证，详见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。

头显尚未连接电脑时播放的背景音乐由 Scott Buckley 创作（www.scottbuckley.com.au），曲目包括《Electric Dreams》《Twilight Echo》《Machina》和《Tears In Rain》，采用 [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可证。

## 贡献者

- **YanHu9898** — `zh-CN` 分支维护者与发行整合者。
- **Codex（OpenAI）** — AI 编程助手，在维护者指导下协助实现 PC/头显汉化、CJK 字体图集支持和发行打包。

## 免责声明

RinCast 是独立项目，与 Meta、Oculus、PICO、ByteDance、Virtual Desktop Inc.、Valve 或 Microsoft 均无隶属、背书或赞助关系。相关名称和产品名称均为各自所有者的商标，本项目仅在说明兼容性时使用。
