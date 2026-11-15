#!/usr/bin/env python3
"""Render a 16:9 animated Everything Hub promo with Pillow, qrcode and FFmpeg.

Install Python dependencies with: pip install Pillow qrcode
Then run: python render_promo.py --output everything-hub-promo.mp4

The result is a silent 1280x720 H.264 motion-graphics video. Its end card
includes a scannable QR code to the public landing page.
"""
from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 30
SCENE_SECONDS = 5.8
TRANSITION_SECONDS = 0.38
SCENE_STEP = SCENE_SECONDS - TRANSITION_SECONDS
SCENE_COUNT = 5
TOTAL_SECONDS = SCENE_STEP * (SCENE_COUNT - 1) + SCENE_SECONDS
SITE_URL = "https://everythinginahub.github.io/public/"

# Everything Hub brand palette.
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
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def text(draw: ImageDraw.ImageDraw, xy, value: str, size: int, fill=INK,
         bold: bool = False, anchor: str | None = None) -> None:
    draw.text((round(xy[0]), round(xy[1])), value, font=font(size, bold),
              fill=fill, anchor=anchor)


def fit_text(draw: ImageDraw.ImageDraw, xy, value: str, max_size: int,
             max_width: int, fill=INK, bold: bool = True, min_size: int = 15) -> int:
    size = max_size
    while size > min_size and draw.textlength(value, font=font(size, bold)) > max_width:
        size -= 1
    text(draw, xy, value, size, fill, bold)
    return size


def spaced(draw: ImageDraw.ImageDraw, xy, value: str, size: int = 13,
           fill=PEACH, spacing: float = 1.8, opacity: float = 1.0) -> None:
    x, y = xy
    color = mix(PAPER, fill, opacity)
    f = font(size, True)
    for char in value:
        draw.text((round(x), round(y)), char, font=f, fill=color)
        x += draw.textlength(char, font=f) + spacing


def rounded(draw: ImageDraw.ImageDraw, box, fill, radius: int = 20,
            outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill,
                           outline=outline, width=width)


def appear(t: float, start: float, duration: float = 0.65) -> float:
    return ease_out((t - start) / duration)


def create_logo(size: int = 50) -> Image.Image:
    scale = 3
    side = 48 * scale
    image = Image.new("RGB", (side, side), PAPER)
    mask = Image.new("L", (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, side-1, side-1), radius=14*scale, fill=255)
    d = ImageDraw.Draw(image)
    for y in range(side):
        d.line((0, y, side, y), fill=mix(PURPLE, TEAL, y/(side-1)*0.78))
    image.putalpha(mask)
    d = ImageDraw.Draw(image)
    d.line((12*scale, 15*scale, 36*scale, 15*scale), fill=WHITE, width=3*scale)
    d.line((12*scale, 24*scale, 28*scale, 24*scale), fill=WHITE, width=3*scale)
    d.line((12*scale, 33*scale, 33*scale, 33*scale), fill=WHITE, width=3*scale)
    d.ellipse((31*scale, 21*scale, 37*scale, 27*scale), fill=MINT)
    d.line((36*scale, 9*scale, 36*scale, 15*scale), fill=(255,224,138), width=2*scale)
    d.line((33*scale, 12*scale, 39*scale, 12*scale), fill=(255,224,138), width=2*scale)
    return image.resize((size, size), Image.Resampling.LANCZOS)


LOGO = create_logo()


def make_qr(size: int = 184) -> Image.Image:
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H,
                       box_size=8, border=4)
    qr.add_data(SITE_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="#273B46", back_color="#fffefa").convert("RGB")
    return image.resize((size, size), Image.Resampling.NEAREST)


QR_IMAGE = make_qr()


def make_base() -> Image.Image:
    image = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(image)
    for y in range(H):
        d.line((0, y, W, y), fill=mix(PAPER, MIST, y/(H-1)))
    return image


BASE = make_base()


def background(image: Image.Image, t: float) -> ImageDraw.ImageDraw:
    d = ImageDraw.Draw(image)
    drift = math.sin(t * 0.75) * 16
    d.ellipse((1000+drift, -250, 1420+drift, 175), fill=(231, 239, 235))
    d.ellipse((-245, 495-drift, 210, 950-drift), fill=(241, 233, 221))
    d.ellipse((1050-drift*.4, 478, 1370-drift*.4, 800), fill=(235, 241, 236))
    return d


