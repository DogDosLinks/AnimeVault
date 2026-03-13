// render.js — Tela do AnimeVault (processo de renderização Electron)

// ---------- Referências do DOM ----------
const searchInput    = document.getElementById('search-input');
const searchButton   = document.getElementById('search-button');
const mainGrid       = document.getElementById('main-grid');

const modal          = document.getElementById('modal-adicionar');
const btnAbrirModal  = document.getElementById('add-anime-button');
const btnCancelar    = document.getElementById('btn-cancelar');
const btnAplicar     = document.getElementById('btn-aplicar');

const inputTitulo    = document.getElementById('input-titulo');
const inputCapa      = document.getElementById('input-capa');
const inputPasta     = document.getElementById('input-pasta');
const inputSinopse   = document.getElementById('input-sinopse');
const btnBuscarCapa  = document.getElementById('btn-buscar-capa');
const btnBuscarPasta = document.getElementById('btn-buscar-pasta');
const jikanSugestoes = document.getElementById('jikan-sugestoes');
const btnTraduzir    = document.getElementById('btn-traduzir');
const modalTags      = document.getElementById('modal-tags');
const detalhesTags   = document.getElementById('detalhes-tags');

const painelDetalhes    = document.getElementById('painel-detalhes');
const detalhesCapa      = document.getElementById('detalhes-capa');
const detalhesTitulo    = document.getElementById('detalhes-titulo');
const detalhesSinopse   = document.getElementById('detalhes-sinopse');
const detalhesInfo      = document.getElementById('detalhes-info');
const listaEpisodios    = document.getElementById('lista-episodios');
const btnFecharDetalhes = document.getElementById('btn-fechar-detalhes');
const btnAtualizarPasta = document.getElementById('btn-atualizar-pasta');
const btnEditar         = document.getElementById('btn-editar');

// ---------- Dados ----------
const meusAnimes = window.electronAPI.carregarAnimes();
let animeAberto  = null;

// ---------- Jikan API — Busca automática ao digitar o título ----------

let jikanTimer = null; // guarda o timer do debounce

// Esconde o dropdown e cancela qualquer busca pendente
function fecharSugestoes() {
    jikanSugestoes.classList.remove('visivel');
    jikanSugestoes.innerHTML = '';
}

// Mostra o dropdown com uma mensagem de status (loading, erro, etc.)
function mostrarStatusSugestoes(mensagem, classe) {
    jikanSugestoes.innerHTML = '<div class="' + classe + '">' + mensagem + '</div>';
    jikanSugestoes.classList.add('visivel');
}

// Renderiza pílulas de tags em qualquer container recebido
function renderizarTags(container, generos) {
    container.innerHTML = '';
    if (!generos || generos.length === 0) {
        container.style.display = 'none';
        return;
    }
    generos.forEach(nome => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = nome;
        container.appendChild(tag);
    });
    container.style.display = 'flex';
}

// Preenche os campos do modal com os dados do anime escolhido
function aplicarSugestao(anime) {
    inputTitulo.value  = anime.title;
    inputCapa.value    = anime.capaUrl;
    inputSinopse.value = anime.sinopse;

    // Guarda os gêneros num dataset para salvar no JSON depois
    inputTitulo.dataset.generos = JSON.stringify(anime.generos || []);

    // Mostra as tags no modal
    renderizarTags(modalTags, anime.generos || []);

    fecharSugestoes();

    // Mostra o botão traduzir só se veio sinopse
    if (anime.sinopse && anime.sinopse.trim() !== '') {
        btnTraduzir.style.display = 'inline-block';
        btnTraduzir.textContent   = '🌐 Traduzir para Português';
        btnTraduzir.classList.remove('carregando');
    } else {
        btnTraduzir.style.display = 'none';
    }
}

