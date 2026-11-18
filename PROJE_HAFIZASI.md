# PROJE HAFIZASI — araba-oyunu deposu

> Bu dosya, yeni bir sohbete yüklendiğinde projeyi kaldığı yerden sürdürmek için hazırlandı.
> Son güncelleme: son commit `eb4c747` ("Demir Sancak: çoğunlukla gece, arada kısa alacakaranlık döngüsü").
> Bu dosyada yalnızca doğrulanmış bilgiler var. Bilinmeyenler **"Bilinmiyor / doğrulanmadı"** diye işaretlendi.

---

## 0. Hızlı özet

- **Depo:** `tumerserhat434-ux/araba-oyunu` (GitHub)
- **Çalışılan dal:** `claude/laughing-hamilton-eaghgm` (güncel, `claude/selam-naber-ilicoo` üzerine devam). Önceki dal `claude/forest-parkour-mobile-game-9oxplw` bunun içine alındı. `main` dalına hiç aktarılmadı.
- **Oyunlar** (tarayıcıda çalışır, kurulum gerekmez):
  1. **Orman Kaçışı** (`orman-kacisi/`): Subway Surfers tarzı, yağmur ormanında gece geçen 3D sonsuz koşu. İlk çarpışmada ayı kovalar. **Tamamlandı, şu an dokunulmuyor.**
  2. **Demir Sancak** (`krallik/`): Rise of Kingdoms tarzı krallık kurma ve strateji oyunu. **Aktif geliştirilen proje.**
- **Ana sayfa:** `index.html` (kök), iki oyun arasında seçim menüsü.
- **Yayın:** GitHub Pages, adres `https://tumerserhat434-ux.github.io/araba-oyunu/`.
  - Kullanıcı oyunu bu adreste iPhone'dan açıp ekran görüntüsü gönderdi, yani Pages çalışıyor.
  - Pages'in hangi dalı yayınladığı (`main` mi, çalışma dalı mı) kesin doğrulanmadı.
  - Başta Pages `main` dalını gösteriyordu ve kullanıcıya dalı değiştirmesi önerilmişti.
- **Kullanıcı:** Türkçe konuşuyor ("knk" hitabı), mobil oyun istiyor, iPhone Safari'de test ediyor.
  - Profesyonel ve kaliteli grafik istiyor, "basit/şablon/lego gibi" görünümden hoşlanmıyor.
  - Görsel referans olarak ekran görüntüleri gönderiyor.

---

## 1. Teknolojiler

| Alan | Kullanılan |
|---|---|
| 3D motor | **Three.js r170**, projeye gömülü: `lib/three.module.min.js` + `lib/jsm/` (ES modül, importmap ile) |
| Three eklentileri | GLTFLoader, SkeletonUtils, BufferGeometryUtils, meshopt_decoder, postprocessing (EffectComposer, UnrealBloomPass, OutputPass, RenderPass, ShaderPass, MaskPass, Pass) + CopyShader, LuminosityHighPassShader, OutputShader |
| Dil | Saf JavaScript (ES modülleri), HTML, CSS. Derleme adımı yok |
| Ses | WebAudio. Orman Kaçışı tamamen prosedürel; Demir Sancak MP3 dosyaları + prosedürel yedek |
| Kayıt | `localStorage` |
| Yazı tipleri | Google Fonts: Cinzel, Nunito, Lilita One |
| 3D modeller | KayKit (CC0) + **Higgsfield** ile üretilen özel modeller (Tripo H3.1 image-to-3D, Meshy 3D Rigging) |
| 2D görseller | Higgsfield `gpt_image_2_6` (konsept, simge, afiş) |
| Müzik/SFX | Higgsfield `elevenlabs_music_v2_5` (müzik), `mirelo_text_to_audio` (efekt) |
| Model sıkıştırma | `@gltf-transform` (weld/dedup/prune/meshopt), doku 1024 veya 768 JPEG, `ffmpeg` (MP3 96k). Araçlar scratchpad'deydi, depoda yok |
| Test | Playwright + Chromium (SwiftShader WebGL), telefon boyutu 400×820 ekran görüntüleri |

**Yerel çalıştırma:** ES modülleri yüzünden dosyayı çift tıklamak çalışmaz.
```bash
cd araba-oyunu && python3 -m http.server 8000
# http://localhost:8000  (Demir Sancak: /krallik/, Orman Kaçışı: /orman-kacisi/)
```

---

## 2. Dosya yapısı

```
/
├── index.html                 Oyun seçme menüsü (Demir Sancak + Orman Kaçışı kartları)
├── README.md                  İki oyunun tanıtımı ve GitHub Pages talimatı
├── PROJE_HAFIZASI.md          (bu dosya)
├── eski-araba/                Depodaki ilk araba denemesi (boş/1 baytlık assetler). Saklanıyor, kullanılmıyor
├── lib/                       Three.js r170 + eklentiler (THREE_LICENSE, MIT)
├── orman-kacisi/              Orman Kaçışı oyunu
│   ├── index.html, style.css, game.js (1877 satır), manifest.json, icon.svg, sw.js (PWA, önce-ağ önbellek)
└── krallik/                   Demir Sancak oyunu
    ├── index.html             Oyun arayüzü iskeleti (HUD, nav, sheet, modal, overlay)
    ├── style.css              Tüm stiller (513 satır; sonunda "UI v2" pencere sistemi)
    ├── manifest.json, icon.svg
    ├── js/
    │   ├── main.js      (1143)  Şehir sahnesi, kamera, etiketler, bina paneli, modallar, gece atmosferi, döngü, boot
    │   ├── state.js     (492)   Oyun durumu, kayıt, ekonomi, savaş simülasyonu, çağırma, görevler, araştırma, tick
    │   ├── data.js      (181)   Binalar, arsalar, askerler, kahramanlar, mağaza, araştırma, görevler, giriş ödülleri
    │   ├── scenes.js    (612)   3D katman sahneleri: savaş, çağırma atölyesi, kahraman görüntüleyici, portreler
    │   ├── buildings.js (1194)  Bina oluşturma: prosedürel (eski) + KayKit + Higgsfield modelleri, hareketli parçalar
    │   ├── units.js     (866)   Askerler/kahramanlar: prosedürel (eski) + KayKit animasyonlu + Higgsfield kahraman 3D
    │   ├── assets.js    (121)   GLTF yükleyici: KayKit modelleri, karakterler, Higgsfield binaları/parçaları/kahramanları
    │   ├── audio.js     (210)   Müzik temaları (city/battle/summon), SFX dosyaları, prosedürel yedek, ortam sesi
    │   ├── tut.js       (116)   16 adımlı öğretici (danışman Nöbetçi Emre)
    │   ├── life.js      (262)   Şehirde yürüyen köylüler, kuş sürüleri, (kapalı: öküz arabası, tezgâh, fener)
    │   ├── grass.js     (119)   GPU instancing ile rüzgârlı 3D çim (ŞU AN KULLANILMIYOR)
    │   ├── terrain.js   (140)   Taş yol ve meydan zemini (ŞU AN KULLANILMIYOR)
    │   └── icons.js     (67)    SVG simge seti (kısmen kullanılıyor; çoğu yerde webp simgelere geçildi)
    ├── assets/
    │   ├── hf/          Higgsfield binalar (12) + hareketli parçalar (7), toplam ~6.2 MB
    │   ├── heroes3d/    15 animasyonlu kahraman GLB, ~4.8 MB (isteğe bağlı yüklenir)
    │   ├── heroes/      15 kahraman kart görseli (.webp) + 15 avatar (_a.webp), ~700 KB
    │   ├── chars/       KayKit karakterleri (Knight, Barbarian, Rogue, Rogue_Hooded, Mage) + LICENSE, ~3 MB
    │   ├── kk/          KayKit Medieval Hexagon Pack seçilmiş modeller (146 dosya, .gltf+.bin+png) + LICENSE, ~3.8 MB
    │   ├── ui/          Higgsfield UI simgeleri ve afişler (.webp), ~450 KB
    │   └── audio/       Müzik (3), SFX (14), ortam (1), ~3.1 MB
    ├── bprev.html           Önizleme: bina seviyeleri
    ├── hfprev.html          Önizleme: Higgsfield bina modelleri
    ├── kkprev.html          Önizleme: KayKit modelleri
    └── units-preview.html   Önizleme: askerler/kahramanlar
```

