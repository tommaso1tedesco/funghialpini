#!/usr/bin/env python3
"""
Genera immagini SVG segnaposto per ogni specie in data/funghi.json.
Non sono foto reali: sono illustrazioni schematiche generate per popolare
la galleria finche' l'utente non sostituisce i file con foto vere scattate
sul campo (stesso nome file, stessa cartella assets/img/).

Uso: python3 scripts/generate_placeholders.py
"""
import json
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE, "data", "funghi.json")
OUT_DIR = os.path.join(BASE, "assets", "img")

# Mappa parole chiave di colore (italiano, come scritto nel dataset) -> hex
COLOR_MAP = [
    ("bianco", "#f5f0e6"),
    ("nero", "#2b2620"),
    ("verdastro", "#8a9a5b"),
    ("verde", "#5f7a3d"),
    ("giallo", "#e2b93b"),
    ("arancio", "#d97b29"),
    ("rosso", "#b23a2e"),
    ("rosa", "#d99aa3"),
    ("vinato", "#7a3b4a"),
    ("bruno scuro", "#4a3524"),
    ("bruno", "#8a6240"),
    ("marrone", "#7a5230"),
    ("nocciola", "#a97c50"),
    ("grigio", "#9a958c"),
    ("beige", "#c9b691"),
    ("crema", "#e8dcc0"),
    ("ocra", "#c99a3e"),
    ("mattone", "#a34f2e"),
]

# Colore per badge commestibilita (bordo immagine)
EDIBILITY_COLOR = {
    "commestibile": "#2e7d32",
    "commestibile_con_cautela": "#d4a017",
    "da_non_consumare": "#e05d2f",
    "tossico": "#c62828",
    "mortale": "#1a1a1a",
    "non_determinato": "#6b6b6b",
}


def pick_color(colore_list):
    text = " ".join(colore_list).lower()
    for keyword, hex_color in COLOR_MAP:
        if keyword in text:
            return hex_color
    return "#a97c50"


def esc(s):
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def svg_wrapper(inner, edge_color, label):
    return f'''<svg viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="{esc(label)}">
  <rect x="0" y="0" width="300" height="220" rx="14" fill="#eef2e6"/>
  <rect x="3" y="3" width="294" height="214" rx="12" fill="none" stroke="{edge_color}" stroke-width="5"/>
  {inner}
  <text x="150" y="205" font-family="sans-serif" font-size="12" fill="#4a4a3a" text-anchor="middle">{esc(label)}</text>
</svg>'''


def cappello_svg(nome, cap_color, edge_color):
    return svg_wrapper(
        f'''
  <ellipse cx="150" cy="115" rx="105" ry="70" fill="{cap_color}" stroke="#3a2f22" stroke-width="3"/>
  <ellipse cx="150" cy="95" rx="90" ry="52" fill="{cap_color}" opacity="0.55"/>
  <ellipse cx="120" cy="80" rx="14" ry="8" fill="#ffffff" opacity="0.25"/>
''',
        edge_color,
        f"{nome} — cappello (illustrazione)",
    )