// Renderiza a lista de sugestões no dropdown
function renderizarSugestoes(resultados) {
    if (resultados.length === 0) {
        mostrarStatusSugestoes('Nenhum resultado encontrado.', 'jikan-vazio');
        return;
    }

    jikanSugestoes.innerHTML = '';

    resultados.forEach(item => {
        const div = document.createElement('div');
        div.className = 'jikan-item';

        // Ano de exibição (pode vir nulo da API)
        const ano = item.aired && item.aired.prop && item.aired.prop.from && item.aired.prop.from.year
            ? item.aired.prop.from.year
            : '?';

        // Tipo: TV, Movie, OVA, etc.
        const tipo = item.type || '?';

        div.innerHTML =
            '<img class="jikan-item-thumb" src="' + (item.images.jpg.image_url || '') + '" alt="">' +
            '<div class="jikan-item-info">' +
                '<span class="jikan-item-titulo">' + item.title + '</span>' +
                '<span class="jikan-item-meta">' + tipo + ' · ' + ano + '</span>' +
            '</div>';

        // Ao clicar, aplica os dados deste anime no formulário
        div.addEventListener('click', () => {
            aplicarSugestao({
                title:    item.title,
                capaUrl:  item.images.jpg.large_image_url || item.images.jpg.image_url || '',
                sinopse:  item.synopsis || '',
                generos:  (item.genres || []).map(g => g.name)  // ex: ['Action', 'Adventure']
            });
        });

        jikanSugestoes.appendChild(div);
    });

    jikanSugestoes.classList.add('visivel');
}

// Faz a chamada à Jikan com debounce de 600ms
inputTitulo.addEventListener('input', () => {
    const termo = inputTitulo.value.trim();

    // Cancela o timer anterior (debounce)
    clearTimeout(jikanTimer);

    if (termo.length < 3) {
        fecharSugestoes();
        return;
    }

    mostrarStatusSugestoes('Buscando...', 'jikan-loading');

    // Só dispara a requisição depois de 600ms sem digitar
    jikanTimer = setTimeout(async () => {
        try {
            const resposta = await fetch(
                'https://api.jikan.moe/v4/anime?q=' + encodeURIComponent(termo) + '&limit=5&sfw'
            );

            if (!resposta.ok) {
                mostrarStatusSugestoes('Erro ao consultar a API. Tente novamente.', 'jikan-vazio');
                return;
            }

            const dados = await resposta.json();
            renderizarSugestoes(dados.data || []);

        } catch (erro) {
            console.error('Erro na Jikan:', erro);
            mostrarStatusSugestoes('Sem conexão ou API indisponível.', 'jikan-vazio');
        }
    }, 600);
});

// Fecha o dropdown ao clicar fora dele
document.addEventListener('click', (e) => {
    if (!jikanSugestoes.contains(e.target) && e.target !== inputTitulo) {
        fecharSugestoes();
    }
});

// ---------- MyMemory API — Tradução da sinopse para PT-BR ----------

btnTraduzir.addEventListener('click', async () => {
    const texto = inputSinopse.value.trim();
    if (!texto) return;

    btnTraduzir.textContent = '⏳ Traduzindo...';
    btnTraduzir.classList.add('carregando');

    try {
        const traduzido = await traduzirGoogleTranslate(texto);
        inputSinopse.value = traduzido;
        btnTraduzir.style.display = 'none';

    } catch (erro) {
        console.error('Erro na tradução:', erro);
        btnTraduzir.textContent = '✕ Falha na tradução';
        btnTraduzir.classList.remove('carregando');
        setTimeout(() => {
            btnTraduzir.textContent = '🌐 Traduzir para Português';
        }, 3000);
    }
});

// Usa o endpoint público do Google Translate (mesmo usado pelo site, sem chave de API)
// Divide textos longos em blocos para não ultrapassar o limite de URL
async function traduzirGoogleTranslate(texto) {
    const blocos     = dividirEmBlocos(texto, 1000);
    const traduzidos = [];

    for (const bloco of blocos) {
        const url = 'https://translate.googleapis.com/translate_a/single'
                  + '?client=gtx'
                  + '&sl=en'    // origem: inglês
                  + '&tl=pt'    // destino: português
                  + '&dt=t'     // pede o texto traduzido
                  + '&q=' + encodeURIComponent(bloco);

        const resposta = await fetch(url);
        if (!resposta.ok) throw new Error('HTTP ' + resposta.status);

        const dados = await resposta.json();

        // Resposta é um array aninhado: [ [ ["tradução","original"], ... ] ]
        // Junta todos os pedaços traduzidos em uma string só
        const partes = dados[0].map(item => item[0]).filter(Boolean);
        traduzidos.push(partes.join(''));
    }

    return traduzidos.join(' ');
}


// Divide um texto longo em blocos de no máximo `tamanho` caracteres
// sem cortar palavras no meio
function dividirEmBlocos(texto, tamanho) {
    const blocos = [];
    const palavras = texto.split(' ');
    let atual = '';

    for (const palavra of palavras) {
        // Se adicionar a palavra ainda cabe no bloco, adiciona
        if ((atual + ' ' + palavra).trim().length <= tamanho) {
            atual = (atual + ' ' + palavra).trim();
        } else {
            // Senão, fecha o bloco atual e começa um novo
            if (atual) blocos.push(atual);
            atual = palavra;
        }
    }

    if (atual) blocos.push(atual);
    return blocos;
}

