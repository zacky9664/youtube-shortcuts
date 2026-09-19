#!/usr/bin/env python3
"""Generate Chrome Web Store screenshots and promo tiles.

Screenshots are captured from real UI fixtures (same CSS as the extension)
via headless Chrome, then saved as 1280x800 JPEG (no alpha).
Promo tiles are drawn with PIL.
"""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store" / "assets"
FIXTURES = ROOT / "store" / "fixtures"
ICON = ROOT / "icons" / "icon128.png"

CHROME = Path(
    os.environ.get(
        "CHROME_PATH",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
)

# Brand (promo tiles)
BG0 = (20, 17, 15, 255)
BG1 = (31, 25, 21, 255)
INK = (244, 235, 225, 255)
MUTED = (185, 169, 154, 255)
ACCENT = (228, 87, 46, 255)
ACCENT2 = (240, 162, 2, 255)
CARD = (255, 255, 255, 18)
LINE = (244, 235, 225, 40)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        try:
            if path.endswith(".ttc"):
                return ImageFont.truetype(path, size, index=0)
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def paint_bg(img: Image.Image) -> None:
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(h):
        t = y / max(h - 1, 1)
        r = int(BG0[0] * (1 - t) + BG1[0] * t)
        g = int(BG0[1] * (1 - t) + BG1[1] * t)
        b = int(BG0[2] * (1 - t) + BG1[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.ellipse([-200, -260, 700, 420], fill=(228, 87, 46, 48))
    od.ellipse([w - 520, -180, w + 160, 420], fill=(240, 162, 2, 36))
    img.alpha_composite(overlay)


def rr(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def paste_icon(img: Image.Image, xy: tuple[int, int], size: int) -> None:
    if not ICON.exists():
        return
    icon = Image.open(ICON).convert("RGBA").resize((size, size))
    img.alpha_composite(icon, xy)


def keycap(draw, x, y, w, h, label, fnt):
    rr(draw, [x, y, x + w, y + h], 10, (255, 255, 255, 12), outline=LINE, width=1)
    tw, th = text_size(draw, label, fnt)
    draw.text((x + (w - tw) / 2, y + (h - th) / 2 - 1), label, fill=INK, font=fnt)


def capture_fixture(html_name: str, out_stem: str) -> Path:
    """Capture a fixture page with headless Chrome → 1280x800 JPEG (no alpha)."""
    if not CHROME.is_file():
        raise SystemExit(f"Chrome not found: {CHROME}")

    html = FIXTURES / html_name
    if not html.is_file():
        raise SystemExit(f"missing fixture: {html}")

    with tempfile.TemporaryDirectory() as tmp:
        png_path = Path(tmp) / "shot.png"
        cmd = [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=1280,800",
            f"--screenshot={png_path}",
            html.resolve().as_uri(),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        img = Image.open(png_path)
        # Crop / pad to exact store size if Chrome returns something else
        img = img.convert("RGB")
        if img.size != (1280, 800):
            canvas = Image.new("RGB", (1280, 800), (20, 17, 15))
            canvas.paste(img, (0, 0))
            img = canvas.crop((0, 0, 1280, 800))
        out = OUT / f"{out_stem}.jpg"
        img.save(out, "JPEG", quality=92, optimize=True, progressive=True)
        return out


def promo_tile() -> Path:
    w, h = 440, 280
    img = Image.new("RGBA", (w, h), BG0)
    paint_bg(img)
    draw = ImageDraw.Draw(img)
    paste_icon(img, (28, 28), 64)
    draw.text((28, 114), "YouTube Shortcuts", fill=INK, font=font(26, True))
    draw.text((28, 158), "好きなキーで YouTube を操作。", fill=MUTED, font=font(16))
    for i, label in enumerate(["K", "J", "L", "F"]):
        keycap(draw, 28 + i * 72, 210, 56, 36, label, font(15))
    path = OUT / "promo-small-440x280.png"
    img.convert("RGB").save(path, "PNG", optimize=True)
    return path


def promo_marquee() -> Path:
    w, h = 1400, 560
    img = Image.new("RGBA", (w, h), BG0)
    paint_bg(img)
    draw = ImageDraw.Draw(img)
    paste_icon(img, (80, 80), 128)
    draw.text((240, 100), "YouTube Shortcuts", fill=ACCENT2, font=font(56, True))
    draw.text(
        (240, 180),
        "再生・シーク・音量などを、好みのキーボードショートカットに。",
        fill=MUTED,
        font=font(28),
    )
    pairs = [("再生", "K"), ("シーク", "J / L"), ("音量", "↑ / ↓"), ("全画面", "F")]
    x = 80
    for title, key in pairs:
        rr(draw, [x, 320, x + 280, 460], 18, CARD, outline=LINE, width=1)
        draw.text((x + 28, 350), title, fill=MUTED, font=font(20))
        draw.text((x + 28, 400), key, fill=INK, font=font(36, True))
        x += 310
    path = OUT / "promo-marquee-1400x560.png"
    img.convert("RGB").save(path, "PNG", optimize=True)
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("screenshot-*"):
        old.unlink()

    screenshots = [
        capture_fixture("shot-options.html", "screenshot-1-options-1280x800"),
        capture_fixture("shot-overview.html", "screenshot-2-overview-1280x800"),
        capture_fixture("shot-popup.html", "screenshot-3-popup-1280x800"),
    ]
    assert len(screenshots) <= 5, "Chrome Web Store allows at most 5 screenshots"

    promos = [promo_tile(), promo_marquee()]
    for p in screenshots + promos:
        im = Image.open(p)
        print(p.relative_to(ROOT), im.size, im.mode, p.suffix)


if __name__ == "__main__":
    main()
