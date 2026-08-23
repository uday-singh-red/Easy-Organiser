const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startOrganizer: () => ipcRenderer.send('start-organizer'),
  stopOrganizer: () => ipcRenderer.send('stop-organizer'),
  getHomeFolders: () => ipcRenderer.invoke("get-home-folders"),
  organizeExisting : ()=> ipcRenderer.send('organise-existing-file'),
  changeFolder: (folderName) =>ipcRenderer.send("change-folder", folderName),
  changeMode: (mode) => ipcRenderer.send("change-mode", mode),
  onOrganizeComplete: (callback) => {ipcRenderer.on("organize-complete", () => { callback();});
},
  onLog: (callback) => ipcRenderer.on('log-message', (event, value) => callback(value))
});