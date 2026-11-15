#!/usr/bin/env python3
"""Render a short, animated Everything Hub promo video with Pillow + FFmpeg.

Usage:
  python render_promo.py --output everything-hub-promo.mp4 --ffmpeg /path/to/ffmpeg

The video is 720x1280 (9:16), 30 fps, H.264, and intentionally silent so a
platform-native soundtrack can be added later if desired.
"""
from __future__ import annotations

import argparse
import math
import os
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 720, 1280
FPS = 30
SCENE_SECONDS = 6.0
TRANSITION_SECONDS = 0.4
SCENE_STEP = SCENE_SECONDS - TRANSITION_SECONDS
SCENE_COUNT = 5
TOTAL_SECONDS = SCENE_STEP * (SCENE_COUNT - 1) + SCENE_SECONDS

# Brand palette, sampled from the public landing page and logo.
PAPER = (248, 247, 242)
MIST = (237, 244, 239)
INK = (39, 59, 70)
MUTED = (101, 119, 126)
MUTED_DARK = (79, 107, 125)
PURPLE = (100, 86, 232)
TEAL = (22, 140, 156)
MINT = (101, 227, 204)
PEACH = (152, 102, 77)
WHITE = (255, 254, 250)
ROW = (243, 245, 241)
BORDER = (220, 228, 222)
SHADOW = (218, 225, 220)
LILAC = (235, 231, 248)
SAGE = (226, 238, 232)
SAND = (247, 234, 219)

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def smooth(value: float) -> float:
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def ease_out(value: float) -> float:
    value = clamp(value)
    return 1.0 - (1.0 - value) ** 3


def mix(a: tuple[int, int, int], b: tuple[int, int, int], amount: float) -> tuple[int, int, int]:
    amount = clamp(amount)
    return tuple(round(a[i] * (1.0 - amount) + b[i] * amount) for i in range(3))


@lru_cache(maxsize=64)
def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(path, size)


def write_text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], value: str,
               size: int, fill=INK, bold: bool = False, anchor: str | None = None) -> None:
    draw.text((round(xy[0]), round(xy[1])), value, font=font(size, bold),
              fill=fill, anchor=anchor)


def write_spaced(draw: ImageDraw.ImageDraw, xy: tuple[float, float], value: str,
                 size: int, fill=PEACH, bold: bool = True, spacing: float = 2.0,
                 opacity: float = 1.0) -> None:
    x, y = xy
    col = mix(PAPER, fill, opacity)
    f = font(size, bold)
    for char in value:
        draw.text((round(x), round(y)), char, font=f, fill=col)
        x += draw.textlength(char, font=f) + spacing


def rounded(draw: ImageDraw.ImageDraw, box, fill, radius: int = 22,
            outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill,
                           outline=outline, width=width)


def make_logo(size: int = 58) -> Image.Image:
    """Create a crisp raster version of the site's small gradient logo."""
    scale = 3
    s = 48 * scale
    layer = Image.new("RGB", (s, s), PAPER)
    mask = Image.new("L", (s, s), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, s - 1, s - 1), radius=round(14 * scale), fill=255)
    ld = ImageDraw.Draw(layer)
    for y in range(s):
        t = y / max(1, s - 1)
        c = mix(PURPLE, TEAL, t * 0.78)
        ld.line((0, y, s, y), fill=c)
    layer.putalpha(mask)
    ld = ImageDraw.Draw(layer)
    line_w = 3 * scale
    ld.line((12*scale, 15*scale, 36*scale, 15*scale), fill=WHITE, width=line_w)
    ld.line((12*scale, 24*scale, 28*scale, 24*scale), fill=WHITE, width=line_w)
    ld.line((12*scale, 33*scale, 33*scale, 33*scale), fill=WHITE, width=line_w)
    ld.ellipse((31*scale, 21*scale, 37*scale, 27*scale), fill=MINT)
    plus = (255, 224, 138)
    ld.line((36*scale, 9*scale, 36*scale, 15*scale), fill=plus, width=2*scale)
    ld.line((33*scale, 12*scale, 39*scale, 12*scale), fill=plus, width=2*scale)
    return layer.resize((size, size), Image.Resampling.LANCZOS)


