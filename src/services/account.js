// ============================================================
// ORVAX — Conta (logout, senha, exclusão, portal de assinatura)
// ============================================================
import { supabase } from '../lib/supabase';

/** Encerra a sessão (limpa tokens locais). */
export async function logout() {
  await supabase.auth.signOut();
}

/** Troca a senha do usuário logado. */
export async function changePassword(newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('A senha precisa de ao menos 8 caracteres.');
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Exclui a conta permanentemente (dados + arquivos + login).
 * Irreversível. Depois desloga.
 */
export async function deleteAccount() {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: 'DELETE' },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  await supabase.auth.signOut();
  return true;
}

/** Abre o portal de gerenciamento de assinatura (Stripe — web). */
export async function openBillingPortal() {
  const { data, error } = await supabase.functions.invoke('create-portal', {
    body: { origin: window.location.origin },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (data?.url) { window.location.href = data.url; return true; }
  throw new Error('Portal indisponível.');
}

/** E-mail do usuário logado (exibição). */
export async function getAccountEmail() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || '';
}
