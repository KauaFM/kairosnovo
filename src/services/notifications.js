// =============================================================
// ORVAX — Sistema de Notificações
//
// Notifica TUDO que precisa ser lembrado, com escalonamento:
//   T-30 min → T-10 min → T-1 min → "começando agora"
//
// Fontes:
//   · tasks             (scheduled_date = hoje, time_start, != done)
//   · universal_events  (starts_at hoje: eventos, calls, lembretes,
//                        pagamentos — respeita remind_before_min)
//   · habits            (digest diário às 20h com os pendentes)
//
// Plataformas:
//   · Web    → Notification API (com o app/aba aberto)
//   · Android (Capacitor) → LocalNotifications: agendadas no SISTEMA,
//     chegam mesmo com o app fechado.
// =============================================================
import { supabase } from '../lib/supabase';
import { toLocalDateStr } from '../utils/dateUtils';
import { listHabitsWithTodayStatus } from './habits';

// Minutos ANTES do horário em que a pessoa é avisada (ordem crescente!)
const TIERS = [1, 10, 30];
// Hora do lembrete diário de hábitos pendentes
const HABIT_DIGEST_HOUR = 20;
// Intervalo de verificação (ms)
const POLL_MS = 30000;

const isNative = () =>
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

// ----- permissão ---------------------------------------------------
export async function requestNotificationPermission() {
    if (isNative()) {
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            const { display } = await LocalNotifications.requestPermissions();
            return display === 'granted';
        } catch (e) {
            console.warn('[notifications] plugin nativo indisponível:', e?.message);
        }
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
}

// ----- disparo imediato --------------------------------------------
async function fireNow(key, title, body) {
    if (isNative()) {
        try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            await LocalNotifications.schedule({
                notifications: [{
                    id: hashId(key),
                    title,
                    body,
                    schedule: { at: new Date(Date.now() + 500) },
                    smallIcon: 'ic_stat_icon',
                }],
            });
            return;
        } catch { /* cai pro web */ }
    }
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/orvax.svg', tag: key });
    }
}

// id numérico determinístico (32-bit) pra plugin nativo
function hashId(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) || 1;
}

// ----- dedup (1 aviso por item/tier/dia) ---------------------------
const notifiedKey = (id, tier) =>
    `orvax_notif_${id}_${toLocalDateStr(new Date())}_${tier}`;
const wasNotified = (id, tier) => !!localStorage.getItem(notifiedKey(id, tier));
const markNotified = (id, tier) => localStorage.setItem(notifiedKey(id, tier), '1');

// limpa chaves de dias anteriores (evita lixo eterno no localStorage)
function cleanOldKeys() {
    const today = toLocalDateStr(new Date());
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('orvax_notif_') || k.startsWith('notified_')) && !k.includes(today)) {
            localStorage.removeItem(k);
        }
    }
}

// ----- coleta dos itens do dia -------------------------------------
async function collectTimedItems(userId) {
    const today = toLocalDateStr(new Date());
    const items = [];

    // Tarefas de hoje com horário
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, time_start, state')
        .eq('user_id', userId)
        .eq('scheduled_date', today)
        .neq('state', 'done');
    for (const t of tasks || []) {
        if (!t.time_start) continue;
        const [h, m] = String(t.time_start).split(':').map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) continue;
        const at = new Date();
        at.setHours(h, m, 0, 0);
        items.push({ id: `task_${t.id}`, title: t.title, at, kind: 'Tarefa' });
    }

    // Agenda de hoje: eventos, reuniões/calls, lembretes, pagamentos
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();   dayEnd.setHours(23, 59, 59, 999);
    const { data: events } = await supabase
        .from('universal_events')
        .select('id, title, starts_at, event_type, status, remind_before_min')
        .eq('user_id', userId)
        .gte('starts_at', dayStart.toISOString())
        .lte('starts_at', dayEnd.toISOString())
        .eq('status', 'scheduled');
    const KIND_LABEL = {
        meeting: 'Reunião', appointment: 'Compromisso',
        reminder: 'Lembrete', payment: 'Pagamento', event: 'Evento',
    };
    for (const e of events || []) {
        const item = {
            id: `event_${e.id}`,
            title: e.title,
            at: new Date(e.starts_at),
            kind: KIND_LABEL[e.event_type] || 'Evento',
        };
        // Antecedência escolhida pelo usuário vira um tier extra
        if (e.remind_before_min && !TIERS.includes(e.remind_before_min)) {
            item.extraTier = e.remind_before_min;
        }
        items.push(item);
    }

    return items;
}

