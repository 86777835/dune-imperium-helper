# Crops the teach page pictures (public/img/teach/) from Dire Wolf's Simplified Chinese rulebooks.
# Render the pages first, e.g. pdftoppm -r 300 -f 3 -l 3 -png -singlefile SCN_DUNE_IMPERIUM_Rulebook_24-10-22.pdf hi/b-03
# (b-NN: base rulebook page NN, u-NN: Uprising; PDFs linked in tools/faq.json), then: python3 teach_crops.py <out dir>
# Crop each teach picture from the 300-dpi pages in hi/ (coordinates below are 150-dpi, as read off mid/), save webp
# (longest side <= 160, strips up to 260 wide) into OUT, and a labelled contact sheet sheet.jpg to check them.
import sys, os
from PIL import Image, ImageDraw
OUT = sys.argv[1]
C = {  # id: (page, x0, y0, x1, y1) in 150-dpi page pixels
 # base rulebook (简中 2024-10-22)
 'board': ('b-03', 34, 118, 418, 502), 'conflictback': ('b-03', 428, 412, 800, 550), 'intrigue': ('b-03', 910, 420, 1004, 548),
 'mentat': ('b-03', 1222, 480, 1286, 598), 'alliance': ('b-03', 1456, 470, 1592, 598), 'reserve': ('b-03', 34, 630, 424, 802),
 'foldspace': ('b-03', 302, 630, 424, 802), 'leader': ('b-03', 786, 690, 1132, 880), 'firstplayer': ('b-03', 1206, 730, 1306, 830),
 'starter': ('b-03', 92, 1086, 462, 1270), 'disks': ('b-03', 838, 1132, 972, 1192), 'control': ('b-03', 506, 1334, 632, 1420),
 'agent': ('b-03', 730, 1324, 868, 1412), 'combatmarker': ('b-03', 972, 1344, 1052, 1422),
 'imperium': ('b-09', 1472, 1260, 1654, 1498), 'space': ('b-09', 722, 1022, 836, 1192), 'tabr': ('b-09', 668, 1400, 854, 1498),
 'zone': ('b-10', 568, 634, 828, 824), 'combatspace': ('b-10', 656, 412, 802, 532), 
 
 'conflict': ('b-12', 1472, 242, 1654, 514), 'combatintrigue': ('b-12', 534, 252, 748, 562),
 'swordmaster': ('b-16', 50, 426, 112, 512), 'factions': ('b-16', 58, 1392, 324, 1460), 'maker': ('b-16', 898, 123, 974, 202),
 'persuasion': ('b-16', 906, 588, 972, 654), 'solari': ('b-16', 906, 798, 970, 860), 'spice': ('b-16', 976, 798, 1048, 860),
 'water': ('b-16', 1054, 796, 1104, 862), 'signet': ('b-16', 898, 966, 968, 1024), 'sword': ('b-16', 904, 1164, 974, 1252),
 'troop': ('b-16', 904, 1446, 974, 1518), 'vp': ('b-16', 898, 1560, 972, 1632),
 'arrow': ('b-16', 904, 460, 974, 522), 
 # uprising rulebook (简中)
 'uboard': ('u-03', 38, 118, 350, 430), 'sandworm': ('u-03', 1060, 138, 1154, 318), 'shieldwall': ('u-03', 1260, 334, 1370, 442),
 'hook': ('u-03', 1482, 340, 1608, 430), 'objective': ('u-03', 776, 756, 854, 864), 'spy': ('u-03', 938, 1146, 1098, 1202),
 'ureserve': ('u-03', 88, 502, 300, 644),
 
 'battleicons': ('u-14', 472, 1282, 738, 1394), 'uconflict': ('u-14', 52, 568, 260, 878), 'wormdouble': ('u-14', 1478, 1380, 1626, 1494),
 'contract': ('u-16', 1006, 1160, 1126, 1392),
 
 
}
# agent icons: the column on p9 (7 in the base game, 8 with the spy in Uprising), laid out as a grid
AG_B = [('b-09', 1035, y, 1101, y + 48) for y in (212, 270, 330, 388, 448, 506, 562)]
AG_U = [('u-09', 1035, y, 1101, y + 48) for y in (192, 242, 292, 342, 392, 442, 492, 542)]
pages = {}
def page(p):
    if p not in pages: pages[p] = Image.open(f'hi/{p}.png').convert('RGB')
    return pages[p]
def crop(p, x0, y0, x1, y1): return page(p).crop((x0 * 2, y0 * 2, x1 * 2, y1 * 2))
def save(k, im, lim=160):
    s = min(1, lim / max(im.size)); im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
    im.save(f'{OUT}/{k}.webp', quality=82, method=6)
def grid(parts, cols):
    ims = [crop(*q) for q in parts]; w, h = ims[0].size; rows = -(-len(ims) // cols)
    bg = page(parts[0][0]).getpixel((parts[0][1] * 2 - 4, parts[0][2] * 2 + 20))
    g = Image.new('RGB', (cols * w, rows * h), bg)
    for i, im in enumerate(ims): g.paste(im, ((i % cols) * w, (i // cols) * h))
    return g
for k, q in C.items(): save(k, crop(*q))
save('agenticons', grid(AG_B, 4), 220); save('uagenticons', grid(AG_U, 4), 220)
ids = list(C) + ['agenticons', 'uagenticons']; cols = 8; cw, ch = 190, 190
sheet = Image.new('RGB', (cols * cw, -(-len(ids) // cols) * ch), (240, 236, 228)); d = ImageDraw.Draw(sheet)
for i, k in enumerate(ids):
    im = Image.open(f'{OUT}/{k}.webp').convert('RGB'); im.thumbnail((cw - 10, ch - 30)); x, y = (i % cols) * cw, (i // cols) * ch
    sheet.paste(im, (x + (cw - im.size[0]) // 2, y + 5)); d.text((x + 5, y + ch - 20), k, fill=(200, 0, 0))
sheet.save('sheet.jpg', quality=85)
print(len(ids), 'pictures', sum(os.path.getsize(f'{OUT}/{k}.webp') for k in ids), 'bytes')
