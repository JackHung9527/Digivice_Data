# -*- coding: utf-8 -*-
"""產生 PWA 圖示（純文字設計，不含任何角色圖像）。用法：python tools/make_icons.py"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
S = 1024


def font(names, size):
    for n in names:
        p = os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts", n)
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def center_text(draw, y, text, f, fill):
    box = draw.textbbox((0, 0), text, font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    draw.text(((S - w) / 2 - box[0], y - h / 2 - box[1]), text, font=f, fill=fill)


img = Image.new("RGB", (S, S))
px = img.load()
for y in range(S):
    t = y / (S - 1)
    r = int(0x3b * (1 - t) + 0x12 * t)
    g = int(0x20 * (1 - t) + 0x0a * t)
    b = int(0x66 * (1 - t) + 0x1f * t)
    for x in range(S):
        px[x, y] = (r, g, b)

# 中央紫色光暈
glow = Image.new("L", (S, S), 0)
ImageDraw.Draw(glow).ellipse((S * .18, S * .14, S * .82, S * .78), fill=150)
glow = glow.filter(ImageFilter.GaussianBlur(110))
img = Image.composite(Image.new("RGB", (S, S), (170, 110, 255)), img, glow)

d = ImageDraw.Draw(img)
big = font(["seguibl.ttf", "arialbd.ttf", "Arial.ttf"], 520)
small = font(["seguibl.ttf", "arialbd.ttf", "Arial.ttf"], 150)
center_text(d, S * .45, "G", big, (255, 255, 255))
center_text(d, S * .72, "70th", small, (255, 204, 77))

for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(DOCS, name), optimize=True)
    print("OK", name)
