# 🌿 Orman Kaçışı

Yağmur ormanında, gece geçen 3D sonsuz koşu oyunu. Telefonda ve bilgisayarda tarayıcıdan oynanır, kurulum gerekmez.

Engellerin üstünden zıpla, altından kay, şerit değiştir, dev ağaç gövdelerine tırman ve altınları topla.
**Bir yere çarparsan ayı peşine düşer. Ayı peşindeyken bir kez daha çarparsan yakalanırsın!**

## Kontroller

| Hareket | Telefon | Klavye |
|---|---|---|
| Şerit değiştir | Sola / sağa kaydır | ← → veya A D |
| Zıpla | Yukarı kaydır | ↑, W veya Boşluk |
| Kay / havadayken hızlı in | Aşağı kaydır | ↓ veya S |
| Duraklat | ❚❚ düğmesi | Esc / P |

## Engeller

- **Kütük**: üstünden zıpla (çarparsan tökezlersin, ayı gelir)
- **Sarmaşıklı alçak dal**: altından kay
- **Kaya / kesik kütük**: şerit değiştir (önden çarpmak oyunu bitirir)
- **Devrilmiş dev gövde**: rampadan çık ya da zıplayarak üstüne atla, üstünde koş (önden çarpmak oyunu bitirir)
- **Dere**: üstünden zıpla, yoksa suya düşüp tökezlersin

## Güçlendiriciler

- 🧲 **Mıknatıs**: altınları sana çeker (10 sn)
- 👟 **Süper Zıplama**: çok daha yükseğe zıplarsın (10 sn)
- ⭐ **x2 Puan**: puanı ikiye katlar (15 sn)

## Grafik

Her şey kodla üretiliyor: dokular, ağaçlar, eğrelti otları, parlayan mantarlar, ateşböcekleri, yağmur, şimşek, ay ışığı huzmeleri, kafa lambası ve ıslak, yansımalı çamur yol. Bloom ışıma efekti ve gölgeler de var. Menüdeki **Grafik** düğmesi Yüksek, Orta ve Düşük arasında geçiş yapar. Telefon kasarsa Düşük'ü seç.

Sesler de dosyasız, WebAudio ile üretiliyor: yağmur, gök gürültüsü, gece böcekleri, ayı kükremesi ve davul müziği.

## Çalıştırma

ES modülleri kullandığı için dosyayı çift tıklayarak açmak çalışmaz, bir web sunucusu gerekir:

```bash
python3 -m http.server 8000
# sonra tarayıcıda http://localhost:8000 adresini aç
```

### GitHub Pages ile telefonda oynama

1. GitHub'da depo sayfasında **Settings → Pages** bölümüne gir.
2. **Source** olarak "Deploy from a branch" seç, oyunun bulunduğu dalı ve `/ (root)` klasörünü seçip kaydet.
3. Bir iki dakika sonra oyun `https://<kullanıcı-adı>.github.io/araba-oyunu/` adresinde açılır.
4. Telefonda bu adresi açıp **Ana ekrana ekle** dersen uygulama gibi tam ekran çalışır.

## Dosyalar

- `index.html`: sayfa ve arayüz
- `style.css`: menü ve HUD tasarımı
- `game.js`: oyun motoru (grafik, fizik, engeller, ayı, ses)
- `lib/`: Three.js r170 (MIT lisansı)
- `eski-araba/`: depodaki eski araba oyunu denemesi
