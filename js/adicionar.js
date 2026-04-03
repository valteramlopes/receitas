/* ============================================
   ADICIONAR.JS — Lógica da página de adicionar receitas
   ============================================ */

// Configuração do GitHub
const GITHUB_USER = 'valteramlopes';
const GITHUB_REPO = 'receitas';
const GITHUB_FILE = 'data/receitas.json';
const URL_API = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

// Tab activa no momento
let tabActiva = 'texto';

// Imagem carregada (em Base64)
let imagemBase64 = null;

// ID da receita a editar (null se for nova receita)
let idEditar = null;

// Verifica se está em modo de edição
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    idEditar = params.get('id');

    if (idEditar) {
        document.getElementById('pagina-titulo').textContent = 'Editar Receita';
        document.getElementById('cabecalho-titulo').textContent = 'Editar Receita';
        document.getElementById('btn-guardar').textContent = '💾 Guardar Alterações';
        carregarReceitaParaEditar(idEditar);
    }
});

async function carregarReceitaParaEditar(id) {
    try {
        const resposta = await fetch(URL_API);
        const dados = await resposta.json();
        const bytes = Uint8Array.from(atob(dados.content.replace(/\n/g, '')), c => c.charCodeAt(0));
        const texto = new TextDecoder('utf-8').decode(bytes);
        const receitas = JSON.parse(texto);
        const receita = receitas.find(r => r.id === id);

        if (!receita) {
            alert('Receita não encontrada.');
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('titulo').value = receita.titulo || '';
        document.getElementById('ingredientes').value = receita.ingredientes || '';
        document.getElementById('preparacao').value = receita.preparacao || '';
        document.getElementById('categoria').value = receita.categoria || '';
        document.getElementById('imagem-url').value = receita.imagem || '';
        document.getElementById('porcoes').value = receita.porcoes || '';
        document.getElementById('tempo-prep').value = receita.tempoPreparacao || '';
        document.getElementById('tempo-conf').value = receita.tempoConfecao || '';
        document.getElementById('tags').value = receita.tags ? receita.tags.join(', ') : '';

        document.getElementById('resultado').style.display = 'block';
        document.querySelector('.opcoes-extra').setAttribute('open', '');

    } catch (erro) {
        console.error('Erro ao carregar receita:', erro);
        alert('Erro ao carregar a receita.');
    }
}

/* ============================================
   TABS DE INTRODUÇÃO DE RECEITA
   ============================================ */

function mostrarTab(tab) {
    // Esconde todos os conteúdos
    document.querySelectorAll('.tab-conteudo').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));

    // Mostra o seleccionado
    document.getElementById('tab-' + tab).style.display = 'block';
    event.target.classList.add('active');

    tabActiva = tab;
}

/* ============================================
   PREVIEW DA IMAGEM CARREGADA
   ============================================ */

function previewImagem(input) {
    const ficheiro = input.files[0];
    if (!ficheiro) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        imagemBase64 = e.target.result;
        document.getElementById('upload-preview').innerHTML = `
            <img src="${imagemBase64}" style="max-width:100%; max-height:200px; border-radius:8px;">
            <p style="margin-top:8px; font-size:13px; color:#888">Toca para mudar a imagem</p>
        `;
    };
    reader.readAsDataURL(ficheiro);
}

/* ============================================
   PROCESSAR RECEITA COM GEMINI
   ============================================ */

