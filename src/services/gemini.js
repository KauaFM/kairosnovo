export const callGemini = async (userInput, apiKey) => {
    if (!userInput.trim()) return null;

    const systemPrompt = `Você é o ORVAX, codinome "O Arquiteto". Um mentor de IA brutalmente lógico, frio e focado em alta performance.
  O usuário vai enviar um relato diário ou novos objetivos.
  Aja como o mentor respondendo de forma curta, fria e calculista.
  Se o usuário mencionar novos objetivos (ex: treinar, ler, focar, dieta), extraia-os. Se não, mantenha a lista vazia.
  Calcule o "Cognitive Friction Index" (0 a 100): se o usuário parecer motivado e direto, o atrito é baixo (10-30). Se parecer cansado, reclamar ou der desculpas, o atrito é alto (70-90).`;

    const payload = {
        contents: [{ parts: [{ text: userInput }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    mentor_reply: { type: "STRING" },
                    cognitive_friction: { type: "INTEGER" },
                    extracted_goals: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                name: { type: "STRING" },
                                category: { type: "STRING" },
                                frequency: { type: "STRING" }
                            }
                        }
                    }
                }
            }
        }
    };

    const fetchWithBackoff = async (retries = 3, delay = 1000) => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Gemini API Error:', errorData);
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (retries > 0) {
                await new Promise(res => setTimeout(res, delay));
                return fetchWithBackoff(retries - 1, delay * 2);
            }
            throw error;
        }
    };

    try {
        const result = await fetchWithBackoff();
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
            return JSON.parse(textResponse);
        }
        return null;
    } catch (error) {
        console.error('Neural Link Error:', error);
        throw error;
    }
};