def imenoforo_svg(nome, tipo, cap_color, edge_color):
    tipo = (tipo or "").lower()
    pattern = ""
    cx, cy, r = 150, 110, 85
    if "pori" in tipo:
        dots = []
        import math
        for ring in range(1, 6):
            rr = ring * (r / 6)
            n = ring * 6
            for i in range(n):
                a = 2 * math.pi * i / n
                x = cx + rr * math.cos(a)
                y = cy + rr * math.sin(a) * 0.55
                dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="2.6" fill="#3a2f22" opacity="0.55"/>')
        pattern = "".join(dots)
    elif "aghi" in tipo:
        import math
        spikes = []
        for i in range(28):
            a = 2 * math.pi * i / 28
            x1 = cx + 12 * math.cos(a)
            y1 = cy + 12 * math.sin(a) * 0.55
            x2 = cx + r * math.cos(a)
            y2 = cy + r * math.sin(a) * 0.55
            spikes.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#3a2f22" stroke-width="2" opacity="0.5"/>')
        pattern = "".join(spikes)
    elif "pieghe" in tipo:
        import math
        lines = []
        for i in range(20):
            a = 2 * math.pi * i / 20
            x2 = cx + r * math.cos(a)
            y2 = cy + r * math.sin(a) * 0.55
            lines.append(f'<path d="M {cx} {cy} Q {(cx+x2)/2+8} {(cy+y2)/2} {x2:.1f} {y2:.1f}" stroke="#3a2f22" stroke-width="2" fill="none" opacity="0.5"/>')
        pattern = "".join(lines)
    else:  # lamelle default
        import math
        lines = []
        for i in range(24):
            a = 2 * math.pi * i / 24
            x2 = cx + r * math.cos(a)
            y2 = cy + r * math.sin(a) * 0.55
            lines.append(f'<line x1="{cx}" y1="{cy}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#3a2f22" stroke-width="2" opacity="0.5"/>')
        pattern = "".join(lines)

    return svg_wrapper(
        f'''
  <ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r*0.55:.0f}" fill="{cap_color}" stroke="#3a2f22" stroke-width="3"/>
  {pattern}
''',
        edge_color,
        f"{nome} — imenoforo ({tipo or 'n/d'})",
    )


def gambo_svg(nome, ha_anello, ha_volva, cap_color, edge_color):
    anello = ""
    if ha_anello:
        anello = '<ellipse cx="150" cy="110" rx="26" ry="7" fill="none" stroke="#3a2f22" stroke-width="3"/>'
    volva = ""
    if ha_volva:
        volva = '<path d="M 118 175 Q 150 205 182 175 L 182 190 Q 150 218 118 190 Z" fill="#f5f0e6" stroke="#3a2f22" stroke-width="3"/>'
    return svg_wrapper(
        f'''
  <rect x="130" y="60" width="40" height="130" rx="16" fill="#f0e9d8" stroke="#3a2f22" stroke-width="3"/>
  <ellipse cx="150" cy="60" rx="60" ry="18" fill="{cap_color}" stroke="#3a2f22" stroke-width="3"/>
  {anello}
  {volva}
''',
        edge_color,
        f"{nome} — gambo{' con anello' if ha_anello else ''}{' e volva' if ha_volva else ''}",
    )


def slug_to_label(nome_scientifico):
    return nome_scientifico


def main():
    with open(DATA_FILE, encoding="utf-8") as f:
        specie = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)
    count = 0
    for s in specie:
        sid = s["id"]
        nome = s["nome_scientifico"]
        cap_color = pick_color(s.get("colore_cappello", []))
        edge_color = EDIBILITY_COLOR.get(s["commestibilita"], "#6b6b6b")
        tipo_imenoforo = s.get("imenoforo_tipo", "lamelle")

        paths = s["immagini"]
        # immagini[0]=cappello, [1]=imenoforo, [2]=gambo per convenzione nel dataset
        cappello_path = os.path.join(BASE, paths[0])
        imenoforo_path = os.path.join(BASE, paths[1])
        gambo_path = os.path.join(BASE, paths[2])

        with open(cappello_path, "w", encoding="utf-8") as f:
            f.write(cappello_svg(nome, cap_color, edge_color))
        with open(imenoforo_path, "w", encoding="utf-8") as f:
            f.write(imenoforo_svg(nome, tipo_imenoforo, cap_color, edge_color))
        with open(gambo_path, "w", encoding="utf-8") as f:
            f.write(gambo_svg(nome, s.get("anello", False), s.get("volva", False), cap_color, edge_color))
        count += 3

    print(f"Generate {count} immagini SVG segnaposto in {OUT_DIR}")


if __name__ == "__main__":
    main()
