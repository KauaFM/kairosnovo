// ============================================================
// ORVAX — Convite de instalação (PWA)
//
// Por que isso mora FORA do React: o Chrome dispara
// 'beforeinstallprompt' durante o carregamento da página, e quase
// sempre ANTES do primeiro render. Um listener dentro de um
// useEffect chega atrasado e perde o evento — o botão de instalar
// simplesmente nunca aparece. Aqui o listener é registrado na
// avaliação do módulo (importado no topo do main.jsx) e o evento
// fica guardado esperando alguém pedir.
// ============================================================

let deferred = null;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(deferred));

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        // Sem o preventDefault o Chrome mostra o banner dele e o nosso
        // vira duplicata.
        e.preventDefault();
        deferred = e;
        emit();
    });

    window.addEventListener('appinstalled', () => {
        deferred = null;
        emit();
    });
}

/** O evento já chegou? (null = o navegador ainda não ofereceu) */
export function getPrompt() {
    return deferred;
}

/** Avisa quando o evento chega ou é consumido. Devolve o cancelador. */
export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Abre o diálogo nativo de instalação.
 * Só funciona dentro de um clique do usuário — o navegador exige.
 * @returns 'accepted' | 'dismissed' | 'unavailable'
 */
export async function showPrompt() {
    if (!deferred) return 'unavailable';
    const evt = deferred;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    // O evento é de uso único: depois de consumido não serve mais.
    deferred = null;
    emit();
    return outcome;
}

/** Já está instalado (abriu pelo ícone, sem barra de endereço)? */
export function isStandalone() {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

/**
 * iPhone/iPad. Importa porque o iOS NÃO suporta 'beforeinstallprompt':
 * lá o único caminho é o menu Compartilhar, na mão. Sem esse desvio o
 * usuário de iPhone nunca veria convite nenhum.
 */
export function isIOS() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return true;
    // iPadOS 13+ se apresenta como Mac; o toque é o que denuncia.
    return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

/**
 * Chrome/Edge no computador.
 *
 * Serve para o plano B: no desktop o 'beforeinstallprompt' às vezes não
 * dispara (ou demora demais), e a pessoa fica sem saber que dá para
 * instalar — o ícone na barra de endereço passa despercebido. Nesses
 * navegadores mostramos o caminho manual em vez de não mostrar nada.
 */
export function isDesktopChromium() {
    if (typeof navigator === 'undefined') return false;
    const uaData = navigator.userAgentData;
    const mobile = uaData
        ? uaData.mobile
        : /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (mobile) return false;
    const brands = uaData?.brands?.map((b) => b.brand).join(' ') || '';
    if (/Chromium|Google Chrome|Microsoft Edge/i.test(brands)) return true;
    return Boolean(window.chrome) && /Chrome|Edg/i.test(navigator.userAgent);
}

/** Rodando dentro do APK (Capacitor)? Lá já é um app instalado. */
export function isNativeApp() {
    if (typeof window === 'undefined') return false;
    return Boolean(window.Capacitor?.isNativePlatform?.());
}