def header_footer(image: Image.Image, d: ImageDraw.ImageDraw, scene: int) -> None:
    image.paste(LOGO, (66, 34), LOGO)
    text(d, (128, 45), "Everything Hub", 25, INK, True)
    spaced(d, (940, 55), "STUDY  ·  PLAN  ·  EVERYDAY", 12, MUTED_DARK, 1.5)
    d.line((66, 654, 1214, 654), fill=(216, 223, 218), width=2)
    spaced(d, (68, 672), "EVERYTHING HUB  ·  STUDY + EVERYDAY", 11, MUTED_DARK, 0.8)
    for idx in range(SCENE_COUNT):
        color = PURPLE if idx == scene else (203, 213, 210)
        d.ellipse((1156+idx*16, 678, 1164+idx*16, 686), fill=color)


def draw_heading(d: ImageDraw.ImageDraw, scene: int, t: float) -> None:
    data = [
        ("YOUR STUDY + EVERYDAY HUB", ("Too many tabs?", "One useful hub."),
         ("Keep schoolwork, planning and everyday tools", "together—so you can focus on what’s next.")),
        ("01  ·  PLAN", ("Make the day", "easier to see."),
         ("Tasks, timetables, notes, lists and habits—", "all together in one flexible place.")),
        ("02  ·  LEARN", ("Learn in your", "own rhythm."),
         ("Flashcards, quizzes, books and a sample", "question to try when you’re ready.")),
        ("03  ·  EVERYDAY", ("More than", "schoolwork."),
         ("Useful tools for the other bits of your day,", "from focus timers to quick calculations.")),
        ("EVERYTHING HUB", ("One hub.", "More room for life."),
         ("Study, plan and handle everyday tasks", "in one calm, useful place.")),
    ]
    kicker, title_lines, sub_lines = data[scene]
    k = appear(t, 0.06, 0.54)
    spaced(d, (76, 143+round(12*(1-k))), kicker, 14, PEACH, 1.8, k)
    for i, line in enumerate(title_lines):
        a = appear(t, 0.11+i*.12, .62)
        y = 184 + i*66 + round(17*(1-a))
        fit_text(d, (72, y), line, 57, 535, mix(PAPER, INK, a), True, 46)
    for i, line in enumerate(sub_lines):
        a = appear(t, .37+i*.09, .62)
        y = 337 + i*31 + round(12*(1-a))
        text(d, (76, y), line, 20, mix(PAPER, MUTED, a))


def panel(d: ImageDraw.ImageDraw, box, t: float, start: float=.22,
          fill=WHITE, radius: int=26) -> tuple[int, float]:
    a = appear(t, start, .68)
    dy = round(24*(1-a))
    x1,y1,x2,y2 = box
    rounded(d, (x1+8, y1+9+dy, x2+8, y2+9+dy), mix(PAPER, SHADOW, a), radius)
    rounded(d, (x1, y1+dy, x2, y2+dy), mix(PAPER, fill, a), radius,
            mix(PAPER, BORDER, a), 2)
    return dy, a


