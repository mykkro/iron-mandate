"""Create web-friendly JPG copies of the hand-drawn PNG artwork.

The source PNGs stay in place (and are git-ignored); the game loads the JPGs.
Usage: python tools/convert_handdrawn.py [--quality 85] [--max-size 800]
                                         [--smooth 7] [--thicken 0.6] [--blur 0.5] [--brightness 0.93] [--contrast 1.15]
Defaults are the shipped look; pass --smooth 0 --thicken 0 --blur 0 --brightness 1 --contrast 1 for a plain copy.
--max-size caps the longest side in pixels (0 keeps the original size).
--smooth is a median filter size (odd, 0 = off) that removes speckle and hatching noise but keeps solid lines.
--thicken blends in a dark-spreading pass (0 = off, 1 = full) so fine ink lines survive small display sizes.
--blur is a Gaussian radius in output pixels; --brightness and --contrast are multipliers (1 = unchanged).
"""
import argparse
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ART_DIR = Path(__file__).resolve().parent.parent / "assets" / "images" / "handdrawn"


def process(im, max_size=800, smooth=0, thicken=0.0, blur=0.0, brightness=1.0, contrast=1.0):
    im = im.convert("RGB")
    if smooth:
        im = im.filter(ImageFilter.MedianFilter(smooth))
    if thicken:
        # Done at source resolution: spreading dark pixels before downscaling reads as slightly bolder ink.
        im = Image.blend(im, im.filter(ImageFilter.MinFilter(3)), thicken)
    if max_size:
        im.thumbnail((max_size, max_size), Image.LANCZOS)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    if brightness != 1:
        im = ImageEnhance.Brightness(im).enhance(brightness)
    if contrast != 1:
        im = ImageEnhance.Contrast(im).enhance(contrast)
    return im


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--quality", type=int, default=85)
    parser.add_argument("--max-size", type=int, default=800)
    parser.add_argument("--smooth", type=int, default=7)
    parser.add_argument("--thicken", type=float, default=0.6)
    parser.add_argument("--blur", type=float, default=0.5)
    parser.add_argument("--brightness", type=float, default=0.93)
    parser.add_argument("--contrast", type=float, default=1.15)
    args = parser.parse_args()

    for png in sorted(ART_DIR.glob("*.png")):
        jpg = png.with_suffix(".jpg")
        with Image.open(png) as im:
            out = process(im, args.max_size, args.smooth, args.thicken, args.blur, args.brightness, args.contrast)
        out.save(jpg, "JPEG", quality=args.quality, optimize=True, progressive=True)
        print(f"{png.name}: {png.stat().st_size // 1024} KB -> {jpg.name}: {jpg.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
