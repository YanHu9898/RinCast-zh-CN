// Display-only Simplified Chinese localization for RinCast's native headset UI.
// Never translate protocol values, persistent settings or widget IDs.
#pragma once
#include <string>
#include <string_view>
#include <unordered_map>

namespace rv::l10n {
inline const std::unordered_map<std::string, std::string>& Dictionary() {
    static const std::unordered_map<std::string, std::string> k = {
        {"On","开启"},{"Off","关闭"},{"on","开启"},{"off","关闭"},{"selected","已选中"},
        {"Home","主页"},{"PCs","电脑"},{"Games","游戏"},{"Settings","设置"},{"Account","账户"},
        {"Connect","连接"},{"Disconnect","断开连接"},{"Cancel","取消"},{"Dismiss","关闭"},
        {"Try again","重试"},{"Look again","重新查找"},{"Refresh","刷新"},{"Back","返回"},
        {"Choose a PC","选择电脑"},{"Choose a game","选择游戏"},{"Connect to a PC first","请先连接电脑"},
        {"Couldn't connect","无法连接"},{"Couldn't start VR","无法启动 VR"},{"Your PC didn't answer","电脑没有响应"},
        {"Connection problem. " ,"连接出现问题。"},{"Check the connection, then try again.","请检查连接后重试。"},
        {"The connection dropped. Trying again.","连接中断，正在重试。"},{"The PC ended the session.","电脑已结束会话。"},
        {"Waiting for your PC","正在等待电脑"},{"Waiting for you to confirm","等待你确认"},
        {"Looking for your PC","正在查找电脑"},{"Still looking for your PC","仍在查找电脑"},
        {"Looking for games on your PC","正在查找电脑上的游戏"},{"No VR games found","未找到 VR 游戏"},
        {"Start SteamVR","启动 SteamVR"},{"Starting SteamVR…","正在启动 SteamVR…"},
        {"Starting game…","正在启动游戏…"},{"This can take a minute.","可能需要一点时间。"},
        {"SteamVR took too long to start. Check that it opens on your PC.","SteamVR 启动超时。请检查电脑上的 SteamVR 能否正常打开。"},
        {"VR couldn't start on your PC. Check that SteamVR opens there.","电脑无法启动 VR。请检查 SteamVR 能否打开。"},
        {"Your PC is sending the game, but this headset can't show it. Try H.264 or a lower VR quality in Settings.","电脑正在发送游戏画面，但头显无法显示。请在设置中改用 H.264 或降低 VR 画质。"},
        {"The PC has been sending for a while but no picture could be shown.","电脑已发送画面，但头显无法显示。"},
        {"On this network","本地网络"},{"On another network","其他网络"},{"Over the internet","通过互联网"},
        {"Through a VPN","通过 VPN"},{"Connected over the internet","已通过互联网连接"},
        {"Connected through a VPN","已通过 VPN 连接"},{"Connected, USB 3","已连接，USB 3"},
        {"Connected, USB 2: a USB 3 cable and port is faster","已连接，USB 2：USB 3 数据线和接口速度更快"},
        {"USB cable","USB 数据线"},{"Waiting for a cable to the PC","等待连接电脑的数据线"},
        {"Instead of Wi-Fi, with a USB-C cable to the PC","使用 USB-C 数据线连接电脑，代替 Wi-Fi"},
        {"Enter PC address","输入电脑地址"},{"Enter your PC's address","输入电脑的地址"},
        {"Look for this PC","查找这台电脑"},{"Change address","更改地址"},{"Looking at " ,"正在查找 "},
        {"No answer from " ,"没有响应："},{"Backspace","退格"},
        {"That isn't a complete address. It needs four numbers.","地址不完整，需要四组数字。"},
        {"It's on the Home page of RinCast Streamer. An address from a VPN like Tailscale works too.","可在电脑端 RinCast Streamer 的主页找到该地址。Tailscale 等 VPN 地址也可以使用。"},
        {"Check the address, that RinCast Streamer is running, and that Windows' firewall allows it.","请核对地址，确认电脑端 RinCast Streamer 正在运行且 Windows 防火墙允许连接。"},
        {"Check the firewall message in RinCast Streamer, or any security software on the PC.","请查看电脑端 RinCast Streamer 的防火墙提示，以及电脑上的安全软件。"},
        {"Put the PC and this headset on the same network. Guest Wi-Fi keeps them apart: there, sign in or use a VPN.","请让电脑与头显连接同一网络。访客 Wi-Fi 会隔离设备；此时请登录账户或使用 VPN。"},
        {"Run RinCast Streamer on your PC, on the same network as this headset.","请在与头显同一网络的电脑上运行 RinCast Streamer。"},
        {"Run RinCast Streamer on your PC. Get it from " ,"请在电脑上运行 RinCast Streamer。获取地址："},
        {" on your phone or computer, or use Account in RinCast Streamer on your PC.","，可以在手机或电脑上打开，也可在电脑端 RinCast Streamer 的“账户”页操作。"},
        {"' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au","'，由 Scott Buckley 创作，依据 CC-BY 4.0 授权。www.scottbuckley.com.au"},
        {", slow","，连接较慢"},
        {"In use. Connecting ends that session","正在使用，连接后会结束原会话"},{"Press to take over","按下以接管"},
        {"Press again","再次按下"},{"Press again to disconnect","再次按下以断开连接"},
        {"Take over","接管"},{"Offline","离线"},{"Online","在线"},{"Running","运行中"},
        {"Back to desktop","返回桌面"},{"Back to VR","返回 VR"},{"Hide menu","隐藏菜单"},
        {"Open RinCast's menu","打开 RinCast 菜单"},{"Show or hide the dock","显示或隐藏快捷栏"},
        {"Move the window","移动窗口"},{"Resize the window","调整窗口大小"},
        {"Drag the bar under a window","拖动窗口下方的控制条"},{"Drag that bar's ends","拖动控制条两端"},
        {"Keys go to the window in focus on your PC","按键将发送到电脑上当前聚焦的窗口"},
        {"VR quality","VR 画质"},{"VR graphics quality","VR 图形画质"},
        {"Quality (pixels per eye)","画质（每眼像素）"},{"Same as PC","与电脑相同"},
        {"Video codec","视频编码"},{"10-bit color","10 位色彩"},{"Needs HEVC or AV1","需要 HEVC 或 AV1"},
        {"Bitrate limit for games","游戏码率上限"},{"Use the PC's limit","使用电脑上的码率上限"},
        {"Set on the PC","在电脑上设置"},{"Adjust bitrate automatically","自动调整码率"},
        {"Frame generation","帧生成"},{"For a slow PC. Moving edges can wobble","适合性能较低的电脑，运动画面边缘可能抖动"},
        {"Sharper below Ultra. Uses more battery","在非极致画质下更清晰，但更耗电"},
        {"Small performance cost","略微影响性能"},{"Sharp text","文字锐化"},
        {"Sound volume","音量"},{"Play PC sound in the headset","在头显播放电脑声音"},
        {"Use the headset microphone","使用头显麦克风"},
        {"Allow microphone access for RinCast in " ,"请在以下位置允许 RinCast 使用麦克风："},
        {"RinCast Microphone","RinCast 麦克风"},{"Steam Streaming Microphone","Steam 串流麦克风"},
        {"Haptic feedback","触觉反馈"},{"Interface sounds","界面音效"},
        {"Scroll speed","滚动速度"},{"Background brightness","背景亮度"},
        {"High contrast","高对比度"},{"Read aloud","语音朗读"},
        {"Speaks what you point at. Needs a text-to-speech voice on the headset","朗读你指向的内容。需要在头显中安装文字转语音语音包"},
        {"Show performance","显示性能数据"},{"Hide performance","隐藏性能数据"},
        {"Performance overlay","性能叠加层"},{"Latency by stage","各阶段延迟"},
        {"Latency by stage shows once frames arrive","收到画面后将显示各阶段延迟"},
        {"Head movement to the PC","头部动作传到电脑"},{"Game and SteamVR","游戏与 SteamVR"},
        {"Waiting for the encoder","等待编码器"},{"Encoding","编码"},
        {"Capture and encoding","采集与编码"},{"Video to the headset","画面传到头显"},
        {"Waiting for the next frame","等待下一帧"},{"Compositor and display","画面合成与显示"},
        {"Latency","延迟"},{"Frame rate","帧率"},{"Bitrate","码率"},
        {"Frame rate (fps)","帧率（fps）"},{"Frame rate, frames per second","帧率，每秒帧数"},
        {"Controllers and hands","手柄与双手"},{"Hands in games","游戏中的双手"},
        {"Pinch for the trigger, fist to grab","捏合模拟扳机，握拳模拟抓取"},
        {"Finger tracking with controllers","手柄手指追踪"},{"Body tracking","身体追踪"},
        {"Face tracking","面部追踪"},{"Turns off Body tracking","会关闭身体追踪"},
        {"Not allowed on the headset. Turn this off and on to be asked again","头显尚未授权。关闭后重新开启以再次请求权限"},
        {"On the PC, choose Allow once or Always allow.","请在电脑上选择“仅本次允许”或“始终允许”。"},
        {"Sign in","登录"},{"Sign out","退出登录"},{"Sign in for other networks","登录以连接其他网络"},
        {"Reach your PCs from any network","在任何网络访问你的电脑"},{"Enter this code","输入此代码"},
        {"Getting a code","正在获取代码"},{"Your sign-in code is " ,"你的登录代码是 "},
        {"Sign in with the same account as RinCast Streamer. You don't need one on your own network.","使用与 RinCast Streamer 相同的账户登录。在本地网络中无需账户。"},
        {"Press again to sign out","再次按下以退出登录"},{"Not now","暂不"},
        {"Auto connect","自动连接"},{"To the last PC, when RinCast opens","打开 RinCast 时连接上次使用的电脑"},
        {"Show text","显示文字"},{"Hide text","隐藏文字"},
        {"Show what I typed","显示我输入的内容"},{"Hide what I typed","隐藏我输入的内容"},
        {"B, Y or a long pinch","B、Y 键或长按捏合"},
        {"In a game: left menu twice, or hold A and B","在游戏中：连按两次左手菜单键，或按住 A 和 B"},
        {"For RinCast's menu in a game: double-press the left menu button, or hold A and B.","游戏中打开 RinCast 菜单：连按两次左手菜单键，或按住 A 和 B。"},
        {"Left menu button","左手菜单键"},{"Press the stick","按下摇杆"},
        {"Stick, or pinch and move","摇杆，或捏合后移动"},{"Trigger or pinch","扳机键或捏合"},
        {"No answer from your PC","电脑没有响应"},
        {"Its VR games are listed here.","这台电脑上的 VR 游戏会显示在这里。"},
        {"Start RinCast Streamer on it","请在这台电脑上启动 RinCast Streamer"},
        {"Until a PC is connected","直到连接到电脑"},
        {"Reconnecting","正在重新连接"},
        {"Network","网络"},{"Decoding","解码"},{"Video","视频"},{"Other networks","其他网络"},
        {"Resume","继续"},{"Restart","重启"},{"Space","空格"},{"Enter","回车"},
        {"Close","关闭"},{"Automatic","自动"},{"Low","低"},{"Medium","中"},
        {"High","高"},{"Ultra","极致"},{"Window","窗口"},
        {"Connected to","已连接到"},{" ms round trip"," 毫秒往返"},
        {" ms"," 毫秒"},{" fps"," 帧"},{" Mbps"," Mbps"},
        {"Frame generation: %u frames in the last %.0f s","帧生成：最近 %u 帧，%.0f 秒"},
        {"Slow over the internet. A faster connection helps","互联网连接较慢，更快的网络会改善体验"},
        {"Slow through the VPN. A direct path between the devices helps","VPN 连接较慢，两台设备直连会有所改善"},
        {"Slow. A cable from the PC to the router helps most","连接较慢，用网线将电脑接到路由器效果最好"},
        {"VR games you install in Steam show up here. They need SteamVR.","安装在 Steam 中的 VR 游戏会出现在这里，需要 SteamVR。"},
        {"Not affiliated with Meta, Valve or Virtual Desktop.","与 Meta、Valve 或 Virtual Desktop 无关联。"},
        {"Free and open source under the MIT license. Licenses for the parts it uses are in THIRD_PARTY_NOTICES.md, in every release. " ,"根据 MIT 许可证免费开源。第三方组件的许可见每个版本随附的 THIRD_PARTY_NOTICES.md。"}
    };
    return k;
}

// Only use this at presentation boundaries. Preserve unknown text verbatim so
// server strings, names, URLs and future upstream messages never disappear.
inline std::string Translate(std::string_view english) {
    if (english.empty()) return {};
    const auto& dict = Dictionary();
    auto it = dict.find(std::string(english));
    if (it != dict.end()) return it->second;
    // Compose labels that contain a device name, address or a server URL.
    static const std::pair<std::string_view, std::string_view> prefixes[] = {
        {"Connected to ","已连接到 "},{"Connecting to ","正在连接 "},
        {"Looking at ","正在查找 "},{"No answer from ","没有响应："},
        {"Signed in as ","当前登录用户："},{"Go to ","请访问 "},
        {"On the PC it's ","电脑上的名称是 "},
        {"Account server: ","账户服务器："},
        {"Latency ","延迟 "}
    };
    std::string out(english);
    for (auto [before, after] : prefixes) {
        if (english.size() > before.size() && english.substr(0, before.size()) == before) {
            out = std::string(after) + std::string(english.substr(before.size()));
            break;
        }
    }
    // Dynamic lines keep a device/server/song name in English, but translate their suffix.
    static const std::pair<std::string_view, std::string_view> suffixes[] = {
        {" on your phone or computer, or use Account in RinCast Streamer on your PC.",
         "，可以在手机或电脑上打开，也可在电脑端 RinCast Streamer 的“账户”页操作。"},
        {" by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
         "，由 Scott Buckley 创作，依据 CC-BY 4.0 授权。www.scottbuckley.com.au"},
        {", slow", "，连接较慢"},
    };
    for (auto [before, after] : suffixes) {
        const size_t at = out.find(before);
        if (at != std::string::npos) out.replace(at, before.size(), after);
    }
    return out;
}
}  // namespace rv::l10n
