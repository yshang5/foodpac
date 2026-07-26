# foodPac Logo 源文件

定稿版（2026-07-26）：手提纸袋图标（袋身印 food、橙色提手）+ Space Grotesk 字标（叶子在第一个 o 上）。

- `logo-a.html` — 横版完整 logo 源文件（icon + 字标），像素级对齐参数都在内联 CSS 里
- `icon-only.html` — 方形袋子图标源文件
- `sg-500.ttf` / `sg-700.ttf` — Space Grotesk 字体（fontsource）

## 重新渲染

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"   # 或 chromium
"$CHROME" --headless --screenshot=logo.png --window-size=1600,480 \
  --default-background-color=00000000 --virtual-time-budget=4000 "file://$PWD/logo-a.html"
"$CHROME" --headless --screenshot=icon.png --window-size=512,512 \
  --default-background-color=00000000 --virtual-time-budget=4000 "file://$PWD/icon-only.html"
```

渲染后用 PIL 按内容 bbox 裁剪加 20px 留白。favicon/apple-touch-icon 由 icon.png 缩放生成
（apple-touch-icon 需白底）。产物放 `frontend/assets/images/`：
logo-horizontal-v2.png, logo-icon.png, favicon.ico, favicon-32.png, apple-touch-icon.png
