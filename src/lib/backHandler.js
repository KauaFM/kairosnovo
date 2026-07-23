// ============================================================
// ORVAX — Back button (Android)
// Pilha de handlers de "voltar". Cada overlay/modal empurra seu
// fechador enquanto está aberto; o botão físico/gesto do Android
// fecha o do topo em vez de minimizar o app.
// ============================================================
import { useEffect } from 'react';

const stack = [];

/** Registra um fechador; retorna a função pra desregistrar. */
export function pushBack(fn) {
  stack.push(fn);
  return () => {
    const i = stack.lastIndexOf(fn);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Fecha o overlay do topo. @returns true se havia algo pra fechar. */
export function popBack() {
  const fn = stack[stack.length - 1];
  if (fn) { try { fn(); } catch { /* ignora */ } return true; }
  return false;
}

export function hasBack() { return stack.length > 0; }

/**
 * Hook: enquanto `active` for true, o botão voltar fecha este overlay.
 * @param {boolean} active
 * @param {() => void} onBack
 */
export function useBackHandler(active, onBack) {
  useEffect(() => {
    if (!active) return;
    return pushBack(onBack);
  }, [active, onBack]);
}
