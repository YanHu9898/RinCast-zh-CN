# RinCast 简体中文分支（1.0.3 基础版）

> 此分支与 RinCast 上游无官方关联。源码基于 TheReal-Flo/RinCast，遵循上游 MIT 许可；各第三方组件的授权见 `THIRD_PARTY_NOTICES.md`。

## 当前交付

- **Windows PC 端**：`RinCast-1.0.3-zh-CN-Setup.exe` 为自带中文 UI 的独立安装器；同目录的 `RinCast-1.0.3-zh-CN-windows-x64.zip` 为可检查的完整文件包。本次使用 `apply-PC-zh-CN.ps1` 将程序文件更新到默认安装目录；原版完整备份保存在 `dist/backups/`。未运行安装器/卸载器，个人设置、防火墙规则、SteamVR 注册及其他系统配置未更改。
- **PC 文件替换补丁**：`RinCast-1.0.3-zh-CN-PC-ui.zip` 仅包括 WebView2 的 `ui/` 文件，请在关闭 RinCast Streamer 后备份原目录，再解压到安装目录。该补丁只处理 Web 界面，托盘和安装器原生文案需使用完整版。必须与上游 **1.0.3** 的文件匹配。
- **Quest/PICO 头显端**：`RinCast-1.0.3-zh-CN-debug.apk` 内置中文图集与显示文案，**不是额外覆盖包**。这是调试签名 APK（仅用于测试），包名 `app.rincast.vr.zhcn`，不会覆盖包名为 `app.rincast.vr` 的上游 APK；可并排安装。以后升级这个分支需要相同签名证书；如更换证书则需先卸载旧中文包。未接入头显设备，故实际 Quest/PICO 视觉和连接体验尚未实机验证。

安装 APK：开启 Quest 开发者模式，通过 SideQuest 等侧载工具安装，或在电脑上运行 `adb install -r RinCast-1.0.3-zh-CN-debug.apk`。不要把未经头显实测的调试版当作正式版传播。首次连接，使用中文 PC 端允许新头显请求。

在本机更新 PC 安装目录：解压/保留整个 `dist` 文件夹，运行 `apply-PC-zh-CN.ps1`。脚本会校验 `C:\Program Files\RinCast`、检查标记和版本、拒绝在 RinCast/SteamVR 运行时覆盖，先备份原目录，再只复制程序文件（不运行安装/卸载脚本，也不改防火墙/注册表/用户设置）。该操作需要管理员权限；如果系统 UAC 提示，请只在确认备份目录正确后允许。

## 技术方案

- PC 静态内容和动态文案来自 `pc/streamer/ui/index.html`、`app.js`、`i18n.js`，默认简体中文，英语原文作为缺词回退。可在地址后带 `?lang=en` 或 `?lang=zh-CN` 测试。
- 头显原生 UI 的译文在 `headset/app/src/main/cpp/ui/localization.h`，只在**显示与朗读**位置翻译，不改网络协议、持久化设置和控件 ID；未匹配文案按英文显示。对特定复合句和上游新增文案还需逐项实机审校。
- 头显旧 `text.png` 不含汉字，新增 `text-zh.png`/`text-zh.json` CJK SDF 图集（Noto Sans SC，SIL OFL 1.1）。可复现用的字体源文件位于 `third_party/fonts/NotoSansSC-VF.ttf`，许可证见 `THIRD_PARTY_NOTICES.md`。`tools/assetbaker/bake-zh.cpp` 从 `tools/assetbaker/zh-charset.txt` 构建子集。新译文引入新字时，需要更新 charset 并重新烘焙，缺字不得带入发布包。
- 与 Quest、PICO 的兼容代码保持原样；连接服务、音视频编解码与无线协议无意修改。

## 自行构建与验证

- Windows：CMake ≥ 3.22、Visual Studio C++；运行 `cmake -S pc -B build/pc -G "Visual Studio 18 2026" -A x64`，然后设置 `CL=/utf-8` 并 `cmake --build build/pc --config Release`。现有的上游脚本默认 Visual Studio 2022 生成器，环境不同需相应调整。
- Android：JDK 17、Android SDK 34、NDK 27.3.13750724、CMake 3.22.1；`headset/gradlew.bat -p headset assembleDebug`。正式签名见上游 `docs/BUILDING.md`，不要把私人密钥提交到仓库。
- 本次验证了 PC 源码编译、Web JS 语法与中英语字典键覆盖，以及 APK 构建、APK v2 签名、包名和内置字体资源；**未做头显实机测试**。

## 发布前剩余检查

1. Quest 3 实机逐页巡检，特别是连接、账户、SteamVR、设置、性能、中文换行/截断和朗读；对仍显示英语的本项目文案继续补译。
2. PC 完整安装和卸载的虚拟机验证，不在使用中的机器上试运行安装器；无线/USB/VR 配对回归。
3. 准备长期保管的正式签名密钥并构建正式 APK；在授权的 GitHub 账户上手动创建公开 fork、提交变更和上传发布包。此环境未登录 GitHub，**尚无实际 fork 链接**。

## 安全与清理

本次仅覆盖 `C:\Program Files\RinCast` 中的程序文件，未改用户设置或系统配置；完整原版备份保存在 `dist/backups/`。清理时只删除本次下载和构建产生的临时文件，保留源码、最终产物、备份和许可证。