async function processarReceita() {
    // Vai buscar a API key do Gemini guardada no browser
    let geminiKey = localStorage.getItem('gemini_key');
    if (!geminiKey) {
        geminiKey = prompt('Introduz a tua API key do Gemini:');
        if (!geminiKey) return;
        localStorage.setItem('gemini_key', geminiKey);
    }

    const btnProcessar = document.querySelector('.btn-processar');
    btnProcessar.textContent = '⏳ A processar...';
    btnProcessar.disabled = true;

    try {
        let resposta;

        if (tabActiva === 'texto') {
            const texto = document.getElementById('texto-receita').value.trim();
            if (!texto) {
                alert('Por favor cola o texto da receita primeiro.');
                return;
            }
            resposta = await processarTexto(texto, geminiKey);

        } else if (tabActiva === 'imagem') {
            if (!imagemBase64) {
                alert('Por favor escolhe uma imagem primeiro.');
                return;
            }
            resposta = await processarImagem(imagemBase64, geminiKey);

        } else if (tabActiva === 'link') {
            const url = document.getElementById('url-receita').value.trim();
            if (!url) {
                alert('Por favor introduz um link primeiro.');
                return;
            }
            resposta = await processarLink(url, geminiKey);
        }

        // Mostra o resultado para o utilizador rever
        if (resposta) {
            // Campos principais
            document.getElementById('ingredientes').value = resposta.ingredientes || '';
            document.getElementById('preparacao').value = resposta.preparacao || '';

            // Título (só preenche se estiver vazio)
            if (resposta.titulo && !document.getElementById('titulo').value) {
                document.getElementById('titulo').value = resposta.titulo;
            }

            // Campos opcionais extraídos pelo Gemini
            if (resposta.categoria) {
                document.getElementById('categoria').value = resposta.categoria;
            }
            if (resposta.porcoes) {
                document.getElementById('porcoes').value = resposta.porcoes;
            }
            if (resposta.tempoPreparacao) {
                document.getElementById('tempo-prep').value = resposta.tempoPreparacao;
            }
            if (resposta.tempoConfecao) {
                document.getElementById('tempo-conf').value = resposta.tempoConfecao;
            }
            if (resposta.tags && resposta.tags.length > 0) {
                document.getElementById('tags').value = resposta.tags.join(', ');
            }

            // Abre as opções extra para o utilizador rever
            document.querySelector('.opcoes-extra').setAttribute('open', '');

            document.getElementById('resultado').style.display = 'block';
            document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
        }

    } catch (erro) {
        alert('Erro ao processar a receita. Verifica a tua API key e a ligação à internet.');
        console.error(erro);
    } finally {
        btnProcessar.textContent = '✨ Processar com IA';
        btnProcessar.disabled = false;
    }
}

/* ============================================
   PROCESSAR TEXTO
   ============================================ */

async function processarTexto(texto, apiKey) {
    const prompt = `Analisa este texto de uma receita e devolve um JSON com os campos:
- "titulo": nome da receita (string)
- "ingredientes": ingredientes organizados, um por linha, em português de Portugal, com unidades métricas (string)
- "preparacao": passos numerados, um por linha, em português de Portugal (string)
- "categoria": uma destas opções se aplicável: Entradas, Sopas, Prato Principal, Sobremesas, Lanches, Bebidas, Pães, Molhos, Outros (string ou null)
- "porcoes": número de porções se mencionado (número ou null)
- "tempoPreparacao": tempo de preparação se mencionado, ex: "20 min" (string ou null)
- "tempoConfecao": tempo de confeção se mencionado, ex: "45 min" (string ou null)
- "tags": até 5 palavras-chave relevantes em português, ex: ["forno", "chocolate", "fácil"] (array ou null)

Regras:
- Converte unidades não-métricas para métricas (cups→ml, oz→g, °F→°C, etc.), mantendo o valor original entre parênteses
- Traduz para português de Portugal se estiver noutra língua
- Remove formatação estranha (bullets, números repetidos, etc.)
- Devolve APENAS o JSON, sem mais texto

Texto da receita:
${texto}`;

    return await chamarGemini(prompt, null, apiKey);
}

/* ============================================
   PROCESSAR IMAGEM
   ============================================ */

async function processarImagem(imagemBase64, apiKey) {
    const prompt = `Analisa esta imagem de uma receita e devolve um JSON com os campos:
- "titulo": nome da receita (string)
- "ingredientes": ingredientes organizados, um por linha, em português de Portugal, com unidades métricas (string)
- "preparacao": passos numerados, um por linha, em português de Portugal (string)
- "categoria": uma destas opções se aplicável: Entradas, Sopas, Prato Principal, Sobremesas, Lanches, Bebidas, Pães, Molhos, Outros (string ou null)
- "porcoes": número de porções se mencionado (número ou null)
- "tempoPreparacao": tempo de preparação se mencionado, ex: "20 min" (string ou null)
- "tempoConfecao": tempo de confeção se mencionado, ex: "45 min" (string ou null)
- "tags": até 5 palavras-chave relevantes em português, ex: ["forno", "chocolate", "fácil"] (array ou null)

Regras:
- Converte unidades não-métricas para métricas (cups→ml, oz→g, °F→°C, etc.), mantendo o valor original entre parênteses
- Traduz para português de Portugal se estiver noutra língua
- Remove formatação estranha
- Devolve APENAS o JSON, sem mais texto`;

    return await chamarGemini(prompt, imagemBase64, apiKey);
}

