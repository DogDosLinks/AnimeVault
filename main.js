// main.js — Processo principal do Electron
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1080,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            nodeIntegration: false,
            webSecurity: false // Desabilita a política de segurança do electron. 
        }
    });

    win.loadFile(path.join(__dirname, 'index.html'));

    // Descomente para abrir o DevTools automaticamente:
    //win.webContents.openDevTools();
};

app.whenReady().then(() => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// ─── Handlers IPC ────────────────────────────────────────────────────────────

// Retorna o caminho userData de forma SÍNCRONA para o preload.js
// (ipcRenderer.sendSync precisa de ipcMain.on, não ipcMain.handle)
ipcMain.on('get-user-data-path', (event) => {
    event.returnValue = app.getPath('userData');
});

// Abre dialog para selecionar imagem
ipcMain.handle('selecionar-imagem', async () => {
    const resultado = await dialog.showOpenDialog({
        title: 'Selecionar capa',
        filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile']
    });
    return resultado.canceled ? null : resultado.filePaths[0];
});

// Abre dialog para selecionar pasta
ipcMain.handle('selecionar-pasta', async () => {
    const resultado = await dialog.showOpenDialog({
        title: 'Selecionar pasta do anime',
        properties: ['openDirectory']
    });
    return resultado.canceled ? null : resultado.filePaths[0];
});

// Abre pasta ou arquivo no explorador/player padrão do SO
ipcMain.handle('abrir-pasta', async (event, caminho) => {
    await shell.openPath(caminho);
});