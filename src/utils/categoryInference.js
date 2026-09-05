// =============================================================
// ORVAX — Inferência de categoria financeira
//
// Tirar trabalho manual de quem lança gasto: a pessoa digita
// "ifood" e o app já sabe que é Alimentação, sem ela tocar no
// seletor. Dois sinais, nessa ordem:
//
//   1. O HISTÓRICO DELA. Se ela já classificou "Padaria do Zé"
//      como Alimentação uma vez, da segunda em diante o app
//      acerta sozinho. É aqui que ele parece aprender — porque
//      aprende mesmo, com os dados da própria pessoa.
//   2. Um dicionário de termos comuns no Brasil, para funcionar
//      já no primeiro uso, quando ainda não há histórico.
//
// Sem chamada de IA: é dedução determinística, custo zero e
// resposta instantânea enquanto a pessoa digita.
// =============================================================

/** As 7 categorias reais do app (mesmas chaves de CATEGORIES_ICONS). */
export const CATEGORIAS = ['Moradia', 'Alimentação', 'Assinaturas', 'Transporte', 'Lazer', 'Receita', 'Outros'];

/** minúsculas, sem acento, sem pontuação — para comparar texto digitado. */
export function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // tira os acentos separados pelo NFD
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Termos escritos já normalizados (sem acento). A ordem importa:
// o primeiro que casar vence, então os mais específicos vêm antes.
const DICIONARIO = [
    ['Receita', [
        'salario', 'freela', 'freelance', 'recebi', 'pix recebido', 'venda', 'vendi',
        'comissao', 'bonus', 'decimo terceiro', '13o', 'rendimento', 'dividendo',
        'reembolso', 'restituicao', 'pagamento cliente', 'cliente pagou', 'renda',
    ]],
    ['Assinaturas', [
        'netflix', 'spotify', 'prime video', 'amazon prime', 'disney', 'hbo', 'globoplay',
        'youtube premium', 'icloud', 'google one', 'chatgpt', 'openai', 'adobe', 'canva',
        'dropbox', 'notion', 'play store', 'app store', 'xbox', 'playstation', 'deezer',
        'assinatura', 'mensalidade', 'academia', 'smart fit', 'gympass', 'crossfit', 'plano de saude',
    ]],
    ['Transporte', [
        'uber', '99 pop', '99pop', 'taxi', 'onibus', 'metro', 'brt', 'bilhete unico',
        'gasolina', 'combustivel', 'posto', 'etanol', 'alcool', 'diesel', 'ipva',
        'estacionamento', 'pedagio', 'passagem', 'cabify', 'mecanico', 'oficina',
        'pneu', 'licenciamento', 'seguro do carro', 'lavagem', 'moto',
    ]],
    ['Alimentação', [
        'mercado', 'supermercado', 'ifood', 'rappi', 'restaurante', 'lanche', 'lanchonete',
        'padaria', 'acougue', 'feira', 'almoco', 'janta', 'jantar', 'cafe', 'pizza',
        'hamburguer', 'burger', 'mcdonald', 'subway', 'bk', 'hortifruti', 'atacadao',
        'carrefour', 'assai', 'pao de acucar', 'sacolao', 'marmita', 'salgado', 'sorvete',
        'doceria', 'comida', 'delivery', 'bar', 'cerveja', 'bebida', 'churrasco',
    ]],
    ['Moradia', [
        'aluguel', 'condominio', 'conta de luz', 'luz', 'energia', 'enel', 'cemig', 'light',
        'agua', 'sabesp', 'esgoto', 'gas', 'comgas', 'internet', 'fibra', 'wifi', 'iptu',
        'faxina', 'diarista', 'movel', 'moveis', 'reforma', 'obra', 'pedreiro', 'material de construcao',
        'aparelho', 'eletrodomestico', 'vivo', 'claro', 'tim', 'oi', 'celular conta',
    ]],
    ['Lazer', [
        'cinema', 'show', 'viagem', 'hotel', 'airbnb', 'ingresso', 'festa', 'balada',
        'jogo', 'game', 'steam', 'parque', 'passeio', 'presente', 'livro', 'praia',
        'bilhete aereo', 'passagem aerea', 'turismo', 'streaming',
    ]],
];

/**
 * Chuta a categoria a partir só do texto (usado quando não há
 * histórico que ajude). Devolve null quando não tem convicção —
 * errar calado é pior que não sugerir.
 */
export function inferirPorTexto(descricao) {
    const texto = normalizar(descricao);
    if (texto.length < 2) return null;
    for (const [categoria, termos] of DICIONARIO) {
        for (const termo of termos) {
            // limite de palavra: "gas" não pode casar dentro de "gasolina"
            const re = new RegExp(`(^|\\s)${termo.replace(/\s+/g, '\\s+')}(\\s|$)`);
            if (re.test(texto)) return categoria;
        }
    }
    return null;
}

/**
 * Procura no histórico da própria pessoa uma transação parecida e
 * devolve a categoria que ELA usou. Vence o dicionário: a pessoa
 * pode chamar de "mercado" o que para ela é outra coisa, e a
 * escolha dela manda.
 *
 * @param {string} descricao
 * @param {Array<{description?:string,name?:string,category?:string}>} historico
 */
export function inferirPorHistorico(descricao, historico) {
    const alvo = normalizar(descricao);
    if (alvo.length < 3 || !Array.isArray(historico) || !historico.length) return null;

    const votos = new Map(); // categoria → quantas vezes ela usou
    for (const tx of historico) {
        const cat = tx?.category;
        if (!cat || !CATEGORIAS.includes(cat)) continue; // ignora lixo tipo 'LAZER'
        const anterior = normalizar(tx.description || tx.name);
        if (anterior.length < 3) continue;
        // uma contém a outra: "padaria" casa com "padaria do ze"
        if (anterior === alvo || anterior.includes(alvo) || alvo.includes(anterior)) {
            votos.set(cat, (votos.get(cat) || 0) + 1);
        }
    }
    if (!votos.size) return null;
    // a categoria que ela mais usou para essa descrição
    return [...votos.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * O palpite final. Histórico primeiro, dicionário depois.
 * @returns {string|null} categoria, ou null quando não sabe.
 */
export function inferirCategoria(descricao, historico = []) {
    return inferirPorHistorico(descricao, historico) || inferirPorTexto(descricao);
}

/**
 * Valor mais provável para uma despesa que se repete (Netflix,
 * aluguel, academia). Só responde quando a pessoa já lançou isso
 * pelo menos duas vezes com o MESMO valor — senão seria chute.
 */
export function inferirValor(descricao, historico = []) {
    const alvo = normalizar(descricao);
    if (alvo.length < 3 || !Array.isArray(historico)) return null;

    const votos = new Map();
    for (const tx of historico) {
        const anterior = normalizar(tx?.description || tx?.name);
        if (anterior.length < 3) continue;
        if (anterior === alvo || anterior.includes(alvo) || alvo.includes(anterior)) {
            const v = Number(tx?.amount);
            if (Number.isFinite(v) && v > 0) votos.set(v, (votos.get(v) || 0) + 1);
        }
    }
    if (!votos.size) return null;
    const [valor, vezes] = [...votos.entries()].sort((a, b) => b[1] - a[1])[0];
    return vezes >= 2 ? valor : null;
}
