"""Simbolo Pronao (viewBox 64x64): un tempio che poggia su un libro aperto.
Genera SVG e PNG dalla stessa geometria."""
from PIL import Image, ImageDraw
import sys

GREEN = "#1d5747"
IVORY = "#f4eee2"

def qbez(p0, p1, p2, n=24):
    return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/n for i in range(n+1)]]

def page(sign):
    # sign = -1 pagina sinistra, +1 destra; costola al centro x=32
    m = lambda p: (32 + sign*(32-p[0]) * -1 if False else 32 + sign*abs(32-p[0]), p[1])
    top = qbez((32.0,47.6),(21.0,43.0),(8.5,45.2))
    bot = qbez((8.5,49.6),(21.0,47.6),(32.0,52.4))
    pts = top + bot
    return [(32 + sign*(32-x) if sign>0 else x, y) for x,y in pts] if sign>0 else pts

def shapes():
    fg, bg = IVORY, GREEN
    s = []
    # frontone a linea: triangolo pieno e triangolo interno del colore di fondo
    s.append(("poly", [(12,22.6),(32,11.2),(52,22.6)], fg))
    s.append(("poly", [(18.2,20.9),(32,13.3),(45.8,20.9)], bg))
    s.append(("rect", (13,23.8,38,2.2), fg))                    # architrave
    s.append(("rect", (14.5,26.9,35,0.9), fg))                  # fregio sottile
    centers = [19, 27, 37, 45]
    for c in centers:
        s.append(("rect", (c-2.7,28.6,5.4,1.5), fg))            # capitello
        s.append(("rect", (c-1.9,30.1,3.8,11.0), fg))           # fusto
        s.append(("rect", (c-0.35,31.0,0.7,9.2), bg))           # scanalatura
        s.append(("rect", (c-2.7,41.1,5.4,1.2), fg))            # base
    s.append(("rect", (13,42.9,38,2.0), fg))                    # stilobate
    s.append(("poly", page(-1), fg))                            # libro aperto
    s.append(("poly", page(+1), fg))
    return s

def svg():
    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Pronao">',
           f'  <rect width="64" height="64" rx="14" fill="{GREEN}"/>']
    for kind, g, col in shapes():
        if kind == "poly": out.append(f'  <polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x,y in g)}" fill="{col}"/>')
        else: out.append(f'  <rect x="{g[0]:g}" y="{g[1]:g}" width="{g[2]:g}" height="{g[3]:g}" fill="{col}"/>')
    out.append("</svg>")
    return "\n".join(out) + "\n"

def png(size, path):
    S = 6; W = size*S; k = W/64
    im = Image.new("RGBA", (W,W), (0,0,0,0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0,0,W-1,W-1], radius=14*k, fill=GREEN)
    for kind, g, col in shapes():
        if kind == "poly": d.polygon([(x*k,y*k) for x,y in g], fill=col)
        else: d.rectangle([g[0]*k, g[1]*k, (g[0]+g[2])*k, (g[1]+g[3])*k], fill=col)
    im.resize((size,size), Image.LANCZOS).save(path)

if __name__ == "__main__":
    B = sys.argv[1]
    open(f"{B}/pronao-simbolo.svg","w").write(svg())
    for n in (512, 120): png(n, f"{B}/pronao-simbolo-{n}.png")
    png(180, sys.argv[2])