---

## 3. Orman Kaçışı (tamamlandı)

- **Oynanış:** 3 şerit; kaydırma ya da ok tuşlarıyla şerit değiştirme, zıplama (↑), kayma (↓). Havadayken ↓ hızlı iniş yapar.
- **Engeller:**
  - Kütük: zıplanır. Önden çarpınca tökezlersin.
  - Sarmaşıklı alçak dal: altından kayılır.
  - Kaya/kesik kütük: önden çarpmak oyunu bitirir.
  - Dev gövde: üstüne rampayla ya da zıplayarak çıkılır, önden çarpmak oyunu bitirir.
  - Dere: zıplanır, suya düşersen tökezlersin.
- **Ayı mekaniği:** İlk tökezlemede ayı yaklaşık 7 sn kovalar (`BEAR_TIME=7`). Bu sürede ikinci tökezlemede yakalanırsın. Oyun başında da kısa bir kovalama var.
- **Güçlendiriciler:** Mıknatıs (10 sn), Süper Zıplama (10 sn), x2 Puan (15 sn).
- **Grafik:**
  - Prosedürel dokular, ağaçlar, eğrelti, parlayan mantarlar, ateşböcekleri, yağmur, şimşek.
  - Ay huzmeleri, kafa lambası, ıslak yol.
  - Bloom; 3 kalite kademesi (Düşük/Orta/Yüksek).
- **Ses:** Tamamen prosedürel (yağmur, gök gürültüsü, böcekler, ayı kükremesi, davul).
- **Kayıt anahtarları:** `ok_best`, `ok_bank`, `ok_sound`, `ok_quality`, `ok_tut`.
- **Test:** Bot simülasyonuyla birkaç oyunda 6.5 km boyunca hatasız koşuldu.

---

## 4. Demir Sancak: oyun mekanikleri

### 4.1 Kaynaklar ve binalar (`data.js`)

- **Kaynaklar:** yiyecek, odun, taş, altın.
- **Başlangıç kaynakları:** 6000 / 6000 / 3000 / 1200 altın.
- **Binalar** (anahtar → ad):

  | Anahtar | Ad | Not |
  |---|---|---|
  | townhall | Belediye Binası | Diğer binaların seviye sınırını belirler |
  | barracks | Kışla | |
  | archery | Okçu Kulesi | 2 arsa |
  | hospital | Hastane | |
  | potion | İksir Deposu | |
  | heroes | Karakter Deposu | Kahraman seviye sınırı = sv×6 |
  | summon | Çağırma Atölyesi | |
  | farm | Çiftlik | 2 arsa |
  | lumber | Kereste Atölyesi | 2 arsa |
  | quarry | Taş Ocağı | 2 arsa |
  | warehouse | Ambar | Depo sınırı + yağma koruması |
  | academy | Akademi | Belediye Binası Sv.3 gerekir |
  | forge | Demirhane | BB Sv.2. Tüm birlik savunması +%2,5/sv, tank üretim hızı +%8/sv. Arsa (12,-30) |
  | rally | Toplanma Kampı | BB Sv.2. Saldırı gücü +%3/sv, ganimet taşıma +%8/sv. Arsa (-12,-30) |
  | tankyard | Tank Atölyesi | BB Sv.3 + Demirhane Sv.1 (`reqB`). Tank üretir. Arsa (-14,28) |

- **Seviyeler:**
  - En yüksek seviye 10.
  - Maliyet `base × 1.72^(sv-1)`, süre `time × 1.6^(sv-1)`. Taş İşçiliği araştırması süreyi azaltır.
  - Aynı anda 2 inşaatçı çalışır.
- **Sabit arsalar (`PLOTS`):**
  - Belediye Binası (0,0) merkezde.
  - Diğerleri çevrede. Akademi (16,28).
  - Sur yarıçapı 40.
- **Üretim:**
  - Saatlik üretim `rate × sv × 1.12^(sv-1)`, Tarım araştırmasıyla artar.
  - Kapasite = 3 saatlik üretim. Binaya dokununca toplanır.

### 4.2 Askerler

- **Asker türleri:**
  - Kılıç Piyadesi (infantry)
  - Mızrakçı (spearman)
  - Okçu (archer)
  - Şövalye Süvari (cavalry, Kışla Sv.3 gerekir)
  - **Demir Tank (tank)**: Tank Atölyesi'nde ayrı kuyrukta üretilir (`S.tankTraining`, `startTankTraining`). Parti `2 + atölyeSv×2`, hız `(1+atölye×0.1)×(1+demirhane×0.08)`. atk 70 / def 60 / hp 180 / yük 40. Güçlü düşmanlar (güç > 9000) az sayıda tank getirir.