// ---------- Painel de Detalhes — Abrir / Fechar ----------

function abrirDetalhes(anime) {
    animeAberto = anime;

    const temCapa = anime.capa && anime.capa.trim() !== '';
    const urlCapa = temCapa
        ? (anime.capa.startsWith('http') ? anime.capa : 'file://' + anime.capa)
        : '';

    if (urlCapa) {
        detalhesCapa.style.backgroundImage = "url('" + urlCapa + "')";
        detalhesCapa.innerHTML = '';
    } else {
        detalhesCapa.style.backgroundImage = '';
        detalhesCapa.innerHTML = '<span>Sem Capa</span>';
    }

    detalhesTitulo.textContent = anime.titulo;

    // Garante que a visualização normal está visível (sai do modo edição se estava)
    sairModoEdicao();

    // Mostra as tags/gêneros do anime (vazio se não tiver)
    renderizarTags(detalhesTags, anime.generos || []);

    renderizarEpisodios(anime.episodios || []);
    painelDetalhes.style.display = 'flex';
}

function fecharDetalhes() {
    painelDetalhes.style.display = 'none';
    animeAberto = null;
    sairModoEdicao();
}

btnFecharDetalhes.addEventListener('click', fecharDetalhes);
painelDetalhes.addEventListener('click', (e) => {
    if (e.target === painelDetalhes) fecharDetalhes();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (painelDetalhes.style.display === 'flex') fecharDetalhes();
        if (modal.style.display === 'block') fecharModal();
    }
});

// ---------- Modo de Edição — Entrar / Sair ----------

function entrarModoEdicao() {
    if (!animeAberto) return;

    // Esconde o parágrafo de sinopse e o botão editar
    detalhesSinopse.style.display = 'none';
    btnEditar.style.display = 'none';

    // Monta o formulário inline dentro de detalhes-info
    const form = document.createElement('div');
    form.id = 'edicao-inline';
    form.className = 'edicao-inline';

    form.innerHTML =
        '<label>Sinopse</label>' +
        '<textarea id="edicao-sinopse" rows="5">' + (animeAberto.sinopse || '') + '</textarea>' +
        '<label>Pasta</label>' +
        '<div class="edicao-pasta-group">' +
            '<input type="text" id="edicao-pasta" readonly value="' + (animeAberto.pasta || '') + '" placeholder="Nenhuma pasta selecionada">' +
            '<button class="btn-trocar-pasta" id="btn-trocar-pasta">📁 Trocar</button>' +
        '</div>' +
        '<div class="edicao-acoes">' +
            '<button class="btn-salvar-edicao" id="btn-salvar-edicao">✓ Salvar</button>' +
            '<button class="btn-cancelar-edicao" id="btn-cancelar-edicao">Cancelar</button>' +
        '</div>';

    detalhesInfo.appendChild(form);

    // Botão trocar pasta — abre o seletor de pasta do sistema
    document.getElementById('btn-trocar-pasta').addEventListener('click', async () => {
        const caminho = await window.electronAPI.selecionarPasta();
        if (!caminho) return;
        document.getElementById('edicao-pasta').value = caminho;
    });

    // Botão salvar — aplica as mudanças no objeto e salva no JSON
    document.getElementById('btn-salvar-edicao').addEventListener('click', () => {
        const novaSinopse = document.getElementById('edicao-sinopse').value.trim();
        const novaPasta   = document.getElementById('edicao-pasta').value.trim();
        const pastaAntiga = animeAberto.pasta;

        animeAberto.sinopse = novaSinopse;
        animeAberto.pasta   = novaPasta;

        // Se a pasta mudou, re-escaneia os episódios preservando os "vistos" anteriores
        if (novaPasta !== pastaAntiga && novaPasta !== '') {
            animeAberto.episodios = window.electronAPI.escanearEpisodios(
                novaPasta,
                animeAberto.episodios || []
            );
            renderizarEpisodios(animeAberto.episodios);
        }

        window.electronAPI.salvarAnimes(meusAnimes);
        sairModoEdicao();
    });

    // Botão cancelar — descarta as mudanças
    document.getElementById('btn-cancelar-edicao').addEventListener('click', sairModoEdicao);
}

