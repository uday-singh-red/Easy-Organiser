const { app, BrowserWindow, ipcMain } = require('electron');// electron require some methods for operations

const { getProcesses } = require("./services/processManager.js");


const os = require("os");
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

let mainWindow;// ak variable declare hua ha bs

let watcher = null;
let isOrganise = false;



const HOME = os.homedir();

function getHomeFolders() {

  const commonFolders = [
    "Desktop",
    "Downloads",
    "Documents",
    "Pictures",
    "Videos",
    "Music"
  ];

  return commonFolders
    .map((folder) => ({
      name: folder,
      path: path.join(HOME, folder)
    }))
    .filter((folder) => fs.existsSync(folder.path));

}

let currentFolder = path.join(HOME, "Downloads");
let organizeMode = "category"; // category | date

const CATEGORIES = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico'],
  Documents: ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.csv', '.pptx', '.zip'],
  Videos: ['.mp4', '.mkv', '.avi', '.mov'],
  Audio: ['.mp3', '.wav', '.flac'],
  Applications: ['.exe', '.msi', '.apk']
};

// this function create a window and load the url 
function createWindow() {
  console.log("MAIN PROCESS STARTED");
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

    let targetDir;

    if (organizeMode === "date") {
      targetDir = path.join(
        currentFolder,
        categoryFolder,
        getDateFolderName()
      );
    } else {
      targetDir = path.join(
        currentFolder,
        categoryFolder
      );
    }

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

    sendLog(`✅ Moved: ${fileName} ➜ ${targetDir}`);
    callback(true);

  });

}

ipcMain.handle("get-home-folders", () => {
  return getHomeFolders();
});

ipcMain.handle("get-processes", async () => {
  try {
    const processes = await getProcesses();

    console.log("Processes found:", processes.length);

    return processes;
  } catch (error) {
    console.error("Failed to get processes:", error);
    return [];
  }
});
ipcMain.on("change-folder", (event, folderPath) => {

    if (!fs.existsSync(folderPath)) {
        sendLog("❌ Invalid folder.");
        return;
    }

    currentFolder = folderPath;

    sendLog(`📂 Folder changed to ${path.basename(folderPath)}`);

    if (watcher) {
        watcher.close();
        watcher = null;

        startWatcher();

        sendLog("👀 Watching new folder...");
    }

});

ipcMain.on("change-mode", (event, mode) => {

  organizeMode = mode;

  sendLog(`📂 Organize Mode changed to ${mode}`);

});

ipcMain.on("organise-existing-file", () => {

  if (isOrganise) {
    sendLog("⚠️ File organization is already in progress.");
    return;
  }
  console.log('start in function')

  isOrganise = true;

  const files = fs.readdirSync(currentFolder).filter((file) => {
    console.log('in filtering process')
    if (file === "desktop.ini") return false;
    const filePath = path.join(currentFolder, file);
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

  files.forEach((file,index) => {

    console.log('in for each loop')
    

    const filePath = path.join(currentFolder, file);

    console.log('filepath :',filePath)
   

    organizeFile(filePath, (ok) => {
       console.log(file, ok ? "SUCCESS" : "FAILED");

      completed++;

      if (ok) {
        success++;
      } else {
        failed++;
      }

      if (completed === files.length) {
        isOrganise = false;
        if(success>0){
          sendLog(`✅ ${success} files moved`);
        }
        if(failed>0){
          sendLog(`❌ ${failed} files failed`);
        }
        
        mainWindow.webContents.send("organize-complete");
      }

    });

  });

});;

function startWatcher() {
    watcher = chokidar.watch(currentFolder, {
        depth: 0,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 200
        }
    });

    watcher.on("add", (filePath) => {
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            organizeFile(filePath);
        }
    });
}

// IPC Controls (Start / Stop from React UI) create chowkidar object and send the filepath
ipcMain.on('start-organizer', () => {
  if (watcher) return;

 startWatcher();

  sendLog(`🚀 Watching ${path.basename(currentFolder)} folder...`);// this send the message to the rect
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