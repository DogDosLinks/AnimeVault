// preload.js — Ponte entre o main.js (Node) e o render.js (navegador)

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs   = require('fs');

// Pede o caminho userData ao main.js de forma síncrona
const PASTA_DADOS  = ipcRenderer.sendSync('get-user-data-path');
const ARQUIVO_JSON = path.join(PASTA_DADOS, 'animes.json');

// Garante que o arquivo JSON existe (cria vazio se não existir)
if (!fs.existsSync(ARQUIVO_JSON)) {
    fs.writeFileSync(ARQUIVO_JSON, JSON.stringify([], null, 2), 'utf-8');
}

// Extensões de vídeo reconhecidas
const EXTENSOES_VIDEO = ['.mp4', '.avi', '.mkv', '.mov', '.webm'];

contextBridge.exposeInMainWorld('electronAPI', {

    // Lê a lista de animes do JSON
    carregarAnimes: () => {
        try {
            const conteudo = fs.readFileSync(ARQUIVO_JSON, 'utf-8');
            return JSON.parse(conteudo);
        } catch (e) {
            console.error('Erro ao ler animes.json:', e);
            return [];
        }
    },

    // Salva o array de animes no JSON
    salvarAnimes: (listaDeAnimes) => {
        try {
            fs.writeFileSync(ARQUIVO_JSON, JSON.stringify(listaDeAnimes, null, 2), 'utf-8');
            return true;
        } catch (e) {
            console.error('Erro ao salvar animes.json:', e);
            return false;
        }
    },

    // Escaneia uma pasta e retorna apenas os arquivos de vídeo
    escanearEpisodios: (caminhoPasta, episodiosAntigos = []) => {
        try {
            const arquivos = fs.readdirSync(caminhoPasta);

            const videos = arquivos
                .filter(arquivo => {
                    const ext = path.extname(arquivo).toLowerCase();
                    return EXTENSOES_VIDEO.includes(ext);
                })
                .sort()
                .map(arquivo => {
                    const antigo = episodiosAntigos.find(e => e.nome === arquivo);
                    return {
                        nome:    arquivo,
                        caminho: path.join(caminhoPasta, arquivo),
                        visto:   antigo ? antigo.visto : false
                    };
                });

            return videos;
        } catch (e) {
            console.error('Erro ao escanear pasta:', e);
            return [];
        }
    },

    selecionarImagem: () => ipcRenderer.invoke('selecionar-imagem'),
    selecionarPasta:  () => ipcRenderer.invoke('selecionar-pasta'),
    abrirPasta:       (caminho) => ipcRenderer.invoke('abrir-pasta', caminho),
    abrirVideo:       (caminho) => ipcRenderer.invoke('abrir-pasta', caminho),
});
