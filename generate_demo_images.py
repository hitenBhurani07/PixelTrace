"""
Script to create a clean folder of sample test evidence images
for manual UI demonstration of PixelTrace.
"""

from pathlib import Path
from PIL import Image, ImageDraw

demo_dir = Path("c:/Users/hiten/PixelTrace/demo_evidence")
demo_dir.mkdir(parents=True, exist_ok=True)

# 1. Base primary image (high contrast, distinct shapes & text)
img1 = Image.new("RGB", (400, 400), color=(25, 40, 65))
draw1 = ImageDraw.Draw(img1)
draw1.rectangle([50, 50, 350, 350], fill=(70, 130, 180), outline=(255, 255, 255), width=3)
draw1.ellipse([100, 100, 300, 300], fill=(220, 110, 45), outline=(255, 215, 0), width=4)
draw1.line([(50, 50), (350, 350)], fill=(255, 255, 255), width=2)
draw1.text((130, 190), "EXHIBIT ALPHA", fill=(255, 255, 255))
p1 = demo_dir / "01_original_evidence.png"
img1.save(p1, format="PNG")

# 2. Exact Duplicate: Bit-for-bit identical file
p2 = demo_dir / "02_exact_duplicate.png"
p2.write_bytes(p1.read_bytes())

# 3. Resized copy: 50% scale
img3 = img1.resize((200, 200), Image.Resampling.LANCZOS)
p3 = demo_dir / "03_resized_50pct.png"
img3.save(p3, format="PNG")

# 4. Recompressed JPEG: Altered bytes, identical scene
p4 = demo_dir / "04_recompressed_quality35.jpg"
img1.save(p4, format="JPEG", quality=35)

# 5. Cropped variant: Center portion cropped
img5 = img1.crop((80, 80, 320, 320))
p5 = demo_dir / "05_cropped_center.png"
img5.save(p5, format="PNG")

# 6. Unrelated Image: Totally different geometry and colors
img6 = Image.new("RGB", (400, 400), color=(210, 245, 210))
draw6 = ImageDraw.Draw(img6)
for i in range(0, 400, 20):
    draw6.line([(0, i), (400, i)], fill=(40, 150, 50), width=1)
    draw6.ellipse([i, i, i + 25, i + 25], fill=(180, 40, 120))
draw6.text((120, 190), "UNRELATED LANDSCAPE", fill=(30, 80, 30))
p6 = demo_dir / "06_unrelated_scene.png"
img6.save(p6, format="PNG")

print(f"Sample demo evidence images generated in: {demo_dir}")