/* ============================================
   PROCESSAR LINK
   ============================================ */

async function processarLink(url, apiKey) {
    const prompt = `Acede a este link e extrai a receita que lá se encontra: ${url}

Devolve um JSON com os campos:
- "titulo": nome da receita (string)
- "ingredientes": ingredientes organizados, um por linha, em português de Portugal, com unidades métricas (string)
- "preparacao": passos numerados, um por linha, em português de Portugal (string)
- "categoria": uma destas opções se aplicável: Entradas, Sopas, Prato Principal, Sobremesas, Lanches, Bebidas, Pães, Molhos, Outros (string ou null)
- "porcoes": número de porções se mencionado (número ou null)
- "tempoPreparacao": tempo de preparação se mencionado, ex: "20 min" (string ou null)
- "tempoConfecao": tempo de confeção se mencionado, ex: "45 min" (string ou null)
- "tags": até 5 palavras-chave relevantes em português, ex: ["forno", "chocolate", "fácil"] (array ou null)

Regras:
- Converte unidades não-métricas para métricas (cups→ml, oz→g, °F→°C, etc.), mantendo o valor original entre parênteses
- Traduz para português de Portugal se estiver noutra língua
- Devolve APENAS o JSON, sem mais texto`;

    return await chamarGemini(prompt, null, apiKey);
}

/* ============================================
   CHAMADA À API DO GEMINI
   ============================================ */

async function chamarGemini(prompt, imagemBase64, apiKey) {
    const partes = [{ text: prompt }];

    // Se houver imagem, adiciona-a ao pedido
    if (imagemBase64) {
        const base64Limpo = imagemBase64.split(',')[1];
        const mimeType = imagemBase64.split(';')[0].split(':')[1];
        partes.unshift({
            inline_data: {
                mime_type: mimeType,
                data: base64Limpo
            }
        });
    }

    const resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: partes }]
            })
        }
    );

    if (!resposta.ok) {
        const erro = await resposta.json();
        throw new Error(erro.error?.message || 'Erro na API do Gemini');
    }

    const dados = await resposta.json();
    const texto = dados.candidates[0].content.parts[0].text;

    // Remove marcadores de código se existirem e faz parse do JSON
    const textoLimpo = texto.replace(/```json|```/g, '').trim();
    return JSON.parse(textoLimpo);
}

/* ============================================
   GUARDAR RECEITA NO GITHUB
   ============================================ */