- **Karşılık tablosu (`COUNTER`):**
  - Tank; piyade/mızrakçıya ×1.35, okçuya ×1.5, süvariye ×1.2. Okçular tanka ×0.55, süvari ×0.75.
  - Okçu, piyade ve mızrakçıya karşı ×1.3.
  - Süvari, okçuya karşı ×1.5.
  - Mızrakçı, süvariye karşı ×1.5.
- **Eğitim:**
  - Parti büyüklüğü `40 + kışlaSv×30`.
  - Hız `(1 + sv×0.12) × (1 + Talim)`.
- **Hastane:**
  - Kapasite `sv×180 × (1 + Hekimlik)`.
  - Kayıpların %75'i yaralı olur, kapasite yetmezse ölü sayılır.
  - İyileştirme kaynak harcar.
- **İksir:**
  - Deposu Sv×2+3 adet tutar.
  - Bir iksir anında 40 + sv×10 asker iyileştirir.

### 4.3 Kahramanlar ve çağırma

- **23 özgün kahraman** (id, ad). Yeni 5★: kerem (Aslanyürek Kerem, piyade), selin (Yıldızok Selin, okçu), bora (Fırtınabey Bora, süvari, rig başarısız → hareketsiz model + koddan nefes), nilufer (Şafak Kraliçesi Nilüfer, piyade), doruk (Demirusta Doruk, **tank** komutanı). Yeni 4★: tolga (piyade), ece (okçu), arda (tank). Eski liste:

  | Nadirlik | Kahramanlar |
  |---|---|
  | 5★ | tugrul (Demirpençe Tuğrul), elara (Gölgeok Elara), baran (Altınkalkan Baran) |
  | 4★ | kaan, lara, oguz, aybike |
  | 3★ | emre (Nöbetçi Emre, başlangıç komutanı), defne, burak, mert |
  | 2★ | ali, zeynep, cem, hasan |

- **Oranlar:** 5★ %0,6 • 4★ %5,4 • 3★ %26 • 2★ %68.
- **Güvenceler:** 5★ en geç 150 çağırmada garanti. Her 10 çağırmada en az bir 4★. 10'lu çekilişte en az bir 3★.
- **Fiyat:** 1x 100 altın, 10x 900 altın, günde 1 ücretsiz.
- **Kopya:** Aynı kahramanın kopyası (en fazla 5) bonusu artırır.
- **Komutan:** Saldırıda seçilir ve savunmada kullanılır. Bonus `heroBonus()` ile hesaplanır.
- **Test:** 20.000 çağırmalık simülasyonda 5★ ortalama her 98 çekilişte bir geldi.

### 4.4 Savaş (`state.js → simulateBattle`)

- **Yöntem:** Lanchester tarzı tur tabanlı hesap, en fazla 12 tur. Hesaba girenler:
  - Kahraman bonusu
  - Karşılık tablosu
  - Okçu kulesi hasarı
  - Demircilik ve Zırhçılık araştırmaları
- **Dünya haritası:** 10 yapay zekâ krallığı. Galip gelinen krallığa 90 sn kalkan verilir.
- **Ganimet:** Taşıma kapasitesi (Lojistik araştırması ile artar) kadar alınır.
- **Düşman baskını:** Her 300–540 sn'de bir şehre saldırı gelir, 30 sn önce uyarı verilir. Kaybedilirse Ambar'ın koruma oranı dışındaki kaynaklar yağmalanır.
- **3D savaş sahnesi:** Görsel bir canlandırma; sonucu yukarıdaki simülasyon belirliyor. "Geç" düğmesi var.

### 4.5 Diğer sistemler

- **Görevler:** 19 ana görev zinciri, 6 günlük görev, 4 günlük görev tamamlanınca açılan günlük sandık.
- **Giriş ödülü:** 7 günlük takvim. 7. gün 300 altın.
- **Akademi araştırmaları** (her biri 5 seviye):
  - Tarım
  - Taş İşçiliği
  - Talim
  - Demircilik
  - Zırhçılık
  - Hekimlik
  - Lojistik
- **Öğretici (`tut.js`):** 16 adım, danışman Nöbetçi Emre. İşaretçi el ve halka, kamera odaklama, sonunda 300 altın ödül. "Öğreticiyi geç" seçeneği var. Öğretici sürerken baskınlar ertelenir.
- **Mağaza:** DEMO. Gerçek ödeme yok, altın ücretsiz eklenir. Fiyatlar ₺29,99–499,99 arası gösteriliyor.
- **Sıralama:** Bilgisayar yönetimli krallıklarla birlikte gösterilir.
- **Haber akışı:** Rastgele üretilen haberler ve oyuncunun zaferleri.
- **Kayıt:**
  - `localStorage['demirsancak_v1']` (sürüm `v:1`). Eski kayıtlar için eksik alanlar `load()` içinde tamamlanır.
  - Diğer anahtarlar: `ds_sound`, `ds_music`, `ds_welcome`.

---

## 5. Demir Sancak: görsel ve ses tasarımı (güncel durum)

### 5.1 Binalar (öncelik sırası: Higgsfield > KayKit > prosedürel)

- `assets/hf/<key>.glb`: 12 bina, Higgsfield ile özel tasarlandı (GPT Image konsept + Tripo H3.1).
  - Yüklenirken `rotation.y = -π/2` ile öne çevrilir, tabanı y=0 ve merkezi ortaya alınır.
  - Gece okunur kalsın diye `emissiveMap = map`, emissive `0x40384a`.
- **Hareketli parçalar** (`buildings.js → hfAnimate`, konumlar normalize: x,z ∈ [-0.5,0.5], y ∈ [0,1], +z ön):

  | Bina | Hareket |
  |---|---|
  | Çiftlik | Yel değirmeni kanatları (`p_sails.glb`). Çiftlik modeli kanatsız yeniden üretildi |
  | Kereste Atölyesi | Su çarkı (`p_wheel`) + dönen testere (`p_saw`). Model çarksız ve testeresiz yeniden üretildi |
  | Taş Ocağı | Maden arabası (`p_cart`) ve inip kalkan vinç taşı |
  | Belediye Binası | Saat akrep/yelkovanı, kubbe ışıltısı, meşaleler |
  | Kışla | İdman yapan 2 asker |
  | Okçu Kulesi | Dönen nöbet ışığı; tepede okçular (`topY`) |
  | Hastane | Sallanan çan, şifa ışıkları |
  | İksir Deposu | Kazan köpükleri, yeşil duman |
  | Karakter Deposu | Meşaleler, ışıltı |
  | Çağırma Atölyesi | Dönen girdap portal, yörüngede kristaller (`p_crystal`) |
  | Ambar | Makara ile inip kalkan sandık |
  | Akademi | Dönen armiller küre (`p_armillary`) |

  Meydanda Higgsfield çeşmesi (`p_fountain`) ve su parçacıkları (main.js, konum 0,0,9.3) var.
