"""Refresh build/ and resources/ icons from artifacts/icon.ico and tray_frame*.png.

Windows GDI (System.Drawing.Icon) must not be used:
  - the default constructor often loads 32x32
  - it frequently cannot read the PNG-compressed 256x256 ICO frame
  - extracting 16x16 for the tray looks blurry on HiDPI (Windows upscales it)

The tray is 16 logical pixels. At 200% DPI that is 32 physical pixels, so
tray.png is the 32x32 frame. Runtime code downscales resources/icon.png (256)
or resources/tray-frame-*.png (256) to 16 * scaleFactor.
"""
from __future__ import annotations

import shutil
import struct
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'artifacts' / 'icon.ico'


def png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    w, h = struct.unpack('>II', data[16:24])
    return w, h


def save_frame(ico: Image.Image, size: tuple[int, int], dest: Path) -> None:
    available = set(ico.ico.sizes())
    if size not in available:
        raise SystemExit(f'{SRC.name} has no {size[0]}x{size[1]} frame (have {sorted(available)})')
    frame = ico.ico.getimage(size)
    if frame.size != size:
        raise SystemExit(f'expected {size}, got {frame.size}')
    dest.parent.mkdir(parents=True, exist_ok=True)
    frame.save(dest, format='PNG')
    w, h = png_size(dest)
    print(f'  {dest.relative_to(ROOT)}  {w}x{h}')


def process_tray_frames() -> None:
    for i in range(1, 5):
        src_frame = ROOT / 'artifacts' / f'tray_frame{i}.png'
        if src_frame.is_file():
            dest_256 = ROOT / 'resources' / f'tray-frame-{i}.png'
            dest_32 = ROOT / 'resources' / f'tray-frame-{i}-32.png'

            img = Image.open(src_frame).convert('RGBA')
            dest_256.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest_256, format='PNG')
            w, h = png_size(dest_256)
            print(f'  {dest_256.relative_to(ROOT)}  {w}x{h}')

            img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
            img_32.save(dest_32, format='PNG')
            w32, h32 = png_size(dest_32)
            print(f'  {dest_32.relative_to(ROOT)}  {w32}x{h32}')

    # Maintain icon-busy / tray-busy for backward compatibility
    f1_256 = ROOT / 'resources' / 'tray-frame-1.png'
    f1_32 = ROOT / 'resources' / 'tray-frame-1-32.png'
    if f1_256.is_file():
        shutil.copy2(f1_256, ROOT / 'resources' / 'icon-busy.png')
    if f1_32.is_file():
        shutil.copy2(f1_32, ROOT / 'resources' / 'tray-busy.png')


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f'missing {SRC} — place the new icon there first')

    print(f'Updating icons from {SRC.relative_to(ROOT)}')
    shutil.copy2(SRC, ROOT / 'build' / 'icon.ico')
    shutil.copy2(SRC, ROOT / 'resources' / 'icon.ico')
    print('  build/icon.ico')
    print('  resources/icon.ico')

    with Image.open(SRC) as ico:
        save_frame(ico, (256, 256), ROOT / 'build' / 'icon.png')
        save_frame(ico, (256, 256), ROOT / 'resources' / 'icon.png')
        save_frame(ico, (32, 32), ROOT / 'resources' / 'tray.png')

    process_tray_frames()

    print('done')


if __name__ == '__main__':
    sys.exit(main())

