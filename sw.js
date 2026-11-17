// Basit çevrimdışı önbellek: önce ağ, olmazsa önbellek
const CACHE = 'orman-kacisi-v1';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'manifest.json', 'icon.svg', 'lib/three.module.min.js',
  'lib/jsm/postprocessing/EffectComposer.js', 'lib/jsm/postprocessing/RenderPass.js', 'lib/jsm/postprocessing/ShaderPass.js',
  'lib/jsm/postprocessing/MaskPass.js', 'lib/jsm/postprocessing/Pass.js', 'lib/jsm/postprocessing/UnrealBloomPass.js',
  'lib/jsm/postprocessing/OutputPass.js', 'lib/jsm/shaders/CopyShader.js', 'lib/jsm/shaders/LuminosityHighPassShader.js',
  'lib/jsm/shaders/OutputShader.js', 'lib/jsm/utils/BufferGeometryUtils.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {}); return r; }).catch(() => caches.match(e.request)));
});