function sairModoEdicao() {
    // Remove o formulário inline se existir
    const form = document.getElementById('edicao-inline');
    if (form) form.remove();

    // Atualiza o texto da sinopse com o valor atual (pode ter sido salvo)
    if (animeAberto) {
        detalhesSinopse.textContent = animeAberto.sinopse && animeAberto.sinopse.trim() !== ''
            ? animeAberto.sinopse
            : 'Nenhuma sinopse cadastrada.';
    }

    // Mostra novamente a sinopse e o botão editar
    detalhesSinopse.style.display = '';
    btnEditar.style.display = '';
}

// Clique no botão ✏️ Editar
btnEditar.addEventListener('click', entrarModoEdicao);

// ---------- Botão Atualizar Pasta ----------

btnAtualizarPasta.addEventListener('click', () => {
    if (!animeAberto) return;

    if (!animeAberto.pasta || animeAberto.pasta.trim() === '') {
        btnAtualizarPasta.textContent = '✕ Sem pasta cadastrada';
        btnAtualizarPasta.classList.add('btn-atualizar-erro');
        setTimeout(() => {
            btnAtualizarPasta.textContent = '↻ Atualizar Pasta';
            btnAtualizarPasta.classList.remove('btn-atualizar-erro');
        }, 2000);
        return;
    }

    const episodiosAtualizados = window.electronAPI.escanearEpisodios(
        animeAberto.pasta,
        animeAberto.episodios || []
    );

    const totalAntes = (animeAberto.episodios || []).length;
    const novos      = episodiosAtualizados.length - totalAntes;

    animeAberto.episodios = episodiosAtualizados;
    window.electronAPI.salvarAnimes(meusAnimes);
    renderizarEpisodios(episodiosAtualizados);

    btnAtualizarPasta.textContent = novos > 0
        ? '✓ ' + novos + ' novo(s) episódio(s)!'
        : '✓ Já está atualizado';
    btnAtualizarPasta.classList.add('btn-atualizar-sucesso');

    setTimeout(() => {
        btnAtualizarPasta.textContent = '↻ Atualizar Pasta';
        btnAtualizarPasta.classList.remove('btn-atualizar-sucesso');
    }, 2000);
});

// ---------- Episódios — Renderizar ----------

function renderizarEpisodios(episodios) {
    if (!episodios || episodios.length === 0) {
        listaEpisodios.innerHTML =
            '<div class="lista-episodios-vazia"><p>Nenhum episódio encontrado na pasta.</p></div>';
        return;
    }

    const totalVistos   = episodios.filter(ep => ep.visto).length;
    const todosMarcados = totalVistos === episodios.length;

    listaEpisodios.innerHTML =
        '<div class="episodios-header">' +
            '<span class="ep-contador">' + totalVistos + '/' + episodios.length + ' vistos</span>' +
            '<button class="btn-marcar-todos ' + (todosMarcados ? 'desmarcado' : '') + '">' +
                (todosMarcados ? '✕ Desmarcar todos' : '✓ Marcar todos como visto') +
            '</button>' +
        '</div>' +
        episodios.map((ep, i) =>
            '<div class="episodio-item ' + (ep.visto ? 'ep-visto' : '') + '" data-indice="' + i + '">' +
                '<div class="ep-checkbox ' + (ep.visto ? 'marcado' : '') + '" data-indice="' + i + '" title="Marcar como visto">' +
                    (ep.visto ? '✓' : '') +
                '</div>' +
                '<span class="ep-numero">EP ' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span class="ep-nome">' + ep.nome + '</span>' +
                '<span class="ep-play" data-indice="' + i + '">▶</span>' +
            '</div>'
        ).join('');

    listaEpisodios.querySelectorAll('.episodio-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('ep-checkbox')) return;
            const i = parseInt(item.getAttribute('data-indice'));
            window.electronAPI.abrirVideo(episodios[i].caminho);
        });
    });

    listaEpisodios.querySelectorAll('.ep-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!animeAberto) return;
            const i = parseInt(checkbox.getAttribute('data-indice'));
            animeAberto.episodios[i].visto = !animeAberto.episodios[i].visto;
            window.electronAPI.salvarAnimes(meusAnimes);
            renderizarEpisodios(animeAberto.episodios);
            renderizarTodos(meusAnimes); // atualiza a barra de progresso no card
        });
    });

    listaEpisodios.querySelector('.btn-marcar-todos').addEventListener('click', () => {
        if (!animeAberto) return;
        const novoEstado = !todosMarcados;
        animeAberto.episodios.forEach(ep => ep.visto = novoEstado);
        window.electronAPI.salvarAnimes(meusAnimes);
        renderizarEpisodios(animeAberto.episodios);
        renderizarTodos(meusAnimes); // atualiza a barra de progresso no card
    });
}