// ----- lógica de escalonamento -------------------------------------
// Dispara o MENOR tier aplicável ainda não avisado e consome os
// maiores (se a pessoa abrir o app faltando 5 min, recebe 1 aviso
// "em 5 min", não três atrasados de uma vez).
async function processItem(item) {
    const diffMin = Math.floor((item.at - new Date()) / 60000);
    if (diffMin < -2) return; // já passou

    const tiers = item.extraTier
        ? [...TIERS, item.extraTier].sort((a, b) => a - b)
        : TIERS;

    // "começando agora"
    if (diffMin <= 0) {
        if (!wasNotified(item.id, 0)) {
            await fireNow(`${item.id}_0`, 'ORVAX', `AGORA — ${item.kind}: ${item.title}`);
            markNotified(item.id, 0);
            tiers.forEach((t) => markNotified(item.id, t));
        }
        return;
    }

    for (const tier of tiers) {
        if (diffMin <= tier) {
            if (!wasNotified(item.id, tier)) {
                await fireNow(
                    `${item.id}_${tier}`,
                    'ORVAX',
                    `Em ${diffMin} min — ${item.kind}: ${item.title}`
                );
                markNotified(item.id, tier);
                // consome tiers maiores pra não empilhar avisos atrasados
                tiers.filter((t) => t > tier).forEach((t) => markNotified(item.id, t));
            }
            return;
        }
    }
}

// ----- digest de hábitos pendentes (20h) ---------------------------
async function processHabitDigest() {
    const now = new Date();
    if (now.getHours() < HABIT_DIGEST_HOUR) return;
    if (wasNotified('habit_digest', 0)) return;

    const habits = await listHabitsWithTodayStatus();
    const pending = (habits || []).filter((h) => !h.done_today);
    if (pending.length === 0) {
        markNotified('habit_digest', 0);
        return;
    }
    const names = pending.slice(0, 3).map((h) => h.title).join(' · ');
    const extra = pending.length > 3 ? ` +${pending.length - 3}` : '';
    await fireNow(
        'habit_digest',
        'ORVAX — Hábitos pendentes',
        `Ainda dá tempo hoje: ${names}${extra}`
    );
    markNotified('habit_digest', 0);
}

// ----- agendamento NATIVO (Android: chega com app fechado) ---------
async function scheduleNativeAhead(items) {
    if (!isNative()) return;
    try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // cancela agendamentos anteriores nossos e re-agenda tudo
        const pending = await LocalNotifications.getPending();
        if (pending.notifications?.length) {
            await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
        }

        const now = Date.now();
        const toSchedule = [];
        for (const item of items) {
            const tiers = item.extraTier ? [...TIERS, item.extraTier] : TIERS;
            for (const tier of tiers) {
                const fireAt = item.at.getTime() - tier * 60000;
                if (fireAt <= now || wasNotified(item.id, tier)) continue;
                toSchedule.push({
                    id: hashId(`${item.id}_${tier}`),
                    title: 'ORVAX',
                    body: `Em ${tier} min — ${item.kind}: ${item.title}`,
                    schedule: { at: new Date(fireAt) },
                    smallIcon: 'ic_stat_icon',
                });
            }
            // "agora"
            if (item.at.getTime() > now && !wasNotified(item.id, 0)) {
                toSchedule.push({
                    id: hashId(`${item.id}_0`),
                    title: 'ORVAX',
                    body: `AGORA — ${item.kind}: ${item.title}`,
                    schedule: { at: item.at },
                    smallIcon: 'ic_stat_icon',
                });
            }
        }
        if (toSchedule.length) {
            await LocalNotifications.schedule({ notifications: toSchedule });
        }
    } catch (e) {
        console.warn('[notifications] agendamento nativo falhou:', e?.message);
    }
}

// ----- loop principal ----------------------------------------------
let _interval = null;
let _running = false;

// Pede permissão EM CONTEXTO: só na 1ª vez que existe um lembrete real
// pra disparar (antes pedíamos no cold launch, sem contexto — negação
// altíssima e permissão perdida pra sempre no Android 13+). audit P9.
let _permAskedThisSession = false;
async function ensurePermissionInContext() {
    if (_permAskedThisSession) return;
    _permAskedThisSession = true;
    try { await requestNotificationPermission(); } catch { /* silencioso */ }
}

async function tick() {
    if (_running) return;
    _running = true;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const items = await collectTimedItems(session.user.id);
        const now = new Date();
        const hasSomethingToNotify =
            items.some((i) => (i.at - now) / 60000 <= Math.max(...TIERS)) ||
            now.getHours() >= HABIT_DIGEST_HOUR;
        // só incomoda com o prompt quando há de fato algo pra avisar
        if (hasSomethingToNotify) await ensurePermissionInContext();

        for (const item of items) await processItem(item);
        await processHabitDigest();
        await scheduleNativeAhead(items);
    } catch (e) {
        console.error('[notifications]', e);
    } finally {
        _running = false;
    }
}

/** Inicia o sistema (idempotente). Chamar após o login.
 *  NÃO pede permissão aqui — isso acontece em contexto no tick. */
export async function startNotifications() {
    if (_interval) return;
    cleanOldKeys();
    await tick();
    _interval = setInterval(tick, POLL_MS);
}

/** Para o sistema (logout/unmount). */
export function stopNotifications() {
    if (_interval) clearInterval(_interval);
    _interval = null;
}

/** Força re-verificação imediata (ex.: após criar tarefa/evento). */
export function refreshNotifications() {
    tick();
}
