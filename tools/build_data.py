# -*- coding: utf-8 -*-
"""
把 tools/source/ 內的英文原始資料轉成網頁使用的中文資料檔：
  docs/data/dmgz.js   Digital Monster COLOR ゴジラ 70th Edition（哥吉拉彩元祖）
  docs/data/pengz.js  Digimon Pendulum COLOR ゴジラ Edition（哥吉拉彩色超代）

用法：python tools/build_data.py
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "source")
OUT = os.path.join(ROOT, "docs", "data")

GCOLOR = {"Blue": "b", "Yellow": "y", "Red": "r"}


# =====================================================================
# 共用
# =====================================================================
def to24(t):
    t = (t or "").strip()
    if re.fullmatch(r"\d{1,2}:\d{2}", t):
        h, m = t.split(":")
        return f"{int(h):02d}:{m}"
    m = re.fullmatch(r"(\d{1,2}):(\d{2}) (AM|PM)", t)
    if not m:
        return None
    h = int(m[1]) % 12
    if m[3] == "PM":
        h += 12
    return f"{h:02d}:{m[2]}"


def num(v):
    if v in (None, ""):
        return None
    n = int(v)
    return None if n == 65535 else n


def name_index(monsters, extra):
    idx = {m["en"].lower(): m["id"] for m in monsters}
    idx.update(extra)
    idx["none"] = None
    return idx


def resolve(idx, name):
    key = name.strip().lower()
    if key not in idx:
        raise KeyError("找不到怪獸名稱：" + name)
    return idx[key]


def write_js(name, data):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("// 由 tools/build_data.py 產生，請勿手動修改\n")
        f.write("window.GZ=")
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"OK {path}  怪獸 {len(data['monsters'])} 隻，{os.path.getsize(path)} bytes")


# =====================================================================
# 哥吉拉彩元祖（DM COLOR Godzilla 70th）
# =====================================================================
DM_ZH = {
    "bota": ("黑球獸", "ボタモン"),
    "koro": ("滾球獸", "コロモン"),
    "babygodzilla": ("哥吉拉寶寶", "ベビーゴジラ"),
    "agu": ("亞古獸", "アグモン"),
    "monodra": ("獨角龍獸", "モノドラモン 單角龍獸"),
    "littlegodzilla": ("小哥吉拉", "リトルゴジラ"),
    "grey": ("暴龍獸", "グレイモン"),
    "biollante": ("碧奧蘭蒂", "ビオランテ"),
    "godzillasaurus": ("哥吉拉龍", "ゴジラザウルス"),
    "rare": ("腐屍獸", "レアモン"),
    "gigan": ("蓋剛", "ガイガン"),
    "mothra": ("摩斯拉", "モスラ"),
    "kingghidorah": ("王者基多拉(1991)", "キングギドラ"),
    "rodan": ("拉頓", "ラドン"),
    "godzillajr": ("哥吉拉Jr.", "ゴジラジュニア 哥吉拉之子"),
    "metalgrey_g": ("機械暴龍獸(疫苗種)：G侵食模式", "メタルグレイモン G侵蝕"),
    "metalgrey_va": ("機械暴龍獸(疫苗種)", "メタルグレイモン"),
    "spacegodzilla": ("太空哥吉拉", "スペースゴジラ"),
    "godzilla_1954": ("哥吉拉(1954)", "ゴジラ 初代"),
    "skullgrey_g": ("骷髏暴龍獸：G侵食模式", "スカルグレイモン G侵蝕"),
    "zilla": ("吉拉", "ジラ"),
    "kiryu": ("機龍", "3式機龍 メカゴジラ"),
    "mechakingghidorah": ("機械王者基多拉", "メカキングギドラ"),
    "firerodan": ("火焰拉頓", "ファイヤーラドン"),
    "godzilla_1994": ("哥吉拉(1994)", "ゴジラ"),
    "wargrey_g": ("戰鬥暴龍獸：G侵食模式", "ウォーグレイモン G侵蝕"),
    "wargrey": ("戰鬥暴龍獸", "ウォーグレイモン"),
    "destoroyah": ("戴斯特洛伊亞", "デストロイア 毀滅者"),
    "godzilla_1999": ("哥吉拉(1999)", "ゴジラ 千禧年"),
    "mugendra_m": ("無限龍獸：MFS-3", "ムゲンドラモン"),
    "mechagodzilla": ("機械哥吉拉(1993)", "メカゴジラ"),
    "burninggodzilla": ("紅蓮哥吉拉", "バーニングゴジラ 燃燒哥吉拉"),
    "chibigodzilla": ("迷你哥吉拉", "チビゴジラ"),
    "chibimechagodzilla": ("迷你機械哥吉拉", "チビメカゴジラ"),
}

DM_FRAG_DROP = {"godzillajr", "metalgrey_g", "godzilla_1954", "skullgrey_g",
                "godzilla_1994", "wargrey_g", "godzilla_1999"}


def dm_parse_req(text):
    r = {}
    for part in [p.strip() for p in text.split(",")]:
        if part == "No requirements":
            r["none"] = 1
        elif part == "Hatched from a G-Cell Fragment":
            r["frag"] = 1
        elif part == "Not hatched from a G-Cell Fragment":
            r["frag"] = 0
        elif part == "Clear Area 7":
            r["area"] = 1
        elif part == "Area 7 not cleared":
            r["area"] = 0
        elif m := re.fullmatch(r"(\d+)(?:-(\d+)|(\+))? Care Mistakes", part):
            lo = int(m[1])
            r["cm"] = [lo, int(m[2]) if m[2] else (99 if m[3] else lo)]
        elif m := re.fullmatch(r"(\d+)(?:-(\d+)|(\+)) (Blue|Yellow|Red) G-Cells\*", part):
            r["g"] = {"c": GCOLOR[m[4]], "min": int(m[1]), "max": int(m[2]) if m[2] else 99}
        elif m := re.fullmatch(r"(\d+)\+ Battles", part):
            r["bt"] = int(m[1])
        elif m := re.fullmatch(r"(\d+)%\+ Win Ratio\*", part):
            r["win"] = int(m[1])
        elif part == "50% Chance":
            r["rand"] = 50
        else:
            raise ValueError("無法解析的條件：" + part)
    return r


DM_ENC_TIMES = [
    ["11:19", "13:12", "16:04", "18:27"],
    ["10:43", "14:27", "16:55", "19:04"],
    ["11:47", "13:19", "15:37", "17:26", "19:51"],
    ["09:47", "12:10", "14:44", "18:03", "20:20"],
    ["11:19", "14:07", "16:29", "18:09", "20:48"],
    ["10:12", "13:12", "15:09", "17:06", "19:04", "21:12"],
    ["09:47", "12:10", "13:52", "16:04", "17:46", "20:20"],
    ["10:43", "12:33", "14:27", "16:55", "18:27", "20:48"],
]

DM_ENC_OPP = [
    "Baby Godzilla, Agumon, None, Little Godzilla, Mothra, None, Agumon, Monodramon, Baby Godzilla, None, Monodramon, Baby Godzilla, None, Raremon, Agumon, None",
    "Biollante, None, Baby Godzilla, Grey, None, Little Godzilla, Godzilla Jr, Raremon, None, Godzillasaurus, Agumon, King Ghidorah, None, Skull Greymon: G-Erosion Mode, None, Gigan",
    "Rodan, Mothra, None, Monodramon, Zilla, None, Little Godzilla, Gigan, None, Space Godzilla, Agumon, None, Biollante, Baby Godzilla, None, King Ghidorah",
    "Space Godzilla, None, Godzilla_1954, Kiryu, Mecha-King Ghidorah, None, Destoroyah, None, Mothra, Metal Greymon: G-Erosion Mode, None, Fire Rodan, King Ghidorah, None, Metal Greymon (Vaccine), Zilla",
    "Metal Greymon: G-Erosion Mode, Gigan, None, Godzilla Jr, Fire Rodan, Metal Greymon (Vaccine), None, Little Godzilla, Kiryu, None, Godzilla_1954, Skull Greymon: G-Erosion Mode, None, Godzilla (1994), Mecha-King Ghidorah, None",
    "None, Biollante, Godzilla_1954, None, Mechagodzilla, Space Godzilla, Zilla, None, Skull Greymon: G-Erosion Mode, Mecha-King Ghidorah, Kiryu, None, Godzilla Jr, None, Godzilla (1994), Mothra",
    "Kiryu, None, Little Godzilla, Mechagodzilla, None, Godzilla (1994), Skull Greymon: G-Erosion Mode, None, Space Godzilla, Godzilla Jr, None, Mugendramon: MFS-3, Fire Rodan, Zilla, None, War Greymon: G-Erosion Mode",
    "Space Godzilla, Metal Greymon: G-Erosion Mode, None, Mugendramon: MFS-3, Fire Rodan, None, Godzilla (1999), Mecha-King Ghidorah, Godzilla Jr, None, Space Godzilla, King Ghidorah, Godzilla (1994), War Greymon: G-Erosion Mode, None, Zilla",
]

DM_QUEST = [
    ("1", [("Agumon", "Vaccine", 10), ("Baby Godzilla", "Virus", 14), ("Greymon", "Vaccine", 17)], "背景「機體 Logo」"),
    ("2", [("Monodramon", "Data", 14), ("Raremon", "Virus", 18), ("Biollante", "Data", 22)], None),
    ("3", [("Baby Godzilla", "Virus", 23), ("Rodan", "Data", 32), ("Mothra", "Data", 42)], None),
    ("4", [("Godzillasaurus", "Virus", 34), ("King Ghidorah (1991)", "Data", 40), ("Fire Rodan", "Data", 54), ("Mecha-King Ghidorah", "Data", 60)], "G 細胞背景 2（4 張）"),
    ("5", [("Little Godzilla", "Virus", 40), ("Mothra", "Data", 48), ("Metal Greymon (Vaccine)", "Vaccine", 72), ("Space Godzilla", "Data", 88)], None),
    ("6", [("Agumon", "Vaccine", 38), ("Greymon", "Vaccine", 54), ("Skull Greymon: G-Erosion Mode", "Virus", 88), ("Metal Greymon (Vaccine): G-Erosion Mode", "Vaccine", 110)], None),
    ("7", [("King Ghidorah (1991)", "Data", 54), ("Space Godzilla", "Data", 76), ("Godzilla Jr", "Virus", 92), ("Mechagodzilla (1993)", "Data", 116), ("Destoroyah", "Data", 140)], "新的進化路線（「已通關第7關」條件）"),
    ("8", [("Gigan", "Data", 58), ("Godzilla (1954)", "Virus", 88), ("Skull Greymon: G-Erosion Mode", "Virus", 110), ("Kiryu", "Virus", 140), ("Mugendramon: MFS-3", "Virus", 160)], None),
    ("9", [("Raremon", "Virus", 80), ("Zilla", "Data", 110), ("Metal Greymon (Vaccine): G-Erosion Mode", "Vaccine", 140), ("Godzilla (1999)", "Virus", 160), ("War Greymon: G-Erosion Mode", "Vaccine", 188)], None),
    ("F", [("Godzilla (1954)", "Virus", 96), ("Destoroyah", "Data", 124), ("Godzilla (1994)", "Virus", 148), ("War Greymon", "Vaccine", 174), ("Burning Godzilla", "Virus", 220)], "背景「70 週年 Logo」"),
]


def build_dmgz():
    raw = json.load(open(os.path.join(SRC, "dmgz_en.json"), encoding="utf-8"))
    monsters = []
    for d in raw:
        zh, alias = DM_ZH[d["id"]]
        loss = re.match(r"(\d+)", d.get("Hunger / Strength Loss", ""))
        monsters.append({
            "id": d["id"], "zh": zh, "en": d["name"], "alias": alias,
            "stage": re.match(r"Stage (\S+)", d["stage"])[1], "attr": d["attr"],
            "power": num(d.get("Power")), "energy": num(d.get("Energy")),
            "minWeight": num(d.get("Min Weight")), "sleep": to24(d.get("Sleep Time")),
            "heal": num(d.get("Heal Doses")), "loss": int(loss[1]) if loss else None,
            "tg": num(d.get("Encounter Time Group")), "og": num(d.get("Encounter Opponent Group")),
            "fragDrop": d["id"] in DM_FRAG_DROP,
            "from": [{"id": x["id"], "req": [dm_parse_req(s) for s in x["req"]]} for x in d["from"]],
            "to": [{"id": x["id"], "req": [dm_parse_req(s) for s in x["req"]]} for x in d["to"]],
        })
    idx = name_index(monsters, {
        "grey": "grey", "godzilla_1954": "godzilla_1954",
        "metal greymon: g-erosion mode": "metalgrey_g",
        "mechagodzilla": "mechagodzilla", "king ghidorah": "kingghidorah",
    })
    write_js("dmgz.js", {
        "kind": "dm", "device": "gz70", "title": "哥吉拉彩元祖",
        "monsters": monsters,
        "encTimes": DM_ENC_TIMES,
        "encOpp": [[resolve(idx, n) for n in row.split(",")] for row in DM_ENC_OPP],
        "quest": [{"no": no, "unlock": u, "rounds": [{"id": resolve(idx, n), "attr": a, "p": p} for n, a, p in rs]}
                  for no, rs, u in DM_QUEST],
    })


# =====================================================================
# 哥吉拉彩色超代（Pendulum COLOR Godzilla Edition）
# =====================================================================
PEN_ORDER = """bota puni koro tuno babygodzilla agu mothra_l dorat monodra gabu minilla littlegodzilla grey_g
tyrano fly mothraleo kingghidorah gigan_2004 strikedra raptordra garuru godzilla_1954 godzillajr metalgrey_g
mastertyrano battra aquamothra skullgrey_g mechakingghidorah monsterx mechagodzilla_1974 baragon weregaruru
metalgrey_vi_g atlurkabuteri godzilla_1999 godzilla_2004 godzilla_2022 wargrey_g dino armormothra mugendra_m
mechagodzilla supermechagodzilla kingghidorah_2001 keizerghidorah jetjaguar kingcaesar metalgaruru metalgaruru_g
gatlinggigan blackwargrey_g megalon orga hedorah supergodzilla burninggodzilla_2025 omega_g""".split()

PEN_ZH = {
    "bota": ("黑球獸", "ボタモン"),
    "puni": ("布尼獸", "プニモン"),
    "koro": ("滾球獸", "コロモン"),
    "tuno": ("角角獸", "ツノモン"),
    "babygodzilla": ("哥吉拉寶寶", "ベビーゴジラ"),
    "agu": ("亞古獸", "アグモン"),
    "mothra_l": ("摩斯拉(幼蟲)", "モスラ 幼虫"),
    "dorat": ("多拉特", "ドラット"),
    "monodra": ("獨角龍獸", "モノドラモン 單角龍獸"),
    "gabu": ("加布獸", "ガブモン"),
    "minilla": ("米尼拉", "ミニラ 迷你拉"),
    "littlegodzilla": ("小哥吉拉", "リトルゴジラ"),
    "grey_g": ("暴龍獸：G侵食模式", "グレイモン G侵蝕"),
    "tyrano": ("恐龍獸", "ティラノモン"),
    "fly": ("飛蜂獸", "フライモン"),
    "mothraleo": ("摩斯拉·利歐", "モスラ・レオ"),
    "kingghidorah": ("王者基多拉(1991)", "キングギドラ"),
    "gigan_2004": ("蓋剛(2004)", "ガイガン"),
    "strikedra": ("突擊龍獸", "ストライクドラモン"),
    "raptordra": ("迅猛龍獸", "ラプタードラモン"),
    "garuru": ("加魯魯獸", "ガルルモン"),
    "godzilla_1954": ("哥吉拉(1954)", "ゴジラ 初代"),
    "godzillajr": ("哥吉拉Jr.", "ゴジラジュニア 哥吉拉之子"),
    "metalgrey_g": ("機械暴龍獸(疫苗種)：G侵食模式", "メタルグレイモン G侵蝕"),
    "mastertyrano": ("大師恐龍獸", "マスターティラノモン"),
    "battra": ("巴特拉", "バトラ"),
    "aquamothra": ("水之摩斯拉", "アクアモスラ"),
    "skullgrey_g": ("骷髏暴龍獸：G侵食模式", "スカルグレイモン G侵蝕"),
    "mechakingghidorah": ("機械王者基多拉", "メカキングギドラ"),
    "monsterx": ("怪獸X", "モンスターX"),
    "mechagodzilla_1974": ("機械哥吉拉(1974)", "メカゴジラ"),
    "baragon": ("巴拉貢", "バラゴン"),
    "weregaruru": ("狼人加魯魯獸", "ワーガルルモン"),
    "metalgrey_vi_g": ("機械暴龍獸(病毒種)：G侵食模式", "メタルグレイモン ウイルス G侵蝕"),
    "atlurkabuteri": ("超甲蟲獸", "アトラーカブテリモン"),
    "godzilla_1999": ("哥吉拉(1999)", "ゴジラ 千禧年"),
    "godzilla_2004": ("哥吉拉(2004)", "ゴジラ FINAL WARS"),
    "godzilla_2022": ("哥吉拉(2022)", "ゴジラ"),
    "wargrey_g": ("戰鬥暴龍獸：G侵食模式", "ウォーグレイモン G侵蝕"),
    "dino": ("迪諾獸", "ディノモン"),
    "armormothra": ("鎧甲摩斯拉", "鎧モスラ"),
    "mugendra_m": ("無限龍獸：MFS-3", "ムゲンドラモン"),
    "mechagodzilla": ("機械哥吉拉(1993)", "メカゴジラ"),
    "supermechagodzilla": ("超級機械哥吉拉", "スーパーメカゴジラ"),
    "kingghidorah_2001": ("王者基多拉(2001)", "キングギドラ 千年竜王"),
    "keizerghidorah": ("凱撒基多拉", "カイザーギドラ"),
    "jetjaguar": ("捷特賈格", "ジェットジャガー"),
    "kingcaesar": ("金凱撒", "キングシーサー"),
    "metalgaruru": ("鋼鐵加魯魯獸", "メタルガルルモン"),
    "metalgaruru_g": ("鋼鐵加魯魯獸：G侵食模式", "メタルガルルモン G侵蝕"),
    "gatlinggigan": ("加特林蓋剛", "ガトリングガイガン"),
    "blackwargrey_g": ("黑暗戰鬥暴龍獸：G侵食模式", "ブラックウォーグレイモン G侵蝕"),
    "megalon": ("美加洛", "メガロ"),
    "orga": ("奧加", "オルガ"),
    "hedorah": ("黑多拉", "ヘドラ"),
    "supergodzilla": ("超級哥吉拉", "スーパーゴジラ"),
    "burninggodzilla_2025": ("紅蓮哥吉拉(2025)", "バーニングゴジラ 燃燒哥吉拉"),
    "omega_g": ("奧米加獸：G融合模式", "オメガモン G融合"),
}

DEFEAT_TEXT = "Defeat 10 Stage V or higher Monsters with Godzilla, G-Erosion or G-Fusion in their name"


def pen_parse_req(text, idx):
    r = {}
    text = text.replace(DEFEAT_TEXT, "DEFEAT10").replace("No requirementsMode Change", "MODECHANGE")
    for part in [p.strip() for p in text.split(",")]:
        if part == "DEFEAT10":
            r["defeat"] = 10
        elif part == "MODECHANGE":
            r["mode"] = 1
        elif part == "No requirements":
            r["none"] = 1
        elif m := re.fullmatch(r"(\d+)(?:-(\d+)|(\+))? Care Mistakes", part):
            lo = int(m[1])
            r["cm"] = [lo, int(m[2]) if m[2] else (99 if m[3] else lo)]
        elif part == "Red G-Cells":
            r["gc"] = "r"
        elif part == "Blue or Empty G-Cells":
            r["gc"] = "b"
        elif m := re.fullmatch(r"(\d+) Poops on screen", part):
            r["poop"] = int(m[1])
        elif m := re.fullmatch(r"(\d+)\+ Lifetime Battles", part):
            r["life"] = int(m[1])
        elif m := re.fullmatch(r"(\d+)\+ Battles as (.+)", part):
            r["btAs"] = {"n": int(m[1]), "id": resolve(idx, m[2])}
        elif m := re.fullmatch(r"(\d+)\+ Battles", part):
            r["bt"] = int(m[1])
        elif m := re.fullmatch(r"(\d+)%\+ Win Ratio", part):
            r["win"] = int(m[1])
        elif m := re.fullmatch(r"(\d+)% chance of evolution upon death", part):
            r["death"] = int(m[1])
        elif m := re.fullmatch(r"Jogress with any Stage (IV|V) Digimon from another Pendulum Color version", part):
            r["jog"] = "ANY" + ("4" if m[1] == "IV" else "5")
        elif m := re.fullmatch(r"Jogress with (.+)", part):
            r["jog"] = resolve(idx, m[1])
        else:
            raise ValueError("無法解析的條件：" + part)
    return r


PEN_ENC_OPP = [
    "Agumon, Mothra (Larva), None, Minilla, Monodramon, None, Dorat, Mothra (Larva), Strikedramon, None, Monodramon, Dorat, None, Tyranomon, Agumon, None",
    "Gabumon, None, Monodramon, Garurumon, Baby Godzilla, Mothra (Larva), None, Monodramon, Mothra Leo, Baby Godzilla, None, Gabumon, Mothra (Larva), Gigan (2004), None, Gabumon",
    "Baby Godzilla, Dorat, None, Little Godzilla, Gabumon, Agumon, None, Dorat, Greymon: G-Erosion Mode, Gabumon, Baby Godzilla, None, Dorat, King Ghidorah (1991), None, Agumon",
    "Gigan (2004), None, Mothra Leo, Strikedramon, Godzilla (1954), None, Greymon: G-Erosion Mode, King Ghidorah (1991), Aqua Mothra, Garurumon, None, King Ghidorah (1991), Mecha-King Ghidorah, Mothra Leo, Little Godzilla, None",
    "Flymon, Minilla, None, Master Tyranomon, Little Godzilla, None, Tyranomon, Mecha-King Ghidorah, Gigan (2004), None, Minilla, Gigan (2004), Garurumon, Raptordramon, Godzilla Jr, None",
    "Raptordramon, None, Battra, King Ghidorah (1991), Tyranomon, Mothra Leo, None, Metal Greymon (Vaccine): G-Erosion Mode, Strikedramon, Mothra Leo, None, Flymon, Baragon, None, Greymon: G-Erosion Mode, Minilla",
    "Master Tyranomon, Baragon, None, Mecha-King Ghidorah, Megalon, Godzilla Jr, Skull Greymon: G-Erosion Mode, Jet Jaguar, None, Mechagodzilla (1974), Mecha-King Ghidorah, Battra, Metal Greymon (Vaccine): G-Erosion Mode, None, Godzilla (2022), Atlur Kabuterimon",
    "Metal Greymon (Vaccine): G-Erosion Mode, Godzilla (1954), None, Godzilla (2004), Were Garurumon, Monster X, Battra, Mecha-King Ghidorah, Keizer Ghidorah, Metal Greymon (Virus): G-Erosion Mode, None, Aqua Mothra, Armor Mothra, Baragon, None, Monster X",
    "Were Garurumon, King Ghidorah (2001), Skull Greymon: G-Erosion Mode, None, Aqua Mothra, Atlur Kabuterimon, Godzilla (1954), None, Godzilla (1999), Godzilla Jr, Monster X, Mechagodzilla (1974), Master Tyranomon, Orga, None, Metal Greymon (Virus): G-Erosion Mode",
    "Jet Jaguar, Orga, None, War Greymon: G-Erosion Mode, Armor Mothra, Hedorah, Gatling Gigan, None, Godzilla (2022), Keizer Ghidorah, Megalon, Metal Garurumon, Godzilla (2004), None, Mechagodzilla (1993), Mugendramon: MFS-3",
    "Hedorah, Super Godzilla, None, Godzilla (1999), Godzilla (2022), King Ghidorah (2001), Black War Greymon: G-Erosion Mode, None, Dinomon, King Caesar, Metal Garurumon: G-Erosion Mode, Keizer Ghidorah, War Greymon: G-Erosion Mode, None, Gatling Gigan, Metal Garurumon",
    "King Ghidorah (2001), King Caesar, None, Black War Greymon: G-Erosion Mode, Jet Jaguar, Godzilla (2004), Mugendramon: MFS-3, Mechagodzilla (1993), None, Armor Mothra, Godzilla (1999), Metal Garurumon: G-Erosion Mode, Megalon, None, Dinomon, Super Godzilla",
    "Godzilla (2004), King Ghidorah (2001), None, Mugendramon: MFS-3, Super Godzilla, Gatling Gigan, Dinomon, Burning Godzilla (2025), None, Hedorah, Keizer Ghidorah, Super Godzilla, Jet Jaguar, None, Godzilla (2022), Armor Mothra",
]

# (關卡, [(英文名, 屬性, 力量, 攻擊模式, 命中減)], 解鎖)
PEN_QUEST = [
    ("1", [("Monodramon", "Vaccine", 10, "11111", 0), ("Agumon", "Vaccine", 13, "11121", 0), ("Mothra (Larva)", "Data", 17, "12111", 0)], "背景「故障網格」"),
    ("2", [("Gabumon", "Vaccine", 13, "11211", 0), ("Dorat", "Data", 15, "12111", 0), ("Garurumon", "Vaccine", 22, "21111", 0)], None),
    ("3", [("Agumon", "Vaccine", 17, "12111", 0), ("Baby Godzilla", "Virus", 22, "21111", 0), ("Greymon: G-Erosion Mode", "Vaccine", 28, "12121", 0)], None),
    ("4", [("Dorat", "Data", 20, "11121", 0), ("Strikedramon", "Vaccine", 28, "11221", 0), ("King Ghidorah (1991)", "Data", 36, "21121", 0)], None),
    ("5", [("Minilla", "Virus", 26, "21111", 0), ("Mothra Leo", "Data", 32, "11121", 0), ("Gigan (2004)", "Data", 38, "11221", 0), ("Godzilla (1954)", "Virus", 50, "21211", 0)], "背景「哥吉拉 Logo」"),
    ("6", [("Baby Godzilla", "Virus", 32, "11221", 0), ("Little Godzilla", "Virus", 42, "12121", 0), ("Godzilla Jr", "Virus", 56, "11222", 0)], None),
    ("7", [("Raptordramon", "Vaccine", 40, "12111", 0), ("Master Tyranomon", "Vaccine", 50, "21121", 0), ("Metal Greymon (Vaccine): G-Erosion Mode", "Vaccine", 66, "12121", 0)], None),
    ("8", [("Godzilla (1954)", "Virus", 48, "11211", 0), ("King Caesar", "Data", 66, "11221", 0), ("Mechagodzilla (1974)", "Data", 80, "21211", 0)], None),
    ("9", [("Flymon", "Vaccine", 42, "11221", 0), ("Mothra Leo", "Data", 50, "12121", 0), ("Atlur Kabuterimon", "Vaccine", 68, "21121", 0), ("Aqua Mothra", "Data", 88, "11222", 0)], None),
    ("10", [("Gigan (2004)", "Data", 52, "21121", 0), ("Monster X", "Data", 70, "12121", 0), ("Keizer Ghidorah", "Data", 100, "12122", 0)], "基多拉蛋、G 細胞背景 2"),
    ("11", [("Were Garurumon", "Vaccine", 66, "11221", 0), ("Baragon", "Data", 78, "21211", 0), ("Metal Garurumon", "Vaccine", 110, "11222", 0)], None),
    ("12", [("Tyranomon", "Vaccine", 72, "21211", 0), ("Master Tyranomon", "Vaccine", 88, "12121", 0), ("Dinomon", "Vaccine", 122, "12122", 0)], None),
    ("13", [("Battra", "Data", 76, "11221", 0), ("Megalon", "Data", 84, "21211", 0), ("Aqua Mothra", "Data", 96, "21121", 0), ("Armor Mothra", "Data", 128, "12122", 0)], None),
    ("14", [("Mechagodzilla (1974)", "Data", 80, "12121", 0), ("Mecha-King Ghidorah", "Data", 98, "21121", 0), ("Mechagodzilla (1993)", "Data", 142, "11222", 0)], None),
    ("15", [("Mothra Leo", "Data", 88, "11221", 0), ("Baragon", "Data", 110, "11222", 0), ("Godzilla (2004)", "Virus", 150, "21212", 0)], "背景「標題畫面」"),
    ("16", [("Godzilla (2022)", "Virus", 98, "21121", 0), ("Hedorah", "Data", 120, "21212", 0), ("Gatling Gigan", "Data", 156, "12122", 0)], None),
    ("17", [("Skull Greymon: G-Erosion Mode", "Vaccine", 106, "21211", 0), ("Metal Greymon (Virus): G-Erosion Mode", "Virus", 124, "12122", 0), ("Mugendramon: MFS-3", "Vaccine", 132, "11222", 5), ("Black War Greymon: G-Erosion Mode", "Virus", 160, "21212", 0)], None),
    ("18", [("Gigan (2004)", "Data", 108, "12122", 0), ("Megalon", "Data", 132, "11222", 5), ("Godzilla (2022)", "Virus", 164, "21212", 5)], None),
    ("19", [("Orga", "Virus", 112, "21211", 0), ("Godzilla (1999)", "Virus", 146, "21212", 0), ("Super Godzilla", "Virus", 170, "12222", 10)], None),
    ("20", [("Hedorah", "Data", 122, "21212", 0), ("Gigan (2004)", "Data", 148, "21222", 0), ("Jet Jaguar", "Data", 156, "12222", 10), ("King Ghidorah (2001)", "Data", 176, "22222", 10)], None),
    ("F", [("Godzilla (1999)", "Virus", 136, "21212", 0), ("Godzilla (2022)", "Virus", 150, "21222", 5), ("Godzilla (2004)", "Virus", 166, "12222", 10), ("Burning Godzilla (2025)", "Virus", 190, "22222", 10)], "背景「哥吉拉皮膚」"),
    ("Ω", [("Metal Garurumon: G-Erosion Mode", "Vaccine", 166, "12122", 5), ("War Greymon: G-Erosion Mode", "Vaccine", 180, "12222", 5), ("Omegamon: G-Fusion Mode", "Vaccine", 200, "22222", 10)], "背景「奧米加獸：G融合模式」"),
]

PEN_JOG_META = [
    {"key": "IV", "title": "成熟期合體速查表", "anyLabel": "其他 Pendulum COLOR 版本的任一成熟期", "anyShort": "其他版本成熟期"},
    {"key": "V", "title": "完全體合體速查表", "anyLabel": "其他 Pendulum COLOR 版本的任一完全體", "anyShort": "其他版本完全體"},
    {"key": "X", "title": "其他合體速查表", "anyLabel": "", "anyShort": ""},
]


def build_jogress():
    raw = json.load(open(os.path.join(SRC, "pengz_jogress.json"), encoding="utf-8"))
    tables = []
    for meta, t in zip(PEN_JOG_META, raw):
        body = t[1:]
        body[0] = body[0][1:]  # 第一列開頭多了「Evolving Monster」標籤
        rows = [r[0] for r in body]
        cells = [[c or None for c in r[1:]] for r in body]
        cols = rows + (["ANY"] if len(cells[0]) == len(rows) + 1 else [])
        assert all(len(c) == len(cols) for c in cells), meta["title"]
        tables.append({**meta, "rows": rows, "cols": cols, "cells": cells})
    return tables


def build_pengz():
    raw = {d["id"]: d for d in json.load(open(os.path.join(SRC, "pengz_en.json"), encoding="utf-8"))}
    assert set(raw) == set(PEN_ORDER), set(raw) ^ set(PEN_ORDER)
    idx = name_index([{"id": k, "en": raw[k]["name"]} for k in PEN_ORDER], {})
    monsters = []
    for k in PEN_ORDER:
        d = raw[k]
        zh, alias = PEN_ZH[k]
        st = re.match(r"Stage (\S+)", d["stage"])
        stage = st[1] if st else "M"
        loss = re.match(r"(\d+)", d.get("Heart Loss", ""))
        power = num(d.get("Power"))
        monsters.append({
            "id": k, "zh": zh, "en": d["name"], "alias": alias,
            "stage": stage, "attr": d["attr"],
            "power": power if (power or stage not in ("I", "II")) else None,
            "energy": num(d.get("Energy")) if stage != "I" else None,
            "minWeight": num(d.get("Min Weight")), "sleep": to24(d.get("Sleep Time")),
            "loss": int(loss[1]) if loss else None,
            "tg": num(d.get("Encounter Time Group")), "og": num(d.get("Encounter Opponent Group")),
            "lib": num(d.get("Library Number")),
            "canJog": d.get("Jogress") == "Yes",
            "from": [{"id": x["id"], "req": [pen_parse_req(s, idx) for s in x["req"]]} for x in d["from"]],
            "to": [{"id": x["id"], "req": [pen_parse_req(s, idx) for s in x["req"]]} for x in d["to"]],
        })
    write_js("pengz.js", {
        "kind": "pen", "device": "pengz", "title": "哥吉拉彩色超代",
        "monsters": monsters,
        "encTimes": DM_ENC_TIMES,
        "encOpp": [[resolve(idx, n) for n in row.split(",")] for row in PEN_ENC_OPP],
        "quest": [{"no": no, "unlock": u,
                   "rounds": [{"id": resolve(idx, n), "attr": a, "p": p, "pat": pat, "hc": hc} for n, a, p, pat, hc in rs]}
                  for no, rs, u in PEN_QUEST],
        "jogress": build_jogress(),
    })


if __name__ == "__main__":
    build_dmgz()
    build_pengz()
