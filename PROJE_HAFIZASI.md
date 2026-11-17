# PROJE HAFIZASI — araba-oyunu deposu

> Bu dosya, yeni bir sohbete yüklendiğinde projeyi kaldığı yerden sürdürmek için hazırlandı.
> Son güncelleme: son commit `eb4c747` ("Demir Sancak: çoğunlukla gece, arada kısa alacakaranlık döngüsü").
> Bu dosyada yalnızca doğrulanmış bilgiler var. Bilinmeyenler **"Bilinmiyor / doğrulanmadı"** diye işaretlendi.

---

## 0. Hızlı özet

- **Depo:** `tumerserhat434-ux/araba-oyunu` (GitHub)
- **Çalışılan dal:** `claude/forest-parkour-mobile-game-9oxplw`. Tüm işler bu dalda, `main` dalına hiç aktarılmadı.
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
- **Karşılık tablosu (`COUNTER`):**
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

- **15 özgün kahraman** (id, ad):

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
  - Son bilinen bakiye ~**613 kredi**. Son iki adımda (gece atmosferi, döngü) kredi kullanılmadı.
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
