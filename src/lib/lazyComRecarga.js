// =============================================================
// ORVAX — lazy() que sobrevive a um deploy novo
//
// As abas pesadas chegam por import dinâmico, e o nome do arquivo
// carrega um hash: Vault-ABC123.js. Quando sai uma versão nova, os
// pedaços antigos deixam de existir no servidor — mas quem estava
// com o app ABERTO (ou instalado, com a página já carregada) segue
// apontando para os nomes velhos. Aí a pessoa toca numa aba, o
// arquivo volta 404, o React lança, e o ErrorBoundary de topo pinta
// a tela inteira de "Erro Crítico ORVAX".
//
// É a falha mais provável logo depois de cada publicação, e o botão
// "Tentar Novamente" do boundary não resolve: ele só limpa o estado,
// e o pedaço continua não existindo.
//
// A saída é recarregar a página uma vez: aí vem o index.html novo,
// com os nomes de arquivo certos. O sessionStorage segura para isso
// acontecer UMA vez só — se falhar de novo depois de recarregar, o
// problema é outro e o erro precisa aparecer de verdade, não virar
// laço de recarga infinita.
// =============================================================
import { lazy } from 'react';

const CHAVE = 'orvax_recarga_por_chunk';

/** O erro é "o pedaço sumiu do servidor" (e não um bug de verdade)? */
export function ehErroDeChunk(erro) {
    const msg = String(erro?.message || erro || '');
    return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|dynamically imported module/i.test(msg);
}

/** Mesma assinatura de React.lazy, com recuperação automática. */
export function lazyComRecarga(importar) {
    return lazy(() =>
        importar()
            .then((mod) => {
                // Deu certo: zera a trava para que uma futura publicação
                // também possa se recuperar sozinha.
                try { sessionStorage.removeItem(CHAVE); } catch { /* modo privado */ }
                return mod;
            })
            .catch((erro) => {
                if (!ehErroDeChunk(erro)) throw erro; // bug real: deixa estourar

                let jaRecarregou = false;
                try { jaRecarregou = sessionStorage.getItem(CHAVE) === '1'; } catch { /* modo privado */ }
                if (jaRecarregou) throw erro; // já tentamos; não vira laço

                try { sessionStorage.setItem(CHAVE, '1'); } catch { /* modo privado */ }
                window.location.reload();
                // A página está indo embora: nunca resolve, para o React não
                // renderizar nada no meio do caminho.
                return new Promise(() => { });
            })
    );
}
