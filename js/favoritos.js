/* ============================================
   FAVORITOS.JS — Lógica da página de favoritos
   ============================================ */

const GITHUB_FILE = 'data/receitas.json';

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
const URL_API = config
    ? `https://api.github.com/repos/${config.user}/${config.repo}/contents/${GITHUB_FILE}`
    : null;

/* ============================================
   INICIALIZAÇÃO
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    carregarFavoritos();
});

/* ============================================
   CARREGAR FAVORITOS
   ============================================ */

async function carregarFavoritos() {
    const grid = document.getElementById('favoritos-grid');

    try {
        const resposta = await fetch(URL_API);

        if (resposta.status === 404) {
            mostrarVazio(grid);
            return;
        }

        const dados = await resposta.json();
        const bytes = Uint8Array.from(atob(dados.content.replace(/\n/g, '')), c => c.charCodeAt(0));
        const texto = new TextDecoder('utf-8').decode(bytes);
        const receitas = JSON.parse(texto);

        const favoritas = receitas.filter(r => r.favorito);
        mostrarFavoritos(favoritas);

    } catch (erro) {
        grid.innerHTML = '<p style="color:#c0392b; padding:20px;">Erro ao carregar favoritos.</p>';
        console.error('Erro ao carregar favoritos:', erro);
    }
}

/* ============================================
   MOSTRAR FAVORITOS
   ============================================ */

function mostrarFavoritos(receitas) {
    const grid = document.getElementById('favoritos-grid');

    if (receitas.length === 0) {
        mostrarVazio(grid);
        return;
    }

    grid.innerHTML = receitas.map(receita => {
        const imagemHtml = receita.imagem
            ? `<img class="cartao-imagem" src="${receita.imagem}" alt="${receita.titulo}" onerror="this.outerHTML='<div class=\\'cartao-imagem\\'>🍽️</div>'">`
            : `<div class="cartao-imagem">🍽️</div>`;

        const categoriaHtml = receita.categoria
            ? `<span class="cartao-categoria">${receita.categoria}</span>`
            : '';

        return `
            <div class="cartao" onclick="window.location.href='receita.html?id=${receita.id}'">
                ${imagemHtml}
                <div class="cartao-corpo">
                    <span class="cartao-favorito">❤️</span>
                    <div class="cartao-titulo">${receita.titulo}</div>
                    ${categoriaHtml}
                </div>
            </div>
        `;
    }).join('');
}

/* ============================================
   MOSTRAR MENSAGEM DE VAZIO
   ============================================ */

function mostrarVazio(grid) {
    grid.innerHTML = `
        <div style="text-align:center; padding:40px; color:#888; grid-column: 1/-1;">
            <div style="font-size:48px; margin-bottom:16px;">🤍</div>
            <p style="font-size:18px; margin-bottom:8px;">Ainda não tens favoritos</p>
            <p style="font-size:14px;">Abre uma receita e carrega no coração para a adicionar</p>
        </div>
    `;
}