async function guardarReceita() {
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) {
        alert('O título é obrigatório.');
        return;
    }

    const ingredientes = document.getElementById('ingredientes').value.trim();
    const preparacao = document.getElementById('preparacao').value.trim();

    if (!ingredientes && !preparacao) {
        alert('Introduz pelo menos os ingredientes ou a preparação.');
        return;
    }

    // Modo edição — actualiza a receita existente
    if (idEditar) {
        await actualizarReceita(titulo, ingredientes, preparacao);
        return;
    }

    // Vai buscar o token do GitHub guardado no browser
    let githubToken = localStorage.getItem('github_token');
    if (!githubToken) {
        githubToken = prompt('Introduz o teu GitHub Personal Access Token:');
        if (!githubToken) return;
        localStorage.setItem('github_token', githubToken);
    }

    const btnGuardar = document.querySelector('.btn-guardar');
    btnGuardar.textContent = '⏳ A guardar...';
    btnGuardar.disabled = true;

    try {
        // Lê o ficheiro actual para obter o SHA (necessário para actualizar)
        const respostaLeitura = await fetch(URL_API, {
            headers: { 'Authorization': `token ${githubToken}` }
        });

        let receitas = [];
        let sha = null;

        if (respostaLeitura.ok) {
            const dadosActuais = await respostaLeitura.json();
            sha = dadosActuais.sha;
            const bytes = Uint8Array.from(atob(dadosActuais.content.replace(/\n/g, '')), c => c.charCodeAt(0));
            const textoActual = new TextDecoder('utf-8').decode(bytes);
            receitas = JSON.parse(textoActual);
        }

        // Cria a nova receita
        const novaReceita = {
            id: crypto.randomUUID(),
            titulo: titulo,
            ingredientes: ingredientes || null,
            preparacao: preparacao || null,
            categoria: document.getElementById('categoria').value || null,
            imagem: document.getElementById('imagem-url').value.trim() || null,
            porcoes: document.getElementById('porcoes').value ? Number(document.getElementById('porcoes').value) : null,
            tempoPreparacao: document.getElementById('tempo-prep').value.trim() || null,
            tempoConfecao: document.getElementById('tempo-conf').value.trim() || null,
            tags: document.getElementById('tags').value
                ? document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t)
                : null,
            favorito: false,
            dataCriacao: new Date().toISOString()
        };

        receitas.push(novaReceita);

        // Guarda o ficheiro actualizado no GitHub
       const conteudoBase64 = btoa(new TextEncoder().encode(JSON.stringify(receitas, null, 2)).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));

        const corpo = {
            message: `Adicionar receita: ${titulo}`,
            content: conteudoBase64,
            sha: sha
        };

        const respostaEscrita = await fetch(URL_API, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(corpo)
        });

        if (!respostaEscrita.ok) {
            const erro = await respostaEscrita.json();
            throw new Error(erro.message || 'Erro ao guardar no GitHub');
        }

        alert('Receita guardada com sucesso! ✅');
        window.location.href = 'index.html';

    } catch (erro) {
        alert('Erro ao guardar a receita. Verifica o teu token do GitHub.');
        console.error(erro);
    } finally {
        btnGuardar.textContent = '💾 Guardar Receita';
        btnGuardar.disabled = false;
    }
}

async function actualizarReceita(titulo, ingredientes, preparacao) {
    let githubToken = localStorage.getItem('github_token');
    if (!githubToken) {
        githubToken = prompt('Introduz o teu GitHub Personal Access Token:');
        if (!githubToken) return;
        localStorage.setItem('github_token', githubToken);
    }

    const btnGuardar = document.getElementById('btn-guardar');
    btnGuardar.textContent = '⏳ A guardar...';
    btnGuardar.disabled = true;

    try {
        const respostaLeitura = await fetch(URL_API, {
            headers: { 'Authorization': `token ${githubToken}` }
        });

        const dadosActuais = await respostaLeitura.json();
        const sha = dadosActuais.sha;
        const bytes = Uint8Array.from(atob(dadosActuais.content.replace(/\n/g, '')), c => c.charCodeAt(0));
        const texto = new TextDecoder('utf-8').decode(bytes);
        let receitas = JSON.parse(texto);

        // Encontra e actualiza a receita
        const indice = receitas.findIndex(r => r.id === idEditar);
        if (indice === -1) {
            alert('Receita não encontrada.');
            return;
        }

        receitas[indice] = {
            ...receitas[indice],
            titulo: titulo,
            ingredientes: ingredientes || null,
            preparacao: preparacao || null,
            categoria: document.getElementById('categoria').value || null,
            imagem: document.getElementById('imagem-url').value.trim() || null,
            porcoes: document.getElementById('porcoes').value ? Number(document.getElementById('porcoes').value) : null,
            tempoPreparacao: document.getElementById('tempo-prep').value.trim() || null,
            tempoConfecao: document.getElementById('tempo-conf').value.trim() || null,
            tags: document.getElementById('tags').value
                ? document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t)
                : null
        };

        const conteudoBase64 = btoa(new TextEncoder().encode(JSON.stringify(receitas, null, 2)).reduce((acc, byte) => acc + String.fromCharCode(byte), ''));

        const respostaEscrita = await fetch(URL_API, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Editar receita: ${titulo}`,
                content: conteudoBase64,
                sha: sha
            })
        });

        if (!respostaEscrita.ok) {
            throw new Error('Erro ao guardar');
        }

        alert('Receita actualizada com sucesso! ✅');
        window.location.href = `receita.html?id=${idEditar}`;

    } catch (erro) {
        alert('Erro ao guardar as alterações.');
        console.error(erro);
    } finally {
        btnGuardar.textContent = '💾 Guardar Alterações';
        btnGuardar.disabled = false;
    }
}
