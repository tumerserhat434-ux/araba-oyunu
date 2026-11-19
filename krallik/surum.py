#!/usr/bin/env python3
# Önbellek kırıcı: her yayından önce çalıştır (python3 krallik/surum.py).
# js/*.js içindeki './x.js' içe aktarmalarına ve index.html'deki main.js/style.css bağlantılarına ?v=<zaman> ekler,
# böylece telefonlar eski dosyaları önbellekten kullanmaz.
import re, time, pathlib
D = pathlib.Path(__file__).parent
v = time.strftime('%y%m%d%H%M')
for f in (D / 'js').glob('*.js'):
    s = f.read_text(encoding='utf-8')
    n = re.sub(r"((?:from|import\()\s*'\./[A-Za-z0-9_]+\.js)(?:\?v=[0-9a-z]+)?'", r"\1?v=" + v + "'", s)
    if n != s: f.write_text(n, encoding='utf-8')
h = D / 'index.html'; s = h.read_text(encoding='utf-8')
s = re.sub(r'(href="style\.css)(?:\?v=[0-9a-z]+)?"', r'\1?v=' + v + '"', s)
s = re.sub(r'(src="js/main\.js)(?:\?v=[0-9a-z]+)?"', r'\1?v=' + v + '"', s)
h.write_text(s, encoding='utf-8')
# görseller, modeller, sesler: dosya adının sonuna ?v= (Safari eski kahraman/bina resimlerini önbellekten göstermesin)
AST = re.compile(r"(\.(?:webp|png|jpg|jpeg|glb|mp3))(?:\?v=[0-9a-z]+)?(?=['\"`)\s])")
for f in list((D / 'js').glob('*.js')) + [D / 'style.css', D / 'index.html']:
    s = f.read_text(encoding='utf-8'); n = AST.sub(r"\1?v=" + v, s)
    if n != s: f.write_text(n, encoding='utf-8')
print('sürüm', v)
