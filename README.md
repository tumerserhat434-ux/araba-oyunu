# 🎮 Oyunlar

Bu depoda iki tarayıcı oyunu var. Ana sayfa (`index.html`) oyun seçme menüsüdür.

| Oyun | Klasör | Tür |
|---|---|---|
| ⚜ **Demir Sancak** | `krallik/` | Krallık kurma ve strateji |
| 🌿 **Orman Kaçışı** | `orman-kacisi/` | Sonsuz koşu |

---

# ⚜ Demir Sancak

Krallığını kur, binaları yükselt, ordu eğit, kahraman çağır ve komşu krallıklara saldır.

- **Binalar:** Belediye Binası, Kışla, Okçu Kulesi, Hastane, İksir Deposu, Karakter Deposu, Çağırma Atölyesi, Çiftlik, Kereste Atölyesi, Taş Ocağı, Ambar ve surlar
- **Askerler:** Kılıç Piyadesi, Mızrakçı, Okçu, Şövalye Süvari (taş-kağıt-makas dengesi)
- **Hastane ve iksir:** savaşta yaralananlar hastaneye gelir, iyileştirilir; iksirler anında iyileştirir
- **Kahramanlar:** 15 özgün kahraman, 2★ ile 5★ arası. Çağırma Atölyesi'nde altınla 1x veya 10x çağırma. 5★ şansı %0,6, 150 çağırmada garanti
- **Savaş:** dünya haritasından krallıklara saldır, 3D savaş sahnesini izle; düşmanlar da zaman zaman şehrine saldırır
- **Altın mağazası:** demo, gerçek ödeme alınmaz

- **3D modeller:** 12 bina Higgsfield (GPT Image konsept + Tripo 3D) ile bu oyun için özel tasarlandı (`krallik/assets/hf`); karakterler ve dekor KayKit (CC0) paketlerinden

> Not: Diğer krallıklar şimdilik bilgisayar tarafından yönetiliyor. Gerçek çevrimiçi oyuncularla oynamak için bir sunucu/veritabanı (ör. Firebase) bağlanması gerekir.

---

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
3. Bir iki dakika sonra oyun menüsü `https://<kullanıcı-adı>.github.io/araba-oyunu/` adresinde açılır.
4. Telefonda bu adresi açıp **Ana ekrana ekle** dersen uygulama gibi tam ekran çalışır.

## Dosyalar

- `orman-kacisi/`: oyunun dosyaları (`game.js` oyun motoru)
- `krallik/`: Demir Sancak (`js/` içinde oyun mantığı, 3D modeller, sahneler)
- `lib/`: Three.js r170 (MIT lisansı)
- `eski-araba/`: depodaki eski araba oyunu denemesi
