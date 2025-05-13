// src/myWorker.js
self.onmessage = (e) => {
    const result = e.data * 2;
    self.postMessage(result);
  };
  