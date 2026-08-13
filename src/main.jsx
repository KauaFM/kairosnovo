import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { LanguageProvider } from './i18n/LanguageContext'
// Antes de tudo: o evento de instalação do Chrome chega durante o
// carregamento e é perdido se ninguém estiver ouvindo (ver o arquivo).
import './lib/installPrompt'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <LanguageProvider>
            <App />
        </LanguageProvider>
    </React.StrictMode>,
)

// Service worker: é o que faz o navegador oferecer a instalação e o que
// deixa o app abrir offline. Fica FORA do React de propósito — não deve
// atrasar a primeira renderização nem derrubar o app se falhar.
//
// Não roda no APK (o Capacitor já é um app instalado, com os arquivos
// locais) nem em dev (SW cacheando bundle no meio do HMR é fonte de
// bug fantasma: você edita, salva, e a tela não muda).
if (
    'serviceWorker' in navigator &&
    import.meta.env.PROD &&
    !window.Capacitor?.isNativePlatform?.()
) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[ORVAX] service worker não registrado:', err);
        });
    });
}