LOGO = make_logo()


def make_base() -> Image.Image:
    image = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(image)
    for y in range(H):
        d.line((0, y, W, y), fill=mix(PAPER, MIST, y / (H - 1)))
    return image


BASE = make_base()


def draw_background(image: Image.Image, t: float) -> ImageDraw.ImageDraw:
    d = ImageDraw.Draw(image)
    drift = math.sin(t * 0.7) * 13
    d.ellipse((520 + drift, -140, 880 + drift, 220), fill=(231, 239, 235))
    d.ellipse((-175, 1024 - drift, 205, 1404 - drift), fill=(241, 233, 221))
    d.ellipse((602 - drift * 0.45, 1008, 848 - drift * 0.45, 1254), fill=(235, 241, 236))
    d.ellipse((618, 1054 + drift * 0.3, 658, 1094 + drift * 0.3), fill=(238, 243, 238))
    return d


def draw_header_footer(image: Image.Image, d: ImageDraw.ImageDraw, scene: int) -> None:
    image.paste(LOGO, (50, 44), LOGO)
    write_text(d, (124, 59), "Everything Hub", 27, INK, True)
    d.line((54, 1175, 666, 1175), fill=(216, 223, 218), width=2)
    write_spaced(d, (56, 1200), "EVERYTHING HUB  ·  STUDY + EVERYDAY",
                13, MUTED_DARK, True, 0.75)
    for idx in range(SCENE_COUNT):
        col = PURPLE if idx == scene else (203, 213, 210)
        d.ellipse((586 + idx * 18, 1207, 595 + idx * 18, 1216), fill=col)


def entrance(t: float, start: float = 0.25, length: float = 0.7) -> float:
    return ease_out((t - start) / length)


def draw_title(d: ImageDraw.ImageDraw, scene: int, t: float) -> None:
    content = [
        ("YOUR STUDY + EVERYDAY HUB", ("Study, plan,", "make room for life."),
         ("One useful place for schoolwork,", "planning and everyday life.")),
        ("01  ·  PLAN", ("Keep the day", "in view."),
         ("Tasks, timetables, notes, lists and habits.",)),
        ("02  ·  LEARN", ("Learn at your", "own pace."),
         ("Flashcards, quizzes, books and a", "sample question when you're ready.")),
        ("03  ·  EVERYDAY", ("Useful tools for", "everyday life."),
         ("Small helpers for the bits around", "school and life.")),
        ("EVERYTHING HUB", ("One hub.", "More room for life."),
         ("Study, plan and handle everyday", "tasks in one place.")),
    ]
    eyebrow, title_lines, subtitles = content[scene]
    ap = entrance(t, 0.08, 0.62)
    write_spaced(d, (56, 171 + 13 * (1 - ap)), eyebrow, 16, PEACH, True, 2.0, ap)
    for line_no, line in enumerate(title_lines):
        a = entrance(t, 0.18 + line_no * 0.1, 0.66)
        y = 239 + line_no * 68 + 20 * (1 - a)
        write_text(d, (54, y), line, 56, mix(PAPER, INK, a), True)
    for line_no, line in enumerate(subtitles):
        a = entrance(t, 0.42 + line_no * 0.08, 0.7)
        y = 389 + line_no * 34 + 14 * (1 - a)
        write_text(d, (58, y), line, 23, mix(PAPER, MUTED, a))


def draw_card_shell(d: ImageDraw.ImageDraw, t: float, kicker: str, title: str) -> float:
    ap = entrance(t, 0.38, 0.7)
    dy = 22 * (1 - ap)
    shadow = mix(PAPER, SHADOW, ap)
    body = mix(PAPER, WHITE, ap)
    border = mix(PAPER, BORDER, ap)
    rounded(d, (58, 548 + dy, 670, 1110 + dy), shadow, 28)
    rounded(d, (52, 540 + dy, 664, 1102 + dy), body, 28, border, 2)
    write_spaced(d, (88, 572 + dy), kicker, 15, PEACH, True, 1.7, ap)
    write_text(d, (88, 607 + dy), title, 26, mix(PAPER, INK, ap), True)
    return dy


