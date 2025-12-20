// don't delete

if (typeof window !== 'undefined') {
  // This checks for the specific script tag that loaded this remote
  // It handles the Zephyr URL format safely
  const remoteEntry = document.querySelector('script[src*="/remoteEntry.js"]');
  
  if (remoteEntry) {
    const src = (remoteEntry as HTMLScriptElement).src;
    // Extract the root (e.g. https://...zephyrcloud.app/)
    const path = src.substring(0, src.lastIndexOf('/') + 1);
    
    // Set the global webpack variable
    // @ts-ignore
    __webpack_public_path__ = path;
  }
}

export {};