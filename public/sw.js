/* ============================================================
 * ORVAX — Service Worker
 *
 * Existe por dois motivos: sem ele o navegador não oferece
 * instalação, e sem ele o app não abre offline.
 *
 * A regra que mantém isso seguro e sempre atualizado:
 *
 *   · Navegação (abrir o app)  → REDE PRIMEIRO, cache só como
 *     rede de segurança. É o que garante que ninguém fica preso
 *     numa versão velha: o index.html vem fresco sempre que há
 *     internet, e ele já aponta para os bundles novos.
 *   · /assets/* do Vite        → CACHE PRIMEIRO. O nome tem hash
 *     do conteúdo, então o arquivo nunca muda — cachear é de graça.
 *   · Qualquer outra origem    → NÃO TOCAR. Supabase (auth, banco,
 *     Edge Functions) passa direto. Cachear resposta de API ou de
 *     sessão daria dado velho e vazamento entre contas.
 * ============================================================ */

const VERSION = 'orvax-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

// O mínimo para a tela abrir sem internet.
const PRECACHE = [
    '/',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(SHELL)
            // addAll é tudo-ou-nada: um 404 aborta a instalação inteira.
            // Cada item vai sozinho para o SW instalar mesmo se um falhar.
            .then((cache) => Promise.all(
                PRECACHE.map((url) => cache.add(url).catch(() => null))
            ))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((k) => k !== SHELL && k !== ASSETS)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Só guardamos resposta própria e completa: 'basic' exclui as opacas
// de outra origem, e !ok evita cachear 404 e erro de servidor.
const isCacheable = (res) => res && res.ok && res.type === 'basic';

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Outra origem = Supabase e afins. Passa direto, sem interceptar.
    if (url.origin !== self.location.origin) return;

    // Abrir o app / navegar: rede primeiro.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    if (isCacheable(res)) {
                        const copy = res.clone();
                        caches.open(SHELL).then((c) => c.put('/', copy));
                    }
                    return res;
                })
                // Offline: devolve a última casca que guardamos.
                .catch(() => caches.match('/', { ignoreSearch: true })
                    .then((hit) => hit || Response.error()))
        );
        return;
    }

    // Bundles com hash no nome: imutáveis, cache primeiro.
    if (url.pathname.startsWith('/assets/')) {
        event.respondWith(
            caches.match(request).then((hit) => hit || fetch(request).then((res) => {
                if (isCacheable(res)) {
                    const copy = res.clone();
                    caches.open(ASSETS).then((c) => c.put(request, copy));
                }
                return res;
            }))
        );
        return;
    }

    // Resto do próprio site (ícones, imagens): rede, com cache de reserva.
    event.respondWith(
        fetch(request)
            .then((res) => {
                if (isCacheable(res)) {
                    const copy = res.clone();
                    caches.open(ASSETS).then((c) => c.put(request, copy));
                }
                return res;
            })
            .catch(() => caches.match(request))
    );
});