def draw_icon(d: ImageDraw.ImageDraw, cx: int, cy: int, kind: str, accent) -> None:
    rounded(d, (cx - 29, cy - 29, cx + 29, cy + 29), accent, 17)
    if kind == "plan":
        d.rounded_rectangle((cx-10, cy-10, cx+10, cy+11), radius=2, outline=TEAL, width=3)
        d.line((cx-6, cy-16, cx-6, cy-8), fill=TEAL, width=3)
        d.line((cx+6, cy-16, cx+6, cy-8), fill=TEAL, width=3)
        d.line((cx-9, cy-3, cx+9, cy-3), fill=TEAL, width=2)
    elif kind == "learn":
        d.rounded_rectangle((cx-11, cy-15, cx+11, cy+15), radius=3, outline=PURPLE, width=3)
        d.line((cx-7, cy-8, cx+7, cy-8), fill=PURPLE, width=2)
        d.line((cx-7, cy+8, cx+5, cy+8), fill=PURPLE, width=2)
    elif kind == "break":
        d.line((cx-12, cy, cx+12, cy), fill=PEACH, width=3)
        d.line((cx, cy-12, cx, cy+12), fill=PEACH, width=3)
    elif kind == "note":
        d.rounded_rectangle((cx-11, cy-14, cx+11, cy+14), radius=3, outline=PURPLE, width=3)
        d.line((cx-6, cy-6, cx+6, cy-6), fill=PURPLE, width=2)
        d.line((cx-6, cy, cx+6, cy), fill=PURPLE, width=2)
    elif kind == "habit":
        d.ellipse((cx-11, cy-11, cx+11, cy+11), outline=PEACH, width=3)
        d.line((cx-6, cy, cx-1, cy+5), fill=PEACH, width=3)
        d.line((cx-1, cy+5, cx+8, cy-6), fill=PEACH, width=3)


def draw_feature_row(d: ImageDraw.ImageDraw, y: int, title: str, desc: str,
                     kind: str, accent, t: float, start: float) -> None:
    ap = entrance(t, start, 0.55)
    xshift = 24 * (1 - ap)
    x1 = round(78 + xshift)
    y1 = round(y + 18 * (1 - ap))
    bg = mix(PAPER, ROW, ap)
    rounded(d, (x1, y1 - 37, x1 + 564, y1 + 67), bg, 18)
    draw_icon(d, round(127 + xshift), round(y1 + 13), kind, mix(PAPER, accent, ap))
    write_text(d, (178 + xshift, y1 - 13), title, 22, mix(PAPER, INK, ap), True)
    write_text(d, (178 + xshift, y1 + 18), desc, 16, mix(PAPER, MUTED, ap))
    chevron = mix(PAPER, (131, 151, 147), ap)
    d.line((606 + xshift, y1 + 1, 614 + xshift, y1 + 9), fill=chevron, width=3)
    d.line((614 + xshift, y1 + 9, 606 + xshift, y1 + 17), fill=chevron, width=3)


