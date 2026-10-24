# 方块刀塔（Voxel DOTA）

浏览器里玩的 DOTA 风格单机 / 局域网联机小游戏：像素方块建模、经典英雄与物品、战争迷雾、肉山、电脑队友，以及 WebRTC 局域网联机。

## 在线试玩

打开：[像素 DOTA（腾讯云 COS）](https://pan-1254235582.cos.ap-shanghai.myqcloud.com/voxel-dota/voxel-dota.html)

推荐 Chrome / Edge。单人直接玩；局域网联机需同一 Wi‑Fi。

## 本地打开

下载本仓库后，用浏览器打开根目录的 `voxel-dota.html`（支持 `file://`）。

或从源码打包：

```bash
node build/build.js
```

测试：

```bash
node build/run-tests.js
```

## 局域网联机

1. 房主选「创建局域网房间」，生成邀请码发给朋友。
2. 朋友选「加入局域网房间」，粘贴邀请码，把应答码发回房主。
3. 选英雄、准备后由房主开始。空位可填电脑。

目前仅支持同一局域网（无复制粘贴交换连接码，无需服务器）。外网联机需要信令 / TURN，尚未做。

## 操作速览

- 左键移动 / 攻击，右键攻击指令；技能快捷键见游戏内帮助。
- `F` / `Alt+Enter` 全屏，`F10` 设置（音量、锁定鼠标），`M` 静音，`Enter` 聊天（联机）。

## 结构

- `src/` — 模块化源码（英雄、物品、AI、网络各文件独立，便于迭代）
- `build/` — 打包与 Playwright 测试
- `voxel-dota.html` — 打包后的单文件游戏

个人项目，欢迎点 star。
