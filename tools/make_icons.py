# -*- coding: utf-8 -*-
"""
產生 PWA 圖示：原創的藍黃配色手持機造型（Digivice 風格，不含任何角色圖像）。
用法：python tools/make_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
S = 1024
BLUE, NAVY, YELLOW, WHITE = (30, 91, 214), (14, 31, 61), (245, 197, 24), (243, 246, 252)

# 背景：藍到深藍的斜向漸層
img = Image.new("RGB", (S, S))
px = img.load()
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * (S - 1))
        px[x, y] = tuple(int(BLUE[i] * (1 - t) + NAVY[i] * t) for i in range(3))

# 機身陰影
shadow = Image.new("L", (S, S), 0)
ImageDraw.Draw(shadow).rounded_rectangle((212, 262, 836, 826), radius=120, fill=120)
shadow = shadow.filter(ImageFilter.GaussianBlur(28))
img = Image.composite(Image.new("RGB", (S, S), (6, 12, 28)), img, shadow)

d = ImageDraw.Draw(img)
# 機身
d.rounded_rectangle((196, 236, 820, 800), radius=120, fill=WHITE, outline=NAVY, width=18)
# 上方吊環
d.rounded_rectangle((250, 170, 360, 260), radius=40, outline=WHITE, width=22)
# 螢幕外框與液晶
d.rounded_rectangle((262, 318, 628, 718), radius=44, fill=NAVY)
d.rounded_rectangle((292, 348, 598, 688), radius=26, fill=(22, 52, 104))

# 螢幕內的原創點陣圖案（字母 D）
glyph = [
    "11110",
    "10001",
    "10001",
    "10001",
    "10001",
    "11110",
]
cell = 36
gx = 445 - len(glyph[0]) * cell // 2
gy = 518 - len(glyph) * cell // 2
for r, row in enumerate(glyph):
    for c, ch in enumerate(row):
        if ch == "1":
            d.rectangle((gx + c * cell + 3, gy + r * cell + 3, gx + (c + 1) * cell - 3, gy + (r + 1) * cell - 3), fill=YELLOW)

# 右側三顆按鍵
for cy in (392, 518, 644):
    d.ellipse((676, cy - 46, 768, cy + 46), fill=YELLOW, outline=NAVY, width=12)

# 底部黃色飾條
d.rounded_rectangle((300, 742, 590, 766), radius=12, fill=YELLOW)

for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(DOCS, name), optimize=True)
    print("OK", name)