- **Seviye büyümesi:**
  - Model biraz büyür (fill + sv×0.016).
  - Çevreye KayKit dekor eklenir: fıçı, bayrak, çuval, sandık, çit, el arabası.
  - Sv.10'da parlayan arma çıkar.
- **KayKit (`assets/kk`):** Higgsfield modeli yoksa yedek olarak kullanılıyor. Ayrıca ağaçlar, kayalar, surlar (sv≥4), kuleler, dağlar, bulutlar, inşaat iskelesi ve dekor bu setten.
- **Prosedürel binalar:** `buildings.js` içindeki eski fonksiyonlar (`townhall()`, `barracks()` …) duruyor ama yalnızca hiçbir model yüklenemezse çalışıyor.

### 5.2 Karakterler

- **Askerler ve köylüler:** KayKit animasyonlu karakterler (`assets/chars`).
  - Mavi takım (oyuncu): Knight ve Rogue_Hooded.
  - Kırmızı takım (düşman): Barbarian ve Rogue.
  - Kullanılan klipler: Idle, Walking_A, Running_A, 1H/2H saldırı, 2H_Ranged_Shoot, Cheer, Death_A, Sit_Chair_Idle (süvari), Use_Item, Block.
  - Karakter dosyaları kendi Python betiğimizle (`repack.py`, scratchpad'deydi) gereksiz animasyon/kanal/accessor'lardan temizlendi: 18 MB → 3 MB.
- **Atlar:** KayKit'te at olmadığı için atlar prosedürel (`units.js → buildHorse`).
- **Kahramanlar (Higgsfield):**
  - Her biri için GPT Image konsept (A-pose, beyaz zemin) → Tripo H3.1 3D → Meshy 3D Rigging (`animation_action_id: 0` = Idle).
  - `assets/heroes3d/<id>.glb`, doku 768, ~300–375 KB.
  - `units.js → attachHero3d`: Önce KayKit yer tutucusu görünür. GLB yüklenince onun yerine geçer (`rotation.y = -π/2`).
  - Yalnızca bekleme animasyonu var. Sevinç hareketi koddan küçük bir zıplama.
- **Kahraman 2D görselleri:** `assets/heroes/<id>.webp` (kart, 360×480), `<id>_a.webp` (avatar). `scenes.js → getPortrait()/getAvatar()` bu dosyaları döndürür.

### 5.3 Arayüz (UI v2)

- **Pencere sistemi** (`main.js: head(title, icon, tabs, active)` + `openModal`):
  - Mor-lacivert gövde ve altın çerçeve.
  - Tepede defne dallı mor başlık levhası, üstünde madalyon simge, sağ üstte kırmızı kapatma düğmesi.
  - Solda sekmeler (`data-wtab`).
  - İçerik bileşenleri: afiş (`.w-banner`), istatistik kartları (`.w-stat`), rozetler (`.w-badge`), ödül yolu (`.w-track`), görev satırları (`.w-row`), düğmeler (`.w-btn`).
- **Sekmeli pencereler:**
  - Görevler: Ana / Günlük / Giriş Ödülü
  - Profil: Profilim / Ayarlar
  - Kahramanlar: Benimkiler / Koleksiyon
  - Mağaza: Altın / Kaynak
- **Diğer pencereler:** Dünya, Saldırı, Raporlar, Ordu, Sıralama tek sekmeli, aynı çerçevede.
- **Bina paneli** (alttan açılan): Aynı mor-altın tema; başlık madalyonunda binanın 3D portresi (`getBuildingPortrait`).
- **Alt menü:** Şehir, Dünya, Görev, Kahraman, Mağaza, Rapor. Higgsfield simgeleri (`assets/ui/nav_*.webp`), seçili sekme altınla parlar.
- **Diğer HUD öğeleri:**
  - Üst kaynak çubuğu: `res_*.webp`.
  - Sağ düğmeler: Etkinlikler, Teklifler, Ödüller, Sıralama, Çağır.
  - Altta görev çubuğu ve haber satırı.
  - Sol üstte komutan avatarı.

### 5.4 Ortam: gece

- **Renkler:** Lacivert gök (`0x0b1430`) ve sis, mavi ay ışığı (DirectionalLight `0x9fb8ff`), Hemisphere `0x5a74c8`.
- **Gök cismi ve canlılar:** Yıldızlar (Points), ay (sprite), ateşböcekleri.
- **Bina ışıkları:**
  - Her arsada titreyen turuncu ışık havuzu ve hale.
  - Gerçek PointLight'lar: masaüstünde 6, telefonda 3 (townhall, summon, barracks). Ayrıca çeşme ışığı.
- **Döngü:** 10 dakikalık tur. %80'i gece, son %20'si mor-turuncu alacakaranlık. Tam gündüz hiç yok. Kod `main.js → buildNight → nightTick` içinde.
- **Zemin:** Tek renk koyu yeşil (`0x3a7430`). Kullanıcı taşlı zemini istemedi, kaldırıldı.
- **Savaş sahnesi:** Gece (koyu zemin rengi `0x4a5a78`, iki meşale ışığı).

### 5.5 Ses (`audio.js`)

- **Müzik:** `music_city` (90 sn), `music_battle` (60 sn), `music_summon` (40 sn). `setTheme()` ile geçişli değişir.
- **Efektler (SFX):** click, coin, build, built, train, horn, clash, win, lose, summon, reveal5, heal, open, arrow.
- **Ortam sesi:** `ambience.mp3` (20 sn döngü).
- **Yedek:** Dosya yüklenemezse eski prosedürel Karplus-Strong lavta müziği ve efektler devreye girer.
- **Başlatma:** Ses ilk dokunuşla başlar (iOS kısıtı). Profil > Ayarlar'da müzik ve efekt ayrı ayrı açılıp kapanır.

---

### 5.6 Tank ve yeni binalar (bu oturum)
- Higgsfield: 4 görsel (`gpt_image_2_6`) + 4 Tripo H3.1 3D → `assets/hf/tankyard.glb`, `rally.glb`, `forge.glb`, `u_tank.glb` (parça listesinde). ~37 kredi.
- Konsept görsellerinden kesilen simgeler: `assets/ui/b_tank.webp`, `b_tankyard.webp`, `b_rally.webp`, `b_forge.webp`.
- `units.js → createTank(team)`: Higgsfield modeli, mavi/kırmızı ton; `animateTank` (sarsıntı, geri tepme, yok olma).
- Savaş sahnesinde tanklar ön safta, topla atış yapar (gülle + patlama). Görselde 1 tank ≈ 8 asker ağırlığında, en fazla 8 tank.
- Şehirde: Tank Atölyesi önünde park etmiş tank + baca dumanı; Demirhane ocak ateşi; Toplanma Kampı kamp ateşi ve iki nöbetçi.
- Pencere kaydırma düzeltmesi: `.modal-box.win` yükseklik sınırlı, `.w-main` kendi içinde kayar (iPhone dahil).
- Yeni görevler: qf1 (Demirhane), qr1 (Toplanma Kampı), qt1 (Tank Atölyesi), qt2 (5 tank üret, sayaç `tanks`).

### 5.7 Savaş alanı, görev çubuğu, çağırma atölyesi (v2)
- **Savaş alanı:** Gündüz arena. Arka plan resmi `assets/ui/bg_battle.webp` (şelale, köprü, düşman kalesi) `scene.background` olarak, ekranın üstüne `fitBattleBg` ile yerleşir. Oval toprak arena (canvas doku), KayKit çit (kamera tarafı açık), ateşli mangallar, uzak köşelerde iki kule, yanlarda ağaçlar.
  - Üstte mavi/kırmızı şeritler (avatar, isim, güç) + ortada kalkan; "Savaş Alanı" levhası.
  - Savaş "Savaşı Başlat" düğmesiyle başlar (9 sn dokunulmazsa kendiliğinden). Başlayınca can çubukları görünür.
- **Görev çubuğu:** Lacivert, altın çerçeveli, üstte taç (`assets/ui/crown.webp`), solda parşömen, "Bölüm N:" + görev + (x/y), yeşil yüzdeli çubuk, yeşil "Git »" düğmesi.
- **Çağırma atölyesi:** Arka plan `assets/ui/bg_summon.webp` (mistik tapınak), Higgsfield portal modeli `assets/hf/p_portal.glb` (parça listesinde), halkada dönen girdap, kristal ışıltıları, zeminde rün dairesi. Kahraman portal kaidesinde çıkar, önden ışıkla aydınlanır.
- Bu adımda ~10 kredi harcandı (4 görsel + 1 Tripo).

### 5.8 Sefer kampı, çoklu komutan, kahraman seviyesi 150
- **Sefer Kampı** (`attackUI`): 5 komutan yuvası + kahraman seçici, birlik başına sürgü ve 0/½/Tümü düğmeleri, Hepsini seç/Yarısı/Temizle. Birlik sınırı yok.
- Çoklu komutan: `state.js → combinedBonus` en güçlü komutan tam, diğerleri %50/%35/%25/%20 katkı. `attackEnemy(id, troops, heroIds[])`, kazanınca her komutan %50 şansla seviye alır.
- Kahraman seviye sınırı: `HERO_MAX_LEVEL = 150`, Karakter Deposu her seviye +15. `heroBonus` = taban + sv×nadirlik×0.16. `heroAtk/heroDef` her seviye %4/%3,5 artar. Maliyet `heroLevelCost` seviyeyle artar (Sv.1 ≈ 330 buğday, Sv.149 ≈ 100 bin). Görüntüleyicide x10 düğmesi.
- Çağırma tanıtım ekranı sadeleştirildi: üstte çerçeveli isim levhası, altta rol/yetenek kutusu; ışıklar ve parıltı azaltıldı.
- Bu adımda ~130 kredi (8 görsel, 8 Tripo, 9 rigging denemesi).

### 5.9 Kahraman hareketleri ve sesleri
- Meshy iskelet animasyonu (Idle) bu modellerde pelerin/eteği bozuyordu → **oynatılmıyor**. Model temiz duruşunda (bind pose) kalır.
- `units.js → heroIdle`: Spine02/Spine01/Head/kollar kemiklerine küçük açılarla nefes ve bakış.
- `units.js → HERO_MOVES` + `playHeroMove(obj)`: her kahramana özel hareket ve efekt (charge, slash, shot, slam, spin, roar, thunder, dawn, poison, steam), renkleri kahramana göre.
- Sesler: `assets/voices/<id>.mp3` (23 adet, İngilizce, Higgsfield `seed_audio`, farklı preset sesler, ~0,3 kredi/adet). `audio.js → playVoice(id)` (müziği kısar).
- Tetikleme: kahraman görüntüleyici açılınca ve kahramana dokununca; çağırmada kahraman çıkınca; Sefer Kampı'nda komutan seçince (sadece ses).
- Görüntüleyici artık kahramanı sürekli döndürmüyor; önden hafif salınım yapıyor (sürükleyerek çevrilebilir).

### 5.10 Seviye 40 sistemi (zorlaştırılmış ilerleme)
- `data.js`: Belediye en fazla **Sv.40** (`MAX_LEVEL`), diğer binaların kendi sınırı `BUILDINGS[k].max` / `maxLevel(k)`: Kışla, Okçu, Çiftlik, Kereste, Taş Ocağı, Ambar 30; Hastane, Akademi, Demirhane, Toplanma, Tank Atölyesi 25; İksir 20; Karakter Deposu ve Çağırma 10.
- Belediye gereksinimleri `thRequirements(L)`: her seviyede 2 bina (Sv.15+ 3 bina) en az L-1 seviyede olmalı (döngüsel liste). Panelde ✓/✗ listesi ve "Git" düğmesi (`data-gobld`).
- Maliyet: Sv.10'a kadar ×1.6, sonra (L/10)^3.6 (Belediye Sv.40 ≈ 3M yiyecek/odun). Süre ×1.5 ve Sv.12 sonrası (L/12)^3 (Belediye Sv.20 ≈ 3 sa, Sv.30 ≈ 10 sa, Sv.40 ≈ 23 sa). Altınla hızlandırmayı teşvik eder.
- Üretim büyümesi 1.08^(L-1) (eskiden 1.12). Depo: 20000 + 25000w + 3500w² + 10000t + 1200t².
- Görsel kademeler: Belediye Sv.10 `townhall2` (kale), Sv.20 `townhall3` (altın kubbeli saray), Sv.30 `townhall4` (kristal kale) — Higgsfield, ~28 kredi. Diğer binalar Sv.10 üstünde her 3 seviyede `tierDecor`: altın kenarlı taş kaide (11), mangallar (13), altın sancaklar (16), zemin halkası (19), altın parıltı (22), nöbet kuleleri (25), dönen rün halkası (28), ışık sütunu (31). Model büyümesi Sv.10'da sabitlenir.
- Yeni görevler q20–q25 (Belediye 15/20/30/40 vb.).
- Bildirim (toast) v2: lacivert-altın çerçeve, solda madalyon simge (mesajın başındaki emoji), hata için kırmızı.

### 5.11 Uzun süreler ve tüm binalara gelişmiş görünüm
- Süre `data.js → thSeconds(L)`: Belediye Sv.12 ≈ 37 dk, Sv.13 = 1 sa, Sv.14 = 2,5 sa, Sv.15 = 7 sa, sonra her seviye ×1,25 (Sv.20 ≈ 21 sa, Sv.30 ≈ 8 gün, Sv.40 ≈ 77 gün). Diğer binalar taban süre oranıyla ölçeklenir (`upgradeTime = thSeconds × time/12`).
- Altınla hızlandırma `gemCostForTime`: 1 saate kadar 12 sn = 1 altın, sonrası dakika başına 1 altın.
- 14 binanın tamamına Higgsfield ile "aynı binanın gelişmiş hali" modeli: `assets/hf/<anahtar>_2.glb`. Geçiş seviyeleri `buildings.js → TIER2` (Sv.30'luk binalar 12, Sv.25'likler 10, İksir 8, Karakter Deposu/Çağırma 4).
- Gelişmiş modeller ve Belediye kademe modelleri (townhall2/3/4) açılışta yüklenmez; `assets.js → ensureHF(k)` ile gerektiğinde yüklenir, `setOnHFLoaded` ile şehirde yerine geçer.
- Gelişmiş modellerde eski hareketli parçalar (yel değirmeni kanadı vb.) kullanılmaz; modelin kendi parçaları sabit.
- Notlar: SAM 3D (1 kredi) bina görsellerinde yine başarısız oldu. Referans görsel yükleme (upload.higgsfield.ai) ortam güvenlik kuralına takıldı; promptlar mevcut binanın tarifiyle yazıldı. İlk denemede 7 görsel "önce/sonra" çifti olarak çıktı, "tek bina" vurgusuyla yeniden üretildi.

### 5.12 Çevrimiçi (Firebase) — 1. ve 2. aşama
- Firebase projesi `demir-sancak` (Spark, ücretsiz). Config `krallik/js/online.js` içinde. SDK gstatic CDN'den (v10.14.1) dinamik yüklenir; yüklenemezse oyun çevrimdışı devam eder.
- Giriş: otomatik anonim (misafir). Profil > Ayarlar > "Google ile bağlan" misafir hesabı Google'a bağlar (`linkWithPopup`); Google hesabı başka kayıtta kullanılıyorsa o kayda geçme seçeneği sunulur.
- Firestore: `saves/{uid}` (tüm kayıt JSON, yalnız sahibi), `players/{uid}` (herkese açık profil: ad, güç, Belediye sv., ordu, kule gücü, komutan bonusu, yağmalanabilir kaynak, kalkan), `players/{uid}/inbox` (gelen saldırılar).
- Senkron: açılışta ve her 60 sn'de bir + sayfa gizlenince. Yeni cihazda bulutta daha ileri kayıt varsa sorarak yükler.
- Dünya haritası: güce yakın, son 14 günde aktif 6 gerçek oyuncu (🌐) bilgisayar krallıklarıyla birlikte. Saldırı onların profil anlık görüntüsüyle hesaplanır; sonuç savunanın inbox'ına gider, savunan oyunu açınca kayıplar/yağma uygulanır (kaybederse 30 dk kalkan). Aynı oyuncuya 15 dk bekleme.
- Sıralama: ilk 50 gerçek oyuncu + bilgisayar krallıkları.
- Güvenlik kuralları depoda `firestore.rules`; Firebase Console > Firestore > Rules'a yapıştırılmalı.
- Sınırlama: hesaplar istemcide (hile mümkün). 3. aşama Cloud Functions ile sunucu tarafı doğrulama (Blaze planı gerekir).
- Ortam ağ izinleri: www.gstatic.com, firestore/identitytoolkit/securetoken.googleapis.com.

### 5.13 3D krallık haritası ve seferler
- `krallik/js/worldmap.js`: Dünya düğmesi (öğretici bittiyse) 3D haritayı açar. 1000×1000 harita, çim dokusu, tohumlu orman kümeleri, dağlar; şehirler Belediye modelleriyle (seviyeye göre townhall/2/3/4), altında renkli halka (sarı: ben, mavi: gerçek oyuncu, kırmızı: bilgisayar), kalkan kubbesi, HTML etiketleri (seviye rozeti + ad).
- Kaydır/iki parmakla yakınlaştır, şehre dokun → kart (güç, zorluk, konum, yürüyüş süresi) → "Saldır" → Sefer Kampı → "Yürüyüşe çık".
- Sefer (`state.js → startMarch / tickMarches / recallMarch`): askerler çıkar, haritada kesik çizgi boyunca yürür (süre mesafeye göre 10–240 sn; tank yavaş, sadece süvari hızlı), varınca `attackEnemy` ile savaş, sonra aynı sürede geri döner ve sağ kalanlar şehre eklenir. Aynı anda en fazla 3 sefer; komutan aynı anda tek seferde. Varışta "Zafer/Yenilgi • İzle ▶" bandı (`showBattleBanner`).
- Her oyuncunun `S.server` (varsayılan 300) ve `S.mapX/mapY` koordinatı var; profil bunları da paylaşır. Haritada sunucudaki tüm gerçek oyuncular (`online.serverPlayers`, son 30 gün) + çevrede 36 bilgisayar krallığı (`ensureMapKingdoms`).
- Sunucu düğmesi (#300 ⇄ #301): başka sunucuyu görüntüle; orada tohumlu 30 bilgisayar krallığı (`foreignBots`) ve o sunucunun gerçek oyuncuları; saldırı mümkün (krallıklar arası savaş, yürüyüş uzun).
- Öğretici sırasında eski 2D harita penceresi kullanılır (öğretici adımları ona bağlı).

### 5.14 Gece krallık haritası, ışınlama, otomatik sunucular
- Harita gece temalı (`worldmap.js → nightGround`): 2048 px boyalı zemin, şehirleri birbirine bağlayan taş yollar, göller, çam ormanları (~2400 örnek), dağlar/kayalar, gözetleme kuleleri (alevli), harabeler, mavi kristaller, ~420 meşale + her şehrin etrafında 4 meşale, süzülen bulutlar. Benim şehrim daha büyük, iki mavi sancaklı; halkalar parlayan renkli.
- Bilgisayar krallığı sayısı 3'e indirildi (`MAP_BOTS = 3`, eski kayıtlarda en yakın 3 tutulur).
- Gerçek oyuncular: haritayı açınca ve harita açıkken her 30 sn'de bir sunucudaki tüm oyuncular çekilir (`serverPlayers`); yeni katılanlar hemen görünür.
- Işınlama: şehir kartında "📍 Yanına ışınlan", boş zemine dokununca "📍 Buraya ışınlan" (200 altın; seferdeyken olmaz; başka şehre 24 birimden yakın olmaz). `state.js → teleport / spotNear / spotFree`.
- Sunucular 1'den başlar. Yeni oyuncu `online.assignServer()`: 300'den küçük en yüksek sunucu numarasını bulur, o sunucuda 500 oyuncu varsa bir sonrakini açar; `placeOnServer` boş bir yere yerleştirir. Eski 300 numaralı kayıtlar yeniden atanır.

### 5.15 Dünya haritası v3 (akıcılık ve okunaklılık)
- Kullanıcı haritayı "ucuz, akıcı değil" buldu, örnek olarak popüler bir mobil strateji oyununun harita videosunu gönderdi (yoğun şehirler, merkezde dev kale, her yerde yürüyen ordular).
- **Kamera** (`worldmap.js`): parmağın altındaki dünya noktası sabit kalır (yer düzlemine ışın), bırakınca atalet (sürtünme e^-4.2t), iki parmakla parmak ortasına zoom + kaydırma, tekerlek imlece zoom, mesafe 80–700, eğim 39°→66°, şehre dokununca `flyTo` ile süzülür.
- **Demir Taht**: haritanın ortası (`G.THRONE = {x:500,y:500,r:62}`), sur halkası, 6 kule, dönen rün halkası, kırmızı bölge; model townhall4 (yoksa en iyi mevcut kademe). Çevresine şehir kurulamaz/ışınlanılamaz; eski kayıtlar ve botlar tahtın dışına ücretsiz taşınır (`state.js`). Yeni oyuncular tahtın çevresindeki halkaya yerleşir.
- **Görünüm**: daha aydınlık serin yeşil zemin, ince toprak yollar (şehir→taht, şehir→en yakın komşu), şehirlerde renkli bölge dairesi (sarı ben, mavi gerçek, kırmızı bot), taş kaide, çevresinde küçük evler; uzaklaştıkça şehirler ~2 kat büyür (LOD), uzakta yalnız seviye rozeti görünür. Yeni etiket stili (rozet + konturlu isim, `#wmLabels.far`). Kenarda vinyet.
- **Canlılık**: barbar kampları (çadır, bayrak, ateş), kaynak noktaları, haritada sürekli yürüyen dekor ordular (kırmızı/camgöbeği akan oklu şerit `ribbon()`), oyuncu seferleri altın oklu şerit.
- **Performans**: 420 rastgele meşale, kristaller, harabeler, gözetleme kuleleri ve bulutlar kaldırıldı; ağaç/kaya/çadır/sur instanced.
- Test: Playwright, dokunmatik CDP olaylarıyla kaydırma/atalet/pinch doğrulandı. Gerçek iPhone'da denenmedi.

## 6. Önemli tasarım kararları (neden böyle)

1. **Prosedürel modeller → KayKit → Higgsfield:**
   - Kullanıcı prosedürel modelleri "lego gibi" buldu, KayKit'e geçildi.
   - Ardından "binalar birbirine benziyor" dedi; Higgsfield ile her bina özel tasarlandı.
2. **Hareketli parçalar:** Yapay zekâ modelleri tek parça geldiği için dönen kanat, çark gibi parçalar **ayrı model olarak üretilip kodla döndürülüyor**. Ana model bu parçalar olmadan yeniden üretildi.
3. **Taşlı zemin ve çim:** Kullanıcı istemedi, kaldırıldı. `terrain.js` ve `grass.js` dosyaları duruyor ama çağrılmıyor.
4. **Arayüz:** Kullanıcı mevcut paneli süslemeyi değil, **yapıyı tamamen değiştirmeyi** istedi. Kendi gönderdiği örneklerdeki dil uygulandı, örnekler kopyalanmadı.
5. **Çevrimiçi oyun yok:** Diğer krallıklar bilgisayar yönetimli. Gerçek çok oyunculu için sunucu (ör. Firebase) gerekiyor; kullanıcının hesap açması lazım.
6. **Mağaza demo:** Gerçek ödeme için App Store / Google Play ödeme sistemi ya da bir ödeme sağlayıcı gerekiyor.
7. **Telefon performansı:**
   - KayKit asker parçaları birleştirildi (`optimize()`), modeller meshopt ile sıkıştırıldı.
   - Gerçek ışık sayısı sınırlı.
   - Kahraman GLB'leri yalnızca gerektiğinde yükleniyor.
8. **Lisanslar:**
   - KayKit CC0, lisans dosyaları `assets/kk/LICENSE.txt` ve `assets/chars/LICENSE.txt`.
   - Three.js MIT.
   - Higgsfield üretimleri kullanıcının kendi hesabından yapıldı.

---

## 7. Karşılaşılan hatalar ve çözümleri

| Sorun | Çözüm |
|---|---|
| GitHub Pages boş ya da eski sayfa gösterdi | Pages `main` dalını gösteriyordu. Kullanıcıya dalı değiştirmesi önerildi. "Aktar" derse `main` dalına aktarılacaktı, kullanıcı demedi |
| Arka plandaki iki yardımcı kesintide dosya yazamadan durdu | Binalar ve karakterler doğrudan yazıldı |
| `Assignment to constant variable` (yükleme çöktü) | `main.js` içinde `grass` değişken adı çakışması → `grassField` |
| Çimlerin bir kısmı siyah görünüyordu | Çift yüzlü ışıklandırma: `normal = normalize(vNormal)` enjekte edildi |
| Panel `position: relative` yüzünden üstte bar gibi göründü | `.sheet` için `position: relative` kaldırıldı |
| Karakter GLB'leri çok büyüktü (3.6 MB) | Kendi `repack.py` betiği: kullanılmayan animasyonlar, ölçek/konum kanalları ve accessor'lar temizlendi |
| Higgsfield görsel üretiminde 429 (rate limit) | Daha küçük gruplar halinde yeniden denendi |
| SAM 3D modeli bina görsellerinde başarısız oldu | Tripo H3.1 kullanıldı |
| Bir kahramanın (aybike) rigging'i ilk denemede başarısız oldu | Yeniden gönderildi, başarılı oldu |
| Higgsfield dosya sunucusu (cloudfront) ağda engelliydi | Kullanıcı onayıyla "araba-oyunu" adlı yeni bir bulut ortamı oluşturuldu; izin verilen host `d8j0ntlcm91z4.cloudfront.net` |
| Modeller yan dönük geliyordu | Yüklenirken `rotation.y = -π/2` |

---

## 8. Bilinen eksikler ve sınırlamalar

- Gerçek telefonda performans ölçülmedi. Testler yalnızca masaüstü Playwright/SwiftShader ile yapıldı. Sesler de dinlenerek doğrulanmadı.
- Gece–alacakaranlık döngüsünün alacakaranlık anı görsel olarak kontrol edilmedi.
- Kahramanlarda yalnızca Idle animasyonu var. Savaş, sevinç ya da yürüme animasyonu yok; Meshy rigging ile kahraman başına ~8 kredi.
- Sıradan askerler hâlâ KayKit (stilize, büyük kafalı). Kahramanlar Higgsfield olduğundan iki stil arasında fark var.
- Atlar prosedürel, görece basit.
- Belediye Binası Sv.5+ olunca yanına KayKit kuleleri ekleniyor; stil farkı var.
- Çok oyunculu yok, gerçek ödeme yok.
- Kullanılmayan kod duruyor: `terrain.js`, `grass.js`, `life.js` içindeki öküz arabası/tezgâh/fener, `buildings.js` içindeki prosedürel binalar, `units.js` içindeki prosedürel askerler.
- Demir Sancak'ta service worker yok (Orman Kaçışı'nda var).
- Pages'in yayınladığı dal kesin bilinmiyor (bkz. 0).

---

## 9. Higgsfield kullanımı (kredi ve yöntem)

- **Bakiye geçmişi:**
  - Başta 113 kredi vardı, ~111'i 12 bina için harcandı.
  - Kullanıcı yükleme yaptı: plus plan, 1000 kredi.
  - Son bilinen bakiye ~**566 kredi**.
- **Yaklaşık maliyetler:**

  | İş | Model | Kredi |
  |---|---|---|
  | Görsel | `gpt_image_2_6` | 0,25 |
  | Görselden 3D | `tripo_h3_1_image_to_3d` | 9 |
  | Rigging + 1 animasyon | `3d_rigging` | 8 |
  | Müzik (90 sn) | `elevenlabs_music_v2_5` | ~13 |
  | Efekt | `mirelo_text_to_audio` | 0,5 |
  | Meshy image-to-3D rig+anim | — | ~38–47 (pahalı, kullanılmadı) |

- **Görsel prompt kalıbı (bina):** "Stylized 3D game asset render ... premium mobile medieval fantasy strategy game ... chunky hand-crafted proportions, vibrant saturated colors, soft studio lighting, isometric three-quarter view from the front, entire building visible and centered on a small square base, plain pure white background, no text, no people."
- **Kahraman kalıbı:** "... full body, standing in a relaxed A-pose ..., facing directly toward the camera, front view ..., plain pure white background".
- **İş akışı:**
  1. Görsel üret (batch).
  2. Tripo ile 3D'ye çevir (face_limit 12k–18k, texture: true, pbr: false).
  3. (Karakter ise) `3d_rigging` uygula (model_url = Tripo sonucu, `enable_animation: true`, `animation_action_id: 0`).
  4. İndir ve sıkıştır (doku 1024/768 JPEG + meshopt).
  5. `assets/...` içine koy.
- **Sıkıştırma betikleri:** Scratchpad'deydi (`hfopt.mjs`, `hfget.sh`, `h3get.sh`, `icon.py` beyaz zemin kesme, `repack.py`). **Depoda değiller**, yeni oturumda yeniden yazılmaları gerekir.
- **Ortam:** Kişisel bulut ortamı "araba-oyunu", host izni `d8j0ntlcm91z4.cloudfront.net`.

---

## 10. Sıradaki olası adımlar (kullanıcıya önerilmiş ya da açık kalmış)

1. Kahramanlara ek animasyonlar (saldırı, sevinç, yürüme). Kahraman başına `3d_rigging` + farklı `animation_action_id` (~8 kredi). Klipleri aynı iskelette birleştirmek gerekir.
2. Sıradan askerleri de Higgsfield ile özel tasarlamak: 4 tür × 2 takım, rigging + yürüme/saldırı animasyonları.
3. Atı Higgsfield ile yeniden yapmak.
4. Gerçek çevrimiçi oyun: Firebase (Auth + Firestore) kurulumu. Kullanıcının hesap açması gerekir.
5. Gerçek ödeme entegrasyonu.
6. Kullanılmayan kodu temizlemek. Kullanıcı istemeden yapılmamalı.
7. Demir Sancak için service worker ve çevrimdışı önbellek.
8. Oyunu `main` dalına aktarmak. Kullanıcı "aktar" derse.
9. Gece ortamı ince ayarı (daha koyu ya da daha aydınlık), gerçek telefonda performans testi.

---

## 11. Yeni oturumda başlarken kontrol listesi

- Depoyu klonla, `claude/forest-parkour-mobile-game-9oxplw` dalına geç.
- `python3 -m http.server 8000` ile `/krallik/` aç.
- Higgsfield modellerini indirmek gerekirse `d8j0ntlcm91z4.cloudfront.net` hostunun izinli olduğu "araba-oyunu" ortamını kullan.
- Kod giriş noktaları:
  - `krallik/js/main.js → boot()`
  - Yükleme sırası: `ASSETS.loadAll` → arazi → doğa → surlar → arsalar (`buildPlots`) → devriyeler ve şehir hayatı (`buildPatrols`) → gece (`buildNight`) → sahneler (`initScenes`) → öğretici.
- Hata ayıklama için tarayıcıda `window.__ds` kullanılabilir: `{ G, cam, navigate, holders, openBuilding, grass }`.
