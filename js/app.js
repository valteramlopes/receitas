/* ============================================
   APP.JS — Lógica principal da app
   ============================================ */

const GITHUB_FILE = 'data/receitas.json';

// Obtém configuração do GitHub guardada no browser
function obterConfigGitHub() {
    let user = localStorage.getItem('github_user');
    let repo = localStorage.getItem('github_repo');

    if (!user) {
        user = prompt('Introduz o teu username do GitHub:');
        if (!user) return null;
        localStorage.setItem('github_user', user.trim());
    }

    if (!repo) {
        repo = prompt('Introduz o nome do repositório (ex: receitas):');
        if (!repo) return null;
        localStorage.setItem('github_repo', repo.trim());
    }

    return { user, repo };
}

const config = obterConfigGitHub();
const URL_RECEITAS = config
    ? `https://api.github.com/repos/${config.user}/${config.repo}/contents/${GITHUB_FILE}`
    : null;

// Variável que guarda todas as receitas em memória
let todasAsReceitas = [];

// Filtro activo no momento
let filtroActivo = 'todos';
let termoPesquisa = '';

/* ============================================
   INICIALIZAÇÃO
   ============================================ */

// Quando a página carrega, vai buscar as receitas
document.addEventListener('DOMContentLoaded', function() {
    carregarReceitas();

    // Liga a pesquisa ao campo de texto
    document.getElementById('pesquisa').addEventListener('input', function() {
        termoPesquisa = this.value;
        aplicarFiltros();
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
        const bytes = Uint8Array.from(atob(dados.content.replace(/\n/g, '')), c => c.charCodeAt(0));
        const texto = new TextDecoder('utf-8').decode(bytes);
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

   // Actualiza os filtros de categorias com base em todas as receitas
    criarFiltrosCategorias(todasAsReceitas);

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

function filtrarPor(filtro, elemento) {
    filtroActivo = filtro;

    // Remove active de todos
    document.querySelectorAll('.filtro, .categoria-filtro').forEach(btn => btn.classList.remove('active'));

    // Adiciona active ao elemento clicado
    if (elemento) {
        elemento.classList.add('active');
    } else if (filtro === 'todos') {
        document.querySelector('.filtro').classList.add('active');
    }

    aplicarFiltros();
}

function aplicarFiltros() {
    let resultado = [...todasAsReceitas];

    // Filtro por favoritos ou categoria
    if (filtroActivo === 'favoritos') {
        resultado = resultado.filter(r => r.favorito);
    } else if (filtroActivo !== 'todos') {
        resultado = resultado.filter(r => r.categoria === filtroActivo);
    }

    // Filtro por texto de pesquisa
    if (termoPesquisa.trim()) {
        const termo = termoPesquisa.toLowerCase();
        resultado = resultado.filter(r =>
            r.titulo.toLowerCase().includes(termo) ||
            (r.ingredientes && r.ingredientes.toLowerCase().includes(termo)) ||
            (r.categoria && r.categoria.toLowerCase().includes(termo))
        );
    }

    mostrarReceitas(resultado);
}

function criarFiltrosCategorias(receitas) {
    const categorias = [...new Set(receitas
        .map(r => r.categoria)
        .filter(c => c)
    )].sort();

    const container = document.getElementById('filtros-categorias');
    container.innerHTML = categorias
        .map(c => `<button class="filtro categoria-filtro" onclick="filtrarPor('${c}', event.target)">${c}</button>`)
        .join('');
}

/* ============================================
   ABRIR PÁGINA DE DETALHE DE UMA RECEITA
   ============================================ */

function abrirReceita(id) {
    window.location.href = `receita.html?id=${id}`;
}
