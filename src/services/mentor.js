// ============================================================
// ORVAX — Mentor service
// Ponte entre o app (MentorModal) e a MESMA persona usada pelo
// WhatsApp agent (tabela mentor_personas). Troca de mentor no
// app propaga para o WhatsApp automaticamente.
// ============================================================

import { supabase } from '../lib/supabase';
import { LOCAL_MENTOR_PERSONAS } from '../data/mentorPersonas';

// Cache em memória por sessão pra evitar fetch em toda interação.
const personaCache = new Map();

export const getMentorPersona = async (mentorId = 'atlas') => {
    if (personaCache.has(mentorId)) return personaCache.get(mentorId);

    const { data, error } = await supabase
        .from('mentor_personas')
        .select('*')
        .eq('id', mentorId)
        .maybeSingle();

    if (!error && data) {
        personaCache.set(mentorId, data);
        return data;
    }

    // Fallback local — mentores novos ainda sem linha no banco (migration
    // não aplicada). Mantém a personalidade funcionando no cliente.
    const local = LOCAL_MENTOR_PERSONAS[mentorId];
    if (local) {
        personaCache.set(mentorId, local);
        return local;
    }

    console.warn('[mentor] persona não encontrada, usando fallback genérico:', mentorId);
    return null;
};

// Fallback mínimo quando a tabela ainda não foi migrada.
const FALLBACK_PROMPT = `Você é ORVAX, mentor interior do usuário. Tom direto, sem rodeios.
Responda SEMPRE em JSON: {"mentor_reply":"...", "cognitive_friction":0-100, "extracted_goals":[]}`;

const buildJsonContract = (personaPrompt) => `${personaPrompt}

FORMATO DE SAÍDA:
Responda SEMPRE com JSON válido no formato exato:
{
  "mentor_reply": "string curta em pt-BR, 2-3 parágrafos no máximo, no seu tom e seguindo suas crenças",
  "cognitive_friction": <0-100, alto se usuário desmotivado/reclamão, baixo se direto e engajado>,
  "extracted_goals": [{ "name": "string", "category": "string", "frequency": "diária|semanal|única" }]
}`;

export const callMentor = async (userInput, { mentorId = 'atlas', apiKey } = {}) => {
    if (!userInput?.trim()) return null;
    if (!apiKey) throw new Error('API key ausente. Configure VITE_OPENAI_API_KEY no .env');

    const persona = await getMentorPersona(mentorId);
    const systemPrompt = buildJsonContract(persona?.system_prompt || FALLBACK_PROMPT);

    const payload = {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userInput },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 600,
    };

    const fetchWithBackoff = async (retries = 3, delay = 800) => {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('OpenAI API Error:', response.status, errText);
                if ((response.status === 429 || response.status >= 500) && retries > 0) {
                    await new Promise(r => setTimeout(r, delay));
                    return fetchWithBackoff(retries - 1, delay * 2);
                }
                throw new Error(`OpenAI ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, delay));
                return fetchWithBackoff(retries - 1, delay * 2);
            }
            throw err;
        }
    };

    const result = await fetchWithBackoff();
    const content = result?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
        mentor_reply:       parsed.mentor_reply       || '',
        cognitive_friction: Number.isFinite(parsed.cognitive_friction) ? parsed.cognitive_friction : 50,
        extracted_goals:    Array.isArray(parsed.extracted_goals) ? parsed.extracted_goals : [],
        persona_id:         mentorId,
        persona_name:       persona?.name || null,
    };
};

// Invalida o cache quando o usuário troca de mentor no app.
export const clearMentorCache = () => personaCache.clear();