// ---------- Menu de Contexto (botão direito) ----------

const menuContexto = document.createElement('div');
menuContexto.id = 'menu-contexto';
menuContexto.innerHTML = '<button id="btn-deletar-anime">🗑️ Deletar anime</button>';
document.body.appendChild(menuContexto);

// Modal de confirmação de exclusão — criado dinamicamente
const modalConfirmar = document.createElement('div');
modalConfirmar.id = 'modal-confirmar';
modalConfirmar.innerHTML =
    '<div class="confirmar-caixa">' +
        '<h3>Deletar anime</h3>' +
        '<p>Tem certeza que deseja remover <span id="confirmar-nome"></span> da sua biblioteca?</p>' +
        '<div class="confirmar-acoes">' +
            '<button class="btn-confirmar-sim" id="btn-confirmar-sim">Deletar</button>' +
            '<button class="btn-confirmar-nao" id="btn-confirmar-nao">Cancelar</button>' +
        '</div>' +
    '</div>';
document.body.appendChild(modalConfirmar);

let indiceAlvo = null;

// Fecha o menu de contexto ao clicar em qualquer lugar
document.addEventListener('click', () => {
    menuContexto.style.display = 'none';
});

// Clique em "Deletar anime" no menu de contexto — abre o modal de confirmação
document.getElementById('btn-deletar-anime').addEventListener('click', (e) => {
    e.stopPropagation(); // Impede que o click acima feche o modal imediatamente
    if (indiceAlvo === null) return;

    // Coloca o nome do anime na mensagem de confirmação
    const nomeAnime = meusAnimes[indiceAlvo]?.titulo || 'este anime';
    document.getElementById('confirmar-nome').textContent = '"' + nomeAnime + '"';

    menuContexto.style.display = 'none';
    modalConfirmar.classList.add('visivel');
});

// Botão "Deletar" — confirma a exclusão
document.getElementById('btn-confirmar-sim').addEventListener('click', () => {
    if (indiceAlvo === null) return;
    meusAnimes.splice(indiceAlvo, 1);
    window.electronAPI.salvarAnimes(meusAnimes);
    renderizarTodos(meusAnimes);
    modalConfirmar.classList.remove('visivel');
    indiceAlvo = null;
});

// Botão "Cancelar" — fecha sem fazer nada
document.getElementById('btn-confirmar-nao').addEventListener('click', () => {
    modalConfirmar.classList.remove('visivel');
    indiceAlvo = null;
});

// Clique no fundo escuro também fecha
modalConfirmar.addEventListener('click', (e) => {
    if (e.target === modalConfirmar) {
        modalConfirmar.classList.remove('visivel');
        indiceAlvo = null;
    }
});

// ---------- Renderização dos cards ----------

function adicionarAnimeNaTela(anime, indice) {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const temCapa = anime.capa && anime.capa.trim() !== '';
    const urlCapa = temCapa
        ? (anime.capa.startsWith('http') ? anime.capa : 'file://' + anime.capa)
        : '';

    // Calcula progresso de episódios para a barra
    const eps        = anime.episodios || [];
    const total      = eps.length;
    const vistos     = eps.filter(ep => ep.visto).length;
    const porcento   = total > 0 ? Math.round((vistos / total) * 100) : 0;
    // Cor muda conforme progresso: vermelho → amarelo → verde
    const corBarra   = porcento === 100 ? '#2ed573' : porcento >= 50 ? '#ffa502' : '#ff4757';

    card.innerHTML =
        '<div class="capa-container"' + (urlCapa ? ' style="background-image: url(\'' + urlCapa + '\')"' : '') + '>' +
            (!temCapa ? '<span>Sem Capa</span>' : '') +
        '</div>' +
        '<p>' + anime.titulo + '</p>' +
        // Barra de progresso — só aparece se houver episódios cadastrados
        (total > 0
            ? '<div class="progresso-barra"><div class="progresso-fill" style="width:' + porcento + '%; background:' + corBarra + ';"></div></div>' +
              '<span class="progresso-texto">' + vistos + '/' + total + ' vistos</span>'
            : '');

    card.addEventListener('click', () => abrirDetalhes(anime));

    if (anime.pasta) {
        card.style.cursor = 'pointer';
        card.title = 'Clique para ver detalhes | Duplo clique para abrir pasta';
        card.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            window.electronAPI.abrirPasta(anime.pasta);
        });
    }

    card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        indiceAlvo = indice;
        menuContexto.style.display = 'block';
        menuContexto.style.left = e.pageX + 'px';
        menuContexto.style.top  = e.pageY + 'px';
    });

    mainGrid.appendChild(card);
}

