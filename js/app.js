/* ============================================
   APP.JS — Lógica principal da app
   ============================================ */

// Endereço do ficheiro de receitas no GitHub
// ATENÇÃO: substitui 'valteramlopes' pelo teu username e 'receitas' pelo nome do teu repositório
const GITHUB_USER = 'valteramlopes';
const GITHUB_REPO = 'receitas';
const GITHUB_FILE = 'data/receitas.json';

// URL para ler o ficheiro de receitas via API do GitHub
const URL_RECEITAS = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

// Variável que guarda todas as receitas em memória
let todasAsReceitas = [];

/* ============================================
   INICIALIZAÇÃO
   ============================================ */

// Quando a página carrega, vai buscar as receitas
document.addEventListener('DOMContentLoaded', function() {
    carregarReceitas();

    // Liga a pesquisa ao campo de texto
    document.getElementById('pesquisa').addEventListener('input', function() {
        filtrarReceitas(this.value);
    });
});

/* ============================================
   CARREGAR RECEITAS DO GITHUB
   ============================================ */

async function carregarReceitas() {
    const grid = document.getElementById('receitas-grid');
    grid.innerHTML = '<p style="color:#888; padding:20px;">A carregar receitas...</p>';

    try {
        const resposta = await fetch(URL_RECEITAS);

        // Se o ficheiro ainda não existe, mostra mensagem de boas-vindas
        if (resposta.status === 404) {
            todasAsReceitas = [];
            mostrarReceitas([]);
            return;
        }

        const dados = await resposta.json();

        // O conteúdo vem em Base64 — temos de o converter para texto
        const texto = atob(dados.content.replace(/\n/g, ''));
        todasAsReceitas = JSON.parse(texto);

        mostrarReceitas(todasAsReceitas);

    } catch (erro) {
        grid.innerHTML = '<p style="color:#c0392b; padding:20px;">Erro ao carregar receitas. Verifica a tua ligação.</p>';
        console.error('Erro ao carregar receitas:', erro);
    }
}

/* ============================================
   MOSTRAR RECEITAS NO ECRÃ
   ============================================ */

function mostrarReceitas(receitas) {
    const grid = document.getElementById('receitas-grid');

    if (receitas.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center; padding:40px; color:#888; grid-column: 1/-1;">
                <div style="font-size:48px; margin-bottom:16px;">🍽️</div>
                <p style="font-size:18px; margin-bottom:8px;">Ainda não tens receitas</p>
                <p style="font-size:14px;">Carrega no + para adicionar a primeira</p>
            </div>
        `;
        return;
    }

    // Ordena por data de criação (mais recentes primeiro)
    const ordenadas = [...receitas].sort((a, b) => 
        new Date(b.dataCriacao) - new Date(a.dataCriacao)
    );

    grid.innerHTML = ordenadas.map(receita => criarCartao(receita)).join('');
}

/* ============================================
   CRIAR CARTÃO HTML DE UMA RECEITA
   ============================================ */

function criarCartao(receita) {
    // Imagem ou emoji por defeito
    const imagemHtml = receita.imagem
        ? `<img class="cartao-imagem" src="${receita.imagem}" alt="${receita.titulo}" onerror="this.outerHTML='<div class=\\'cartao-imagem\\'>🍽️</div>'">`
        : `<div class="cartao-imagem">🍽️</div>`;

    // Ícone de favorito
    const favoritoHtml = receita.favorito ? '❤️' : '🤍';

    // Categoria (se existir)
    const categoriaHtml = receita.categoria
        ? `<span class="cartao-categoria">${receita.categoria}</span>`
        : '';

    return `
        <div class="cartao" onclick="abrirReceita('${receita.id}')">
            ${imagemHtml}
            <div class="cartao-corpo">
                <span class="cartao-favorito">${favoritoHtml}</span>
                <div class="cartao-titulo">${receita.titulo}</div>
                ${categoriaHtml}
            </div>
        </div>
    `;
}

/* ============================================
   FILTRAR RECEITAS POR TEXTO
   ============================================ */

function filtrarReceitas(texto) {
    if (!texto.trim()) {
        mostrarReceitas(todasAsReceitas);
        return;
    }

    const termoPesquisa = texto.toLowerCase();
    const filtradas = todasAsReceitas.filter(receita => 
        receita.titulo.toLowerCase().includes(termoPesquisa) ||
        (receita.ingredientes && receita.ingredientes.toLowerCase().includes(termoPesquisa)) ||
        (receita.categoria && receita.categoria.toLowerCase().includes(termoPesquisa))
    );

    mostrarReceitas(filtradas);
}

/* ============================================
   ABRIR PÁGINA DE DETALHE DE UMA RECEITA
   ============================================ */

function abrirReceita(id) {
    window.location.href = `receita.html?id=${id}`;
}
