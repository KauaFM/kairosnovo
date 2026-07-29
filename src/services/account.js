// ============================================================
// ORVAX — Conta (logout, senha, exclusão, portal de assinatura)
// ============================================================
import { supabase } from '../lib/supabase';
import { assertPasswordSafe } from '../lib/passwordSafety';

/** Encerra a sessão (limpa tokens locais). */
export async function logout() {
  await supabase.auth.signOut();
}

/** Troca a senha do usuário logado (recusa senha já vazada). */
export async function changePassword(newPassword) {
  await assertPasswordSafe(newPassword);
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

// Portal de assinatura REMOVIDO do app: gerenciamento/cancelamento é
// feito fora (site/Stripe) — o app não abre billing (conformidade Play).

/** E-mail do usuário logado (exibição). */
export async function getAccountEmail() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || '';
}
