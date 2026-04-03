/* ============================================
   RECEITA.JS — Lógica da página de detalhe
   ============================================ */

// Configuração do GitHub
const GITHUB_USER = 'valteramlopes';
const GITHUB_REPO = 'receitas';
const GITHUB_FILE = 'data/receitas.json';
const URL_API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

// Receita actual e lista completa
let receitaActual = null;
let todasAsReceitas = [];
let shaActual = null;

/* ============================================
   INICIALIZAÇÃO
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        window.location.href = 'index.html';
        return;
    }

    carregarReceita(id);
});

/* ============================================
   CARREGAR RECEITA
   ============================================ */

async function carregarReceita(id) {
    try {
        const resposta = await fetch(URL_API);
        const dados = await resposta.json();

        shaActual = dados.sha;

        // Corrige a codificação de caracteres portugueses
        const texto = decodeURIComponent(escape(atob(dados.content.replace(/\n/g, ''))));
        todasAsReceitas = JSON.parse(texto);

        receitaActual = todasAsReceitas.find(r => r.id === id);

        if (!receitaActual) {
            alert('Receita não encontrada.');
            window.location.href = 'index.html';
            return;
        }

        mostrarReceita(receitaActual);

    } catch (erro) {
        console.error('Erro ao carregar receita:', erro);
        alert('Erro ao carregar a receita.');
    }
}

/* ============================================
   MOSTRAR RECEITA NO ECRÃ
   ============================================ */

function mostrarReceita(receita) {
    // Título
    document.title = receita.titulo;
    document.getElementById('receita-titulo').textContent = receita.titulo;

    // Imagem
    if (receita.imagem) {
        document.getElementById('receita-imagem-container').innerHTML = `
            <img src="${receita.imagem}" alt="${receita.titulo}" class="receita-imagem"
                 onerror="this.style.display='none'">
        `;
    }

    // Meta informação (porções, tempos)
    const meta = [];
    if (receita.porcoes) meta.push(`🍽️ ${receita.porcoes} porções`);
    if (receita.tempoPreparacao) meta.push(`⏱️ Prep: ${receita.tempoPreparacao}`);
    if (receita.tempoConfecao) meta.push(`🔥 Conf: ${receita.tempoConfecao}`);

    if (meta.length > 0) {
        document.getElementById('receita-meta').innerHTML = meta
            .map(m => `<span class="meta-item">${m}</span>`)
            .join('');
    }

    // Categoria e tags
    const tags = [];
    if (receita.categoria) tags.push(`<span class="tag categoria">${receita.categoria}</span>`);
    if (receita.tags) {
        receita.tags.forEach(tag => {
            tags.push(`<span class="tag">${tag}</span>`);
        });
    }
    if (tags.length > 0) {
        document.getElementById('receita-tags').innerHTML = tags.join('');
    }

    // Ingredientes — separa por vírgula OU por nova linha
    if (receita.ingredientes) {
        const linhas = receita.ingredientes
            .split(/,|\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);
        document.getElementById('receita-ingredientes').innerHTML = linhas
            .map(l => `<li>${l}</li>`)
            .join('');
        document.getElementById('receita-ingredientes-container').style.display = 'block';
    }

    // Preparação — separa por ponto seguido de número OU por nova linha
    if (receita.preparacao) {
        const linhas = receita.preparacao
            .split(/(?=\d+\.)\s*|\n/)
            .map(l => l.replace(/^\d+\.\s*/, '').trim())
            .filter(l => l.length > 0);
        document.getElementById('receita-preparacao').innerHTML = linhas
            .map(l => `<li>${l}</li>`)
            .join('');
        document.getElementById('receita-preparacao-container').style.display = 'block';
    }

    // Botão favorito
    actualizarBotaoFavorito(receita.favorito);

    // Botão editar
    document.getElementById('btn-editar').href = `adicionar.html?id=${receita.id}`;
}

/* ============================================
   FAVORITO
   ============================================ */

function actualizarBotaoFavorito(favorito) {
    const btn = document.getElementById('btn-favorito');
    btn.textContent = favorito ? '❤️ Favorito' : '🤍 Favorito';
    btn.style.backgroundColor = favorito ? '#e74c3c' : '';
    btn.style.color = favorito ? 'white' : '';
}

async function toggleFavorito() {
    const githubToken = await obterToken();
    if (!githubToken) return;

    receitaActual.favorito = !receitaActual.favorito;
    actualizarBotaoFavorito(receitaActual.favorito);

    await guardarAlteracoes(githubToken, `Favorito: ${receitaActual.titulo}`);
}

/* ============================================
   ELIMINAR RECEITA
   ============================================ */

async function eliminarReceita() {
    if (!confirm(`Tens a certeza que queres eliminar "${receitaActual.titulo}"?`)) return;

    const githubToken = await obterToken();
    if (!githubToken) return;

    todasAsReceitas = todasAsReceitas.filter(r => r.id !== receitaActual.id);

    await guardarAlteracoes(githubToken, `Eliminar receita: ${receitaActual.titulo}`);
    window.location.href = 'index.html';
}

/* ============================================
   GUARDAR ALTERAÇÕES NO GITHUB
   ============================================ */

async function guardarAlteracoes(token, mensagem) {
    try {
        const conteudoBase64 = btoa(new TextEncoder().encode(JSON.stringify(todasAsReceitas, null, 2)).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));

        const resposta = await fetch(URL_API, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: mensagem,
                content: conteudoBase64,
                sha: shaActual
            })
        });

        if (!resposta.ok) {
            throw new Error('Erro ao guardar');
        }

        const dados = await resposta.json();
        shaActual = dados.content.sha;

    } catch (erro) {
        alert('Erro ao guardar as alterações.');
        console.error(erro);
    }
}

/* ============================================
   OBTER TOKEN DO GITHUB
   ============================================ */

async function obterToken() {
    let token = localStorage.getItem('github_token');
    if (!token) {
        token = prompt('Introduz o teu GitHub Personal Access Token:');
        if (!token) return null;
        localStorage.setItem('github_token', token);
    }
    return token;
}
