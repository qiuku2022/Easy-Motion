#!/usr/bin/env python3
"""
EasyMotion Application Icon Generator (Pure Vector Pipeline)
- Takes SVG vector source: apps/electron/resources/icons/app-icon.svg
- Uses Electron/Chromium offscreen renderer to generate 1024x1024 pixel-perfect PNG
- Uses Pillow to generate Windows standard multi-resolution .ico (16, 24, 32, 48, 64, 128, 256)
- Deploys to apps/electron/build and apps/electron/src/renderer/public
"""

import os
import subprocess
import sys
from PIL import Image

def generate_icons():
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    export_script = os.path.join(workspace_root, "scripts", "export_app_icon.js")
    build_dir = os.path.join(workspace_root, "apps", "electron", "build")
    build_png = os.path.join(build_dir, "icon.png")
    build_ico = os.path.join(build_dir, "icon.ico")

    # 1. Run Electron script to render SVG to 1024x1024 PNG
    print("1. Rendering SVG vector master to 1024x1024 PNG with Electron Chromium...")
    cmd = ["pnpm", "--filter", "@easymotion/electron", "exec", "electron", export_script]
    res = subprocess.run(cmd, cwd=workspace_root, shell=True, capture_output=True, text=True)
    if res.returncode != 0:
        print("Electron render failed:", res.stderr)
        sys.exit(1)
    print(res.stdout.strip())

    # 2. Package multi-size .ico
    print("2. Packaging Windows multi-resolution .ico...")
    im = Image.open(build_png)
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    im.save(build_ico, format="ICO", sizes=ico_sizes)
    print(f"Generated {build_ico} with sizes {ico_sizes} ({os.path.getsize(build_ico)} bytes)")
    print("Vector application icons successfully generated and deployed!")

if __name__ == "__main__":
    generate_icons()
