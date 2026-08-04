#!/usr/bin/env python3
"""Genera le icone PWA (192x192, 512x512, maskable) e il favicon SVG."""
import os
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, "assets", "icons")
os.makedirs(OUT, exist_ok=True)

BG = (47, 74, 43, 255)       # verde bosco
CAP = (163, 79, 46, 255)     # bruno-arancio cappello
CAP_LIGHT = (196, 120, 76, 255)
STEM = (245, 240, 230, 255)  # crema gambo
SPOT = (245, 240, 230, 255)


def draw_mushroom(size, padding_ratio=0.14, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        d.rectangle([0, 0, size, size], fill=BG)
    else:
        d.ellipse([0, 0, size, size], fill=BG)

    pad = int(size * padding_ratio)
    w = size - 2 * pad
    cx = size / 2

    # gambo
    stem_w = w * 0.34
    stem_top = size * 0.52
    stem_bottom = size * (1 - padding_ratio) - size * 0.02
    d.rounded_rectangle(
        [cx - stem_w / 2, stem_top, cx + stem_w / 2, stem_bottom],
        radius=stem_w * 0.3,
        fill=STEM,
    )

    # cappello (mezza ellisse / cupola)
    cap_top = pad + size * 0.02
    cap_bottom = size * 0.56
    cap_left = pad
    cap_right = size - pad
    d.pieslice([cap_left, cap_top, cap_right, cap_top + (cap_bottom - cap_top) * 2], 180, 360, fill=CAP)
    d.rectangle([cap_left, (cap_top + cap_bottom) / 2, cap_right, cap_bottom], fill=CAP)
    d.ellipse([cap_left, cap_bottom - size * 0.04, cap_right, cap_bottom + size * 0.04], fill=CAP)

    # puntini bianchi decorativi
    dot_positions = [(-0.20, -0.10, 0.05), (0.10, -0.16, 0.045), (0.22, -0.02, 0.04), (-0.05, -0.02, 0.035)]
    for dx, dy, dr in dot_positions:
        r = size * dr
        x = cx + size * dx
        y = cap_top + (cap_bottom - cap_top) * 0.55 + size * dy
        d.ellipse([x - r, y - r, x + r, y + r], fill=SPOT)

    return img


def save(img, path):
    img.save(path)
    print("scritto", path)


for size in (192, 512):
    save(draw_mushroom(size, maskable=False), os.path.join(OUT, f"icon-{size}.png"))
    save(draw_mushroom(size, padding_ratio=0.20, maskable=True), os.path.join(OUT, f"icon-{size}-maskable.png"))

# favicon SVG semplice (usato anche come <link rel="icon">)
favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#2f4a2b"/>
  <rect x="42" y="52" width="16" height="30" rx="6" fill="#f5f0e6"/>
  <path d="M20 52 A30 26 0 0 1 80 52 Z" fill="#a34f2e"/>
  <ellipse cx="20" cy="52" rx="0" ry="0"/>
</svg>'''
with open(os.path.join(OUT, "icon-192.svg"), "w") as f:
    f.write(favicon_svg)
print("scritto favicon svg")
