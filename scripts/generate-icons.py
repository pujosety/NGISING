import os
from PIL import Image, ImageDraw

SOURCE_IMAGE = r"C:\Users\Pujo\.gemini\antigravity\brain\f6928f58-6b7d-477d-87ab-800ab3be1d56\ngising-logo.jpg"
PUBLIC_DIR = os.path.join(os.getcwd(), "public")
ANDROID_RES_DIR = os.path.join(os.getcwd(), "android", "app", "src", "main", "res")

os.makedirs(PUBLIC_DIR, exist_ok=True)

img = Image.open(SOURCE_IMAGE).convert("RGBA")

# 1. Generate Web Assets
web_sizes = {
    "favicon.png": (64, 64),
    "apple-touch-icon.png": (180, 180),
    "icon-192.png": (192, 192),
    "icon-512.png": (512, 512),
    "app-logo.png": (512, 512),
}

for name, size in web_sizes.items():
    out_path = os.path.join(PUBLIC_DIR, name)
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(out_path, "PNG", optimize=True)
    print(f"Generated Web Icon: {out_path} ({size[0]}x{size[1]})")

# Also save WebP version
img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(PUBLIC_DIR, "app-logo.webp"), "WEBP", quality=95)

# Function to generate round icon with antialiased mask
def make_round(im):
    size = im.size
    mask = Image.new('L', (size[0]*4, size[1]*4), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size[0]*4, size[1]*4), fill=255)
    mask = mask.resize(size, Image.Resampling.LANCZOS)
    rounded = im.copy()
    rounded.putalpha(mask)
    return rounded

# 2. Function to generate Android Native Mipmap Icons
def generate_android_icons():
    if not os.path.exists(ANDROID_RES_DIR):
        print("Android res directory does not exist yet (will run after cap add android)")
        return

    mipmap_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    for folder, size in mipmap_sizes.items():
        dir_path = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        # Standard icon (squircle / full icon)
        launcher_img = img.resize((size, size), Image.Resampling.LANCZOS)
        launcher_img.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

        # Round icon
        round_img = make_round(launcher_img)
        round_img.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")

        # Foreground for adaptive icon (centered with margin)
        # Android adaptive foreground is 108dp (e.g. 108, 162, 216, 324, 432px)
        fg_size = int(size * (108 / 48))
        inner_size = int(fg_size * 0.72)
        fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        inner_img = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = ((fg_size - inner_size) // 2, (fg_size - inner_size) // 2)
        fg.paste(inner_img, offset)
        fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")

        print(f"Generated Android Icons in {folder} (size: {size}px, fg: {fg_size}px)")

generate_android_icons()
print("Done generating web icons.")
