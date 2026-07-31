const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startOrganizer: () => ipcRenderer.send('start-organizer'),
  stopOrganizer: () => ipcRenderer.send('stop-organizer'),
  organizeExisting : ()=> ipcRenderer.send('organise-existing-file'),
  onOrganizeComplete: (callback) => {
  ipcRenderer.on("organize-complete", () => {
    callback();
  });
},
  onLog: (callback) => ipcRenderer.on('log-message', (event, value) => callback(value))
});