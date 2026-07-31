const { app, BrowserWindow, ipcMain } = require('electron');// electron require some methods for operations


const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

let mainWindow;// ak variable declare hua ha bs

let watcher = null;
let isOrganise = false;

const downloadsDir = path.join(require('os').homedir(), 'Downloads');// home directory from os

const CATEGORIES = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
  Documents: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.csv', '.pptx', '.zip'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov'],
  Audio: ['.mp3', '.wav', '.flac'],
  Applications: ['.exe', '.msi', '.apk']
};

// this function create a window and load the url 
function createWindow() {
  mainWindow = new BrowserWindow({
    // initial size hai user resize kar sakta hai
    width: 800,
    height: 600,
    title: "File Organizer Pro",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),// react se phle preload,js load karo kyonki api use karni hai react men
      nodeIntegration: false,
      contextBridge: true
    }
  });

  // Development mode me Vite server, Build me index.html
  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);
}

function sendLog(msg) {
  if (mainWindow) {
    mainWindow.webContents.send('log-message', msg);
  }
}

//return category
function getCategory(ext) {
  const fileExt = ext.toLowerCase();// to lowercase 
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(fileExt)) return category;
  }
  return 'Others';
}

// return the current date
function getDateFolderName() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getUniqueFilePath(destDir, originalName) {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);
  let targetPath = path.join(destDir, originalName);
  let counter = 1;

  while (fs.existsSync(targetPath)) {
    targetPath = path.join(destDir, `${nameWithoutExt} (${counter})${ext}`);
    counter++;
  }
  return targetPath;
}


function organizeFile(filePath, callback = () => {}) {

  const fileName = path.basename(filePath);
  const ext = path.extname(fileName);

  if (
    fileName.endsWith(".crdownload") ||
    fileName.endsWith(".tmp") ||
    fileName.endsWith(".part") ||
    !ext
  ) {
    return callback(false);
  }

  const categoryFolder = getCategory(ext);
  const dateFolderName = getDateFolderName();
  const targetDir = path.join(downloadsDir, categoryFolder, dateFolderName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const destinationPath = getUniqueFilePath(targetDir, fileName);

  fs.rename(filePath, destinationPath, (err) => {

    if (err) {

      if (err.code === "EBUSY") {

        return setTimeout(() => {
          organizeFile(filePath, callback);
        }, 1000);

      }

      sendLog(`❌ Error moving ${fileName}: ${err.message}`);
      return callback(false);

    }

    sendLog(`✅ Moved: ${fileName} ➜ ${categoryFolder}/${dateFolderName}`);
    callback(true);

  });

}

ipcMain.on("organise-existing-file", () => {

  if (isOrganise) {
    sendLog("⚠️ File organization is already in progress.");
    return;
  }

  isOrganise = true;

  const files = fs.readdirSync(downloadsDir).filter((file) => {
    const filePath = path.join(downloadsDir, file);
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  });

  if (files.length === 0) {
    sendLog("📂 No files found to organize.");
    isOrganise = false;
    mainWindow.webContents.send("organize-complete");
    return;
  }

  sendLog(`📂 Organizing ${files.length} existing files...`);

  let completed = 0;
  let success = 0;
  let failed = 0;

  files.forEach((file) => {

    const filePath = path.join(downloadsDir, file);

    organizeFile(filePath, (ok) => {

      completed++;

      if (ok) {
        success++;
      } else {
        failed++;
      }

      if (completed === files.length) {

        isOrganise = false;

        sendLog(`✅ ${success} files moved`);
        sendLog(`❌ ${failed} files failed`);

        mainWindow.webContents.send("organize-complete");
      }

    });

  });

});;

// IPC Controls (Start / Stop from React UI) create chowkidar object and send the filepath
ipcMain.on('start-organizer', () => {
  if (watcher) return;

  watcher = chokidar.watch(downloadsDir, {
    depth: 0,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 200
    }
  });

  watcher.on('add', (filePath) => {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      organizeFile(filePath);
    }
  });

  sendLog('🚀 Organizer Started watching Downloads folder...');// this send the message to the rect
});

ipcMain.on('stop-organizer', () => {
  if (watcher) {
    watcher.close();
    watcher = null;
    sendLog('🛑 Organizer Stopped.');
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});