def scene_hub(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_title(d, 0, t)
    dy = draw_card_shell(d, t, "START WITH WHAT YOU NEED", "A little of everything.")
    draw_feature_row(d, 711 + int(dy), "Plan", "Tasks, lists and timetables",
                     "plan", SAGE, t, 0.64)
    draw_feature_row(d, 837 + int(dy), "Learn", "Flashcards, quizzes and books",
                     "learn", LILAC, t, 0.82)
    draw_feature_row(d, 963 + int(dy), "Take a break", "Games and useful tools",
                     "break", SAND, t, 1.0)

def scene_plan(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_title(d, 1, t)
    dy = draw_card_shell(d, t, "A FLEXIBLE PLACE TO START", "Make room for the next thing.")
    rows = [
        (711, "Plan the day", "Keep tasks and timetable together", "plan", SAGE, 0.65),
        (837, "Capture a note", "Save a thought or useful link", "note", LILAC, 0.84),
        (963, "Build small routines", "Lists and habits for everyday life", "habit", SAND, 1.03),
    ]
    for y, title, desc, icon, accent, start in rows:
        draw_feature_row(d, y + int(dy), title, desc, icon, accent, t, start)
    # Animate a small completion tick through the first task row.
    if t > 2.1:
        a = smooth((t - 2.1) / 0.45)
        x, y = 605, 711 + int(dy)
        col = mix((131, 151, 147), TEAL, a)
        d.ellipse((x-14, y-14, x+14, y+14), fill=mix(ROW, SAGE, a))
        d.line((x-7, y, x-1, y+6), fill=col, width=3)
        d.line((x-1, y+6, x+9, y-7), fill=col, width=3)
    # Subtle animated progress mark below the rows.
    prog = smooth((t - 2.0) / 2.0)
    rounded(d, (88, 1062 + int(dy), 626, 1071 + int(dy)), (235, 239, 234), 5)
    rounded(d, (88, 1062 + int(dy), 88 + int(538 * prog), 1071 + int(dy)), TEAL, 5)


def scene_learn(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_title(d, 2, t)
    dy = draw_card_shell(d, t, "STUDY WHEN YOU NEED IT", "Pick a way to learn.")
    # Featured card flips by compressing in the horizontal plane, then revealing
    # its reverse. This keeps the interaction legible in a small mobile frame.
    card_y = 672 + int(dy)
    front_phase = smooth((t - 2.10) / 0.46)
    flip_width = max(0.025, abs(math.cos(front_phase * math.pi)))
    card_center = 360
    half_width = round(276 * flip_width)
    left, right = card_center - half_width, card_center + half_width
    flip_bg = mix(ROW, (239, 244, 239), front_phase)
    rounded(d, (left, card_y, right, card_y + 228), flip_bg, min(22, max(3, half_width // 3)))
    if half_width > 220:
        label = "FLASHCARD PREVIEW" if front_phase < 0.5 else "A SMALL STEP, REPEATED"
        write_spaced(d, (left + 26, card_y + 22), label, 13, MUTED_DARK, True, 1.0)
        if front_phase < 0.5:
            write_text(d, (left + 27, card_y + 81), "One prompt, one idea at a time.", 23, INK, True)
            write_text(d, (left + 27, card_y + 125), "Flip to revisit a key point.", 17, MUTED)
        else:
            write_text(d, (left + 27, card_y + 81), "Review a little, often.", 24, INK, True)
            write_text(d, (left + 27, card_y + 125), "Keep learning at your own pace.", 17, MUTED)
        # Small card count dots.
        for idx in range(4):
            dot = PURPLE if idx == 0 else (207, 215, 212)
            d.ellipse((left + 28 + idx*15, card_y + 190, left + 35 + idx*15, card_y + 197), fill=dot)
        rounded(d, (right - 58, card_y + 22, right - 26, card_y + 54), SAGE, 12)
        d.line((right-49, card_y+39, right-43, card_y+45), fill=TEAL, width=3)
        d.line((right-43, card_y+45, right-34, card_y+32), fill=TEAL, width=3)
    # Learning formats appear as three compact, tactile tabs.
    tabs = [(84, "Flashcards", LILAC), (269, "Quizzes", SAGE), (454, "Books", SAND)]
    for idx, (x, label, accent) in enumerate(tabs):
        ap = entrance(t, 0.9 + idx * 0.14, 0.55)
        y = 932 + int(dy) + round(12 * (1 - ap))
        fill = mix(PAPER, accent, ap)
        rounded(d, (x, y, x + 176, y + 66), fill, 17)
        write_text(d, (x + 18, y + 22), label, 17, mix(PAPER, INK, ap), True)
    # No sign-in is needed to try the sample question.
    ap = entrance(t, 1.28, 0.55)
    y = 1021 + int(dy) + round(10 * (1 - ap))
    rounded(d, (84, y, 638, y + 55), mix(PAPER, (238, 243, 237), ap), 16)
    write_text(d, (105, y + 17), "Try a sample question — no sign-in needed.",
               16, mix(PAPER, TEAL, ap), True)


def draw_utility_icon(d: ImageDraw.ImageDraw, cx: int, cy: int, kind: str, t: float) -> None:
    if kind == "timer":
        d.ellipse((cx-13, cy-13, cx+13, cy+13), outline=(206, 218, 214), width=3)
        end = 90 + int((t * 85) % 300)
        d.arc((cx-13, cy-13, cx+13, cy+13), start=90, end=end, fill=TEAL, width=3)
        d.line((cx, cy, cx, cy-7), fill=TEAL, width=2)
        d.line((cx, cy, cx+6, cy+4), fill=TEAL, width=2)
    elif kind == "calculator":
        write_text(d, (cx, cy+1), "123", 13, PURPLE, True, anchor="mm")
    elif kind == "qr":
        for dx, dy in [(-9, -9), (3, -9), (-9, 3)]:
            d.rectangle((cx+dx, cy+dy, cx+dx+7, cy+dy+7), outline=PEACH, width=2)
        d.rectangle((cx+5, cy+5, cx+10, cy+10), fill=PEACH)
        d.rectangle((cx-1, cy+3, cx+2, cy+6), fill=PEACH)
    elif kind == "typing":
        write_text(d, (cx, cy), "Aa", 15, TEAL, True, anchor="mm")
        width = int(14 + 13 * (0.5 + 0.5 * math.sin(t * 3)))
        d.line((cx-14, cy+15, cx-14+width, cy+15), fill=TEAL, width=2)


def utility_tile(d: ImageDraw.ImageDraw, box, kind: str, title: str,
                 desc: str, accent, t: float, start: float) -> None:
    ap = entrance(t, start, 0.58)
    x1, y1, x2, y2 = box
    yshift = round(17 * (1 - ap))
    fill = mix(PAPER, ROW, ap)
    rounded(d, (x1, y1 + yshift, x2, y2 + yshift), fill, 21)
    cx, cy = x1 + 43, y1 + 47 + yshift
    circle_fill = mix(PAPER, accent, ap)
    d.ellipse((cx-22, cy-22, cx+22, cy+22), fill=circle_fill)
    if ap > 0.3:
        draw_utility_icon(d, cx, cy, kind, t)
    write_text(d, (x1+20, y1+98+yshift), title, 18, mix(PAPER, INK, ap), True)
    write_text(d, (x1+20, y1+127+yshift), desc, 13, mix(PAPER, MUTED, ap))


def scene_everyday(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_title(d, 3, t)
    dy = draw_card_shell(d, t, "A LITTLE HELP BEYOND SCHOOL", "Quick utilities.")
    utility_tile(d, (82, 644+int(dy), 348, 817+int(dy)), "timer", "Focus timer",
                 "Make a study block", SAGE, t, 0.65)
    utility_tile(d, (370, 644+int(dy), 638, 817+int(dy)), "calculator", "Calculator",
                 "Quick everyday maths", LILAC, t, 0.82)
    utility_tile(d, (82, 835+int(dy), 348, 1008+int(dy)), "qr", "QR maker",
                 "Create a code in-browser", SAND, t, 0.98)
    utility_tile(d, (370, 835+int(dy), 638, 1008+int(dy)), "typing", "Typing Sprint",
                 "Practice at your pace", SAGE, t, 1.14)
    ap = entrance(t, 1.42, 0.65)
    write_text(d, (91, 1058 + int(dy)), "Plus converters, clocks, date tools, games and more.",
               14, mix(PAPER, MUTED, ap))


def scene_close(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_title(d, 4, t)
    dy = draw_card_shell(d, t, "EXPLORE AT YOUR OWN PACE", "Start with a quick look.")
    ap = entrance(t, 0.7, 0.6)
    y = 690 + int(dy) + round(15 * (1 - ap))
    write_text(d, (88, y), "Try a sample question", 25, mix(PAPER, INK, ap), True)
    write_text(d, (88, y+39), "without signing in.", 25, mix(PAPER, INK, ap), True)
    write_text(d, (88, y+106), "Sign in only when you want to save", 17, mix(PAPER, MUTED, ap))
    write_text(d, (88, y+134), "workspace tools and progress.", 17, mix(PAPER, MUTED, ap))
    # Clear, high-contrast destination so the promo remains useful when shared.
    link_ap = entrance(t, 1.55, 0.65)
    link_y = 894 + int(dy) + round(14 * (1 - link_ap))
    pulse = (math.sin(max(0, t - 2.0) * 2.4) + 1) * 0.5
    link_fill = mix((238, 243, 237), (232, 241, 235), pulse * 0.35)
    rounded(d, (82, link_y, 638, link_y+82), mix(PAPER, link_fill, link_ap), 19)
    write_text(d, (108, link_y+28), "everythinginahub.github.io/public/", 19,
               mix(PAPER, TEAL, link_ap), True)
    button_ap = entrance(t, 2.1, 0.65)
    button_y = 1000 + int(dy) + round(12 * (1 - button_ap))
    rounded(d, (82, button_y, 638, button_y+58), mix(PAPER, INK, button_ap), 17)
    write_text(d, (110, button_y+17), "Explore Everything Hub", 17,
               mix(PAPER, WHITE, button_ap), True)
    # Animated arrow/tap accent.
    arrow_x = 574 + round(4 * math.sin(t * 3.0))
    arr = mix(PAPER, MINT, button_ap)
    d.line((arrow_x-8, button_y+28, arrow_x+8, button_y+28), fill=arr, width=2)
    d.line((arrow_x+2, button_y+22, arrow_x+8, button_y+28), fill=arr, width=2)
    d.line((arrow_x+8, button_y+28, arrow_x+2, button_y+34), fill=arr, width=2)


SCENES = (scene_hub, scene_plan, scene_learn, scene_everyday, scene_close)


def render_scene(scene_index: int, local_t: float) -> Image.Image:
    image = BASE.copy()
    d = draw_background(image, local_t + scene_index * 0.37)
    draw_header_footer(image, d, scene_index)
    SCENES[scene_index](image, d, local_t)
    return image


def render_frame(time_s: float) -> Image.Image:
    scene_index = min(SCENE_COUNT - 1, int(time_s // SCENE_STEP))
    local_t = time_s - scene_index * SCENE_STEP
    if scene_index < SCENE_COUNT - 1 and local_t >= SCENE_SECONDS - TRANSITION_SECONDS:
        fade_t = local_t - (SCENE_SECONDS - TRANSITION_SECONDS)
        current = render_scene(scene_index, local_t)
        following = render_scene(scene_index + 1, fade_t)
        return Image.blend(current, following, smooth(fade_t / TRANSITION_SECONDS))
    return render_scene(scene_index, local_t)


def find_ffmpeg(user_path: str | None) -> str:
    if user_path:
        return user_path
    found = shutil.which("ffmpeg")
    if found:
        return found
    fallback = Path("/tmp/arena-video-libs/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2")
    if fallback.is_file():
        return str(fallback)
    raise SystemExit("FFmpeg not found. Install FFmpeg or pass --ffmpeg /path/to/ffmpeg.")


def render_video(output: Path, ffmpeg: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s:v", f"{W}x{H}",
        "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-profile:v", "high", "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    frame_count = math.ceil(TOTAL_SECONDS * FPS)
    try:
        for index in range(frame_count):
            timestamp = index / FPS
            frame = render_frame(timestamp)
            process.stdin.write(frame.tobytes())
            if index % FPS == 0:
                print(f"Rendering {timestamp:05.1f}s / {TOTAL_SECONDS:.1f}s", file=sys.stderr, flush=True)
        process.stdin.close()
    except BrokenPipeError:
        pass
    stderr = process.stderr.read() if process.stderr else b""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(stderr.decode("utf-8", errors="replace") or "FFmpeg encoding failed")
    print(f"Saved {output} ({frame_count} frames, {TOTAL_SECONDS:.1f}s)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="promo/everything-hub-promo.mp4", type=Path)
    parser.add_argument("--ffmpeg", default=None, help="FFmpeg executable path")
    args = parser.parse_args()
    render_video(args.output, find_ffmpeg(args.ffmpeg))


if __name__ == "__main__":
    main()