def tag(d: ImageDraw.ImageDraw, xy, label: str, fill, color=INK, size: int=14,
        padding=(13,8)) -> None:
    x,y=xy
    w=round(d.textlength(label, font=font(size, True)))+padding[0]*2
    h=size+padding[1]*2+4
    rounded(d, (x,y,x+w,y+h), fill, h//2)
    text(d, (x+padding[0], y+padding[1]-1), label, size, color, True)


def browser_frame(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int,
                  t: float, title: str="Everything Hub") -> None:
    rounded(d, (x+8,y+10,x+w+8,y+h+10), SHADOW, 24)
    rounded(d, (x,y,x+w,y+h), WHITE, 24, BORDER, 2)
    rounded(d, (x,y,x+w,y+51), (246,247,243), 24)
    d.rectangle((x+1,y+28,x+w-1,y+51), fill=(246,247,243))
    for i,c in enumerate(((239,145,135),(240,196,102),(113,188,151))):
        d.ellipse((x+22+i*18,y+19,x+31+i*18,y+28), fill=c)
    text(d, (x+90,y+15), title, 14, MUTED_DARK, True)
    rounded(d, (x+w-148,y+12,x+w-19,y+39), WHITE, 13, BORDER, 1)
    text(d, (x+w-132,y+18), "A calm place to start", 10, MUTED)


def draw_icon(d: ImageDraw.ImageDraw, cx: int, cy: int, kind: str, color=TEAL, t: float=0) -> None:
    if kind == "calendar":
        d.rounded_rectangle((cx-11,cy-10,cx+11,cy+12), radius=3, outline=color, width=3)
        d.line((cx-7,cy-16,cx-7,cy-7), fill=color, width=3)
        d.line((cx+7,cy-16,cx+7,cy-7), fill=color, width=3)
        d.line((cx-10,cy-2,cx+10,cy-2), fill=color, width=2)
    elif kind == "book":
        d.rounded_rectangle((cx-12,cy-15,cx+12,cy+15),radius=3,outline=color,width=3)
        d.line((cx-7,cy-7,cx+7,cy-7),fill=color,width=2)
        d.line((cx-7,cy+7,cx+6,cy+7),fill=color,width=2)
    elif kind == "note":
        d.rounded_rectangle((cx-11,cy-14,cx+11,cy+14),radius=3,outline=color,width=3)
        for off in (-6,0,6): d.line((cx-6,cy+off,cx+6,cy+off),fill=color,width=2)
    elif kind == "timer":
        d.ellipse((cx-13,cy-13,cx+13,cy+13),outline=(205,217,213),width=3)
        end=90+int((t*82)%295)
        d.arc((cx-13,cy-13,cx+13,cy+13),start=90,end=end,fill=color,width=3)
        d.line((cx,cy,cx,cy-7),fill=color,width=2)
        d.line((cx,cy,cx+6,cy+4),fill=color,width=2)
    elif kind == "calculator":
        text(d,(cx,cy),"123",12,color,True,anchor="mm")
    elif kind == "qr":
        for dx,dy in [(-9,-9),(3,-9),(-9,3)]:
            d.rectangle((cx+dx,cy+dy,cx+dx+7,cy+dy+7),outline=color,width=2)
        d.rectangle((cx+5,cy+5,cx+10,cy+10),fill=color)
    elif kind == "typing":
        text(d,(cx,cy-1),"Aa",14,color,True,anchor="mm")
        width=12+int(14*(.5+.5*math.sin(t*3)))
        d.line((cx-13,cy+14,cx-13+width,cy+14),fill=color,width=2)
    elif kind == "check":
        d.ellipse((cx-13,cy-13,cx+13,cy+13),fill=SAGE)
        d.line((cx-7,cy,cx-1,cy+6),fill=TEAL,width=3)
        d.line((cx-1,cy+6,cx+8,cy-7),fill=TEAL,width=3)
    elif kind == "plus":
        d.line((cx-10,cy,cx+10,cy),fill=color,width=3)
        d.line((cx,cy-10,cx,cy+10),fill=color,width=3)


def category_row(d: ImageDraw.ImageDraw, x: int, y: int, w: int,
                 title: str, subtitle: str, kind: str, accent,
                 t: float, start: float) -> None:
    a=appear(t,start,.54)
    dx=round(24*(1-a))
    x+=dx
    fill=mix(PAPER,ROW,a)
    rounded(d,(x,y,x+w,y+73),fill,17)
    rounded(d,(x+16,y+12,x+62,y+58),mix(PAPER,accent,a),14)
    if a>.15:
        draw_icon(d,x+39,y+35,kind,TEAL if kind in ("calendar","note") else PURPLE,t)
    text(d,(x+78,y+12),title,18,mix(PAPER,INK,a),True)
    text(d,(x+78,y+40),subtitle,13,mix(PAPER,MUTED,a))
    chev=mix(PAPER,(133,151,147),a)
    d.line((x+w-27,y+30,x+w-19,y+37),fill=chev,width=3)
    d.line((x+w-19,y+37,x+w-27,y+44),fill=chev,width=3)


def scene_hook(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_heading(d,0,t)
    # Low-friction proof point: a sample can be explored before making an account.
    a=appear(t,.92,.55)
    tag(d,(76,482),"TRY A SAMPLE QUESTION",mix(PAPER,SAGE,a),mix(PAPER,TEAL,a),13,(14,9))
    text(d,(77,535),"No sign-in needed to take a look.",16,mix(PAPER,MUTED,a))
    # Product overview in a compact browser-style panel.
    x,y,w,h=655,137,560,450
    browser_frame(d,x,y,w,h,t)
    a=appear(t,.46,.58)
    spaced(d,(x+29,y+73),"START WITH WHAT YOU NEED",12,PEACH,1.4,a)
    fit_text(d,(x+29,y+99),"A little of everything.",25,490,mix(PAPER,INK,a),True,20)
    category_row(d,x+27,y+151,506,"Plan","Tasks, lists and timetables","calendar",SAGE,t,.72)
    category_row(d,x+27,y+236,506,"Learn","Flashcards, quizzes and books","book",LILAC,t,.91)
    category_row(d,x+27,y+321,506,"Everyday tools","Timers, calculators and more","plus",SAND,t,1.10)


def task_row(d: ImageDraw.ImageDraw, x: int, y: int, w: int,
             title: str, detail: str, state: str, t: float, start: float) -> None:
    a=appear(t,start,.5)
    dx=round(22*(1-a)); x+=dx
    rounded(d,(x,y,x+w,y+66),mix(PAPER,ROW,a),16)
    if state=="done" and t>2.05:
        draw_icon(d,x+27,y+33,"check")
    else:
        d.ellipse((x+17,y+23,x+37,y+43),outline=mix(PAPER,TEAL,a),width=2)
    text(d,(x+53,y+11),title,16,mix(PAPER,INK,a),True)
    text(d,(x+53,y+36),detail,12,mix(PAPER,MUTED,a))
    if state=="next":
        tag(d,(x+w-112,y+18),"UP NEXT",SAGE,TEAL,10,(9,6))


def scene_plan(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_heading(d,1,t)
    tag(d,(76,461),"TASKS",SAGE,TEAL,12)
    tag(d,(170,461),"TIMETABLES",LILAC,PURPLE,12)
    tag(d,(302,461),"NOTES + HABITS",SAND,PEACH,12)
    x,y,w,h=632,139,584,450
    dy,a=panel(d,(x,y,x+w,y+h),t,.22)
    spaced(d,(x+32,y+28+dy),"A FLEXIBLE PLACE TO START",12,PEACH,1.5,a)
    text(d,(x+32,y+54+dy),"Make room for the next thing.",23,mix(PAPER,INK,a),True)
    task_row(d,x+27,y+103+dy,530,"Review flashcards","10:30  ·  20 min","done",t,.65)
    task_row(d,x+27,y+180+dy,530,"Maths practice","12:00  ·  15 min","next",t,.84)
    task_row(d,x+27,y+257+dy,530,"Take a proper break","After your next task","open",t,1.03)
    a2=appear(t,1.3,.6)
    text(d,(x+31,y+355+dy),"A little plan, ready when you are.",13,mix(PAPER,MUTED,a2))
    rounded(d,(x+31,y+384+dy,x+553,y+393+dy),(235,239,234),5)
    amount=smooth((t-1.4)/3.0)
    rounded(d,(x+31,y+384+dy,x+31+int(522*amount),y+393+dy),TEAL,5)


def scene_learn(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_heading(d,2,t)
    tag(d,(76,461),"FLASHCARDS",LILAC,PURPLE,12)
    tag(d,(197,461),"QUIZZES",SAGE,TEAL,12)
    tag(d,(292,461),"BOOKS",SAND,PEACH,12)
    x,y,w,h=632,139,584,450
    dy,a=panel(d,(x,y,x+w,y+h),t,.22)
    spaced(d,(x+32,y+28+dy),"LEARNING PREVIEW",12,PEACH,1.5,a)
    text(d,(x+32,y+54+dy),"One idea at a time.",23,mix(PAPER,INK,a),True)
    # A quick card-flip animation to suggest active learning.
    card_x=x+31; card_y=y+101+dy; card_w=522; card_h=188
    phase=smooth((t-2.0)/.55)
    squeeze=max(.025,abs(math.cos(phase*math.pi)))
    half=round(card_w*squeeze/2)
    cx=card_x+card_w//2
    left,right=cx-half,cx+half
    rounded(d,(left,card_y,right,card_y+card_h),mix(ROW,(237,244,239),phase),20)
    if half>205:
        label="FLASHCARD PREVIEW" if phase<.5 else "A SIMPLE WAY TO REVIEW"
        spaced(d,(left+28,card_y+22),label,11,MUTED_DARK,1.1)
        if phase<.5:
            text(d,(left+28,card_y+73),"One prompt. One idea.",23,INK,True)
            text(d,(left+28,card_y+112),"Flip to revisit a key point.",15,MUTED)
        else:
            text(d,(left+28,card_y+73),"Review a little, often.",23,INK,True)
            text(d,(left+28,card_y+112),"Go at a pace that works for you.",15,MUTED)
        tag(d,(right-102,card_y+20),"01 / 12",SAGE,TEAL,10,(9,6))
        for i in range(5):
            color=PURPLE if i==0 else (203,213,210)
            d.ellipse((left+29+i*14,card_y+157,left+36+i*14,card_y+164),fill=color)
    # Sample-question assurance stays visible under the card.
    a2=appear(t,1.12,.56)
    rounded(d,(x+31,y+318+dy,x+553,y+370+dy),mix(PAPER,(238,243,237),a2),15)
    draw_icon(d,x+56,y+344+dy,"check")
    text(d,(x+83,y+333+dy),"Try a sample question — no sign-in needed.",15,mix(PAPER,TEAL,a2),True)


def utility_tile(d: ImageDraw.ImageDraw, box, kind: str, title: str,
                 desc: str, accent, t: float, start: float) -> None:
    a=appear(t,start,.52)
    x1,y1,x2,y2=box
    lift=round(18*(1-a))
    rounded(d,(x1,y1+lift,x2,y2+lift),mix(PAPER,ROW,a),20)
    cx=x1+43; cy=y1+42+lift
    d.ellipse((cx-21,cy-21,cx+21,cy+21),fill=mix(PAPER,accent,a))
    if a>.15: draw_icon(d,cx,cy,kind,TEAL if kind in ("timer","typing") else PURPLE,t)
    text(d,(x1+18,y1+77+lift),title,16,mix(PAPER,INK,a),True)
    text(d,(x1+18,y1+101+lift),desc,11,mix(PAPER,MUTED,a))


def scene_everyday(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_heading(d,3,t)
    tag(d,(76,461),"FOCUS TIMER",SAGE,TEAL,12)
    tag(d,(205,461),"CALCULATOR",LILAC,PURPLE,12)
    tag(d,(345,461),"AND MORE",SAND,PEACH,12)
    x,y,w,h=632,139,584,450
    dy,a=panel(d,(x,y,x+w,y+h),t,.22)
    spaced(d,(x+32,y+28+dy),"A LITTLE HELP BEYOND SCHOOL",12,PEACH,1.5,a)
    text(d,(x+32,y+54+dy),"Useful tools, right here.",23,mix(PAPER,INK,a),True)
    utility_tile(d,(x+28,y+103+dy,x+279,y+228+dy),"timer","Focus timer","Make a study block",SAGE,t,.62)
    utility_tile(d,(x+298,y+103+dy,x+550,y+228+dy),"calculator","Calculator","Quick everyday maths",LILAC,t,.78)
    utility_tile(d,(x+28,y+242+dy,x+279,y+367+dy),"qr","QR maker","Make a code in-browser",SAND,t,.94)
    utility_tile(d,(x+298,y+242+dy,x+550,y+367+dy),"typing","Typing Sprint","Practice at your pace",SAGE,t,1.10)
    a2=appear(t,1.4,.5)
    text(d,(x+31,y+394+dy),"Converters · clocks · date tools · games · and more",12,mix(PAPER,MUTED,a2))


def scene_close(image: Image.Image, d: ImageDraw.ImageDraw, t: float) -> None:
    draw_heading(d,4,t)
    a=appear(t,.35,.68)
    # Bold, easy-to-copy destination plus a real, scannable QR code.
    cta=(76,432,856,521)
    rounded(d,(cta[0]+7,cta[1]+8,cta[2]+7,cta[3]+8),mix(PAPER,SHADOW,a),22)
    rounded(d,cta,mix(PAPER,INK,a),22)
    text(d,(104,449),"everythinginahub.github.io/public/",22,
         mix(PAPER,WHITE,a),True)
    arrow_x=812+round(4*math.sin(t*2.8))
    arrow=mix(PAPER,MINT,a)
    d.line((arrow_x-12,476,arrow_x+8,476),fill=arrow,width=3)
    d.line((arrow_x,468,arrow_x+8,476),fill=arrow,width=3)
    d.line((arrow_x+8,476,arrow_x,484),fill=arrow,width=3)
    a2=appear(t,.72,.55)
    text(d,(78,548),"Try a sample question first — no sign-in needed.",16,mix(PAPER,MUTED,a2))
    # QR callout card.
    qx,qy,qw,qh=928,161,276,396
    rounded(d,(qx+7,qy+9,qx+qw+7,qy+qh+9),mix(PAPER,SHADOW,a),25)
    rounded(d,(qx,qy,qx+qw,qy+qh),mix(PAPER,WHITE,a),25,mix(PAPER,BORDER,a),2)
    spaced(d,(qx+25,qy+23),"SCAN TO EXPLORE",11,PEACH,1.5,a)
    if a>.25:
        qr=QR_IMAGE.resize((184,184),Image.Resampling.NEAREST)
        image.paste(qr,(qx+46,qy+59))
    text(d,(qx+27,qy+265),"Everything Hub",18,mix(PAPER,INK,a),True)
    text(d,(qx+27,qy+294),"Study · plan · everyday",12,mix(PAPER,MUTED,a))
    tag(d,(qx+25,qy+331),"OPEN THE HUB",SAGE,TEAL,11,(12,7))


SCENES=(scene_hook,scene_plan,scene_learn,scene_everyday,scene_close)


def render_scene(index: int, local_t: float) -> Image.Image:
    image=BASE.copy()
    d=background(image,local_t+index*.4)
    header_footer(image,d,index)
    SCENES[index](image,d,local_t)
    return image


def render_frame(time_s: float) -> Image.Image:
    idx=min(SCENE_COUNT-1,int(time_s//SCENE_STEP))
    local=time_s-idx*SCENE_STEP
    if idx<SCENE_COUNT-1 and local>=SCENE_SECONDS-TRANSITION_SECONDS:
        blend_t=local-(SCENE_SECONDS-TRANSITION_SECONDS)
        return Image.blend(render_scene(idx,local),render_scene(idx+1,blend_t),
                           smooth(blend_t/TRANSITION_SECONDS))
    return render_scene(idx,local)


def find_ffmpeg(user_path: str | None) -> str:
    if user_path: return user_path
    binary=shutil.which("ffmpeg")
    if binary: return binary
    fallback=Path("/tmp/arena-video-libs/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v9.0.2")
    if fallback.is_file(): return str(fallback)
    raise SystemExit("FFmpeg not found. Install FFmpeg or pass --ffmpeg /path/to/ffmpeg.")


def render_video(output: Path, ffmpeg: str) -> None:
    output.parent.mkdir(parents=True,exist_ok=True)
    cmd=[ffmpeg,"-hide_banner","-loglevel","error","-y",
         "-f","rawvideo","-pix_fmt","rgb24","-s:v",f"{W}x{H}",
         "-r",str(FPS),"-i","-","-an","-c:v","libx264","-preset","medium",
         "-crf","19","-pix_fmt","yuv420p","-profile:v","high",
         "-movflags","+faststart",str(output)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    assert proc.stdin is not None
    frames=math.ceil(TOTAL_SECONDS*FPS)
    try:
        for i in range(frames):
            proc.stdin.write(render_frame(i/FPS).tobytes())
            if i%(FPS*2)==0:
                print(f"Rendering {i/FPS:04.1f}s / {TOTAL_SECONDS:.1f}s",file=sys.stderr,flush=True)
        proc.stdin.close()
    except BrokenPipeError:
        pass
    error=proc.stderr.read() if proc.stderr else b""
    code=proc.wait()
    if code:
        raise RuntimeError(error.decode("utf-8",errors="replace") or "FFmpeg encoding failed")
    print(f"Saved {output} · {W}x{H} · {FPS} fps · {TOTAL_SECONDS:.1f}s")


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output",type=Path,default=Path("promo/everything-hub-promo.mp4"))
    parser.add_argument("--ffmpeg",default=None,help="Path to the FFmpeg executable")
    args=parser.parse_args()
    render_video(args.output,find_ffmpeg(args.ffmpeg))


if __name__=="__main__":
    main()