function renderizarTodos(lista) {
    mainGrid.innerHTML = '';
    lista.forEach((anime, indice) => adicionarAnimeNaTela(anime, indice));
}

// ---------- Busca ----------

function realizarBusca() {
    const termo = searchInput.value.trim().toLowerCase();
    if (!termo) { renderizarTodos(meusAnimes); return; }

    const filtrados = meusAnimes.filter(anime =>
        anime.titulo.toLowerCase().includes(termo)
    );

    renderizarTodos(filtrados);

    if (filtrados.length === 0) {
        mainGrid.innerHTML = '<p style="color:#666; padding:20px;">Nenhum anime encontrado para "<strong>' + termo + '</strong>".</p>';
    }
}

searchButton.addEventListener('click', realizarBusca);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') realizarBusca(); });
searchInput.addEventListener('input', realizarBusca);

// ---------- Modal — Abrir / Fechar ----------

function abrirModal() {
    inputTitulo.value  = '';
    inputCapa.value    = '';
    inputPasta.value   = '';
    inputSinopse.value = '';
    delete inputPasta.dataset.episodios;
    delete inputTitulo.dataset.generos;
    fecharSugestoes();
    btnTraduzir.style.display  = 'none';
    modalTags.style.display    = 'none';
    modalTags.innerHTML        = '';
    modal.style.display = 'block';
    inputTitulo.focus();
}

function fecharModal() {
    modal.style.display = 'none';
}

btnAbrirModal.addEventListener('click', abrirModal);
btnCancelar.addEventListener('click', fecharModal);
modal.addEventListener('click', (e) => { if (e.target === modal) fecharModal(); });

// ---------- Modal — Seletores de arquivo (botões) ----------

btnBuscarCapa.addEventListener('click', async () => {
    const caminho = await window.electronAPI.selecionarImagem();
    if (!caminho) return;
    inputCapa.value = caminho;
});

btnBuscarPasta.addEventListener('click', async () => {
    const caminho = await window.electronAPI.selecionarPasta();
    if (!caminho) return;
    inputPasta.value = caminho;

    const episodios = window.electronAPI.escanearEpisodios(caminho);
    inputPasta.dataset.episodios = JSON.stringify(episodios);

    if (episodios.length > 0) {
        inputPasta.title = episodios.length + ' vídeo(s) encontrado(s)';
        inputPasta.style.borderColor = '#2ed573';
        setTimeout(() => inputPasta.style.borderColor = '', 2000);
    } else {
        inputPasta.title = 'Nenhum arquivo de vídeo encontrado nesta pasta.';
        inputPasta.style.borderColor = '#ffa502';
        setTimeout(() => inputPasta.style.borderColor = '', 2000);
    }
});

// ---------- Modal — Aplicar ----------

btnAplicar.addEventListener('click', () => {
    const titulo = inputTitulo.value.trim();

    if (!titulo) {
        inputTitulo.focus();
        inputTitulo.style.borderColor = '#ff4757';
        setTimeout(() => inputTitulo.style.borderColor = '', 1500);
        return;
    }

    let episodios = [];
    if (inputPasta.dataset.episodios) {
        try { episodios = JSON.parse(inputPasta.dataset.episodios); }
        catch (e) { episodios = []; }
    }

    let generos = [];
    if (inputTitulo.dataset.generos) {
        try { generos = JSON.parse(inputTitulo.dataset.generos); }
        catch (e) { generos = []; }
    }

    const novoAnime = {
        titulo:    titulo,
        capa:      inputCapa.value.trim(),
        pasta:     inputPasta.value.trim(),
        sinopse:   inputSinopse.value.trim(),
        generos:   generos,
        episodios: episodios
    };

    meusAnimes.push(novoAnime);
    window.electronAPI.salvarAnimes(meusAnimes);
    adicionarAnimeNaTela(novoAnime, meusAnimes.length - 1);
    fecharModal();
});

// ---------- Inicialização ----------
renderizarTodos(meusAnimes);