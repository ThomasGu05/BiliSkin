#!/usr/bin/env python3
"""生成扩展图标（渐变底 + 毛玻璃卡片 + 播放按钮），无需外部素材。

用法: python3 tools/make_icons.py
依赖: Pillow
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "icons")
SIZE = 1024
SS = 4          # 三角形等形状的超采样倍数
GRAD = 256      # 渐变先在小尺寸生成再放大，速度快且足够平滑


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient(size=SIZE):
    g = Image.new("RGB", (GRAD, GRAD))
    px = g.load()
    c1 = (0x00, 0xAE, 0xEC)   # bilibili 蓝
    c2 = (0x2B, 0x6C, 0xFF)
    c3 = (0xFB, 0x72, 0x99)   # bilibili 粉
    for y in range(GRAD):
        for x in range(GRAD):
            t = (x / GRAD) * 0.6 + (y / GRAD) * 0.4
            if t < 0.62:
                px[x, y] = lerp(c1, c2, t / 0.62)
            else:
                px[x, y] = lerp(c2, c3, (t - 0.62) / 0.38)
    return g.resize((size, size), Image.LANCZOS)


def build():
    S = SIZE
    bg = gradient(S).convert("RGBA")

    # 顶部柔光，让左上角更亮
    glow = Image.new("L", (S, S), 0)
    ImageDraw.Draw(glow).ellipse(
        [-S * 0.55, -S * 0.85, S * 1.0, S * 0.5], fill=150
    )
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.09))
    glow = glow.point(lambda v: int(v * 0.5))
    bg = Image.composite(Image.new("RGBA", (S, S), (255, 255, 255, 255)), bg, glow)

    # 毛玻璃卡片（模拟“皮肤”盖在背景上）
    card = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    pad_x, pad_y = int(S * 0.17), int(S * 0.25)
    cd.rounded_rectangle(
        [pad_x, pad_y, S - pad_x, S - pad_y],
        radius=int(S * 0.085),
        fill=(255, 255, 255, 46),
        outline=(255, 255, 255, 145),
        width=int(S * 0.012),
    )
    bg = Image.alpha_composite(bg, card)

    # 卡片中央的播放三角形
    tri = Image.new("RGBA", (S * SS, S * SS), (0, 0, 0, 0))
    td = ImageDraw.Draw(tri)
    cx, cy, r = S * 0.5, S * 0.5, S * 0.118
    pts = [
        (cx - r * 0.80, cy - r),
        (cx - r * 0.80, cy + r),
        (cx + r * 1.06, cy),
    ]
    td.polygon([(x * SS, y * SS) for x, y in pts], fill=(255, 255, 255, 240))
    tri = tri.resize((S, S), Image.LANCZOS)
    bg = Image.alpha_composite(bg, tri)

    # 圆角裁切（iOS 风格圆角）
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, S - 1, S - 1], radius=int(S * 0.225), fill=255
    )
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    master = build()
    for size in (16, 32, 48, 128):
        path = os.path.join(OUT, "icon%d.png" % size)
        master.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print("written", path, os.path.getsize(path), "bytes")
    master.resize((512, 512), Image.LANCZOS).save(
        os.path.join(OUT, "icon512.png"), optimize=True
    )


if __name__ == "__main__":
    main()
