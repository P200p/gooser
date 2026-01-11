// ...existing code...

// src/bridge/nativeHost.ts
// Lightweight adapter to forward messages from the web UI to a native host (Android WebView's JavascriptInterface)
// - If running inside Android WebView with a `Android` interface, it will call Android.postMessage(json)
// - Otherwise it falls back to window.postMessage for normal web environment

type HostPayload = Record<string, unknown>;

function isAndroidBridgePresent(): boolean {
  // 'Android' is the conventional name for addJavascriptInterface on Android side
  // Some hosts may expose different global names; adjust if needed
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return typeof (window as any).Android?.postMessage === 'function' || typeof (window as any).androidHost?.postMessage === 'function';
}

export const nativeHost = {
  postMessage(payload: HostPayload) {
    const json = JSON.stringify(payload);
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if ((window as any).Android && typeof (window as any).Android.postMessage === 'function') {
        // Some Android bridges expect a string payload
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (window as any).Android.postMessage(json);
        return;
      }

      // Alternate name
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if ((window as any).androidHost && typeof (window as any).androidHost.postMessage === 'function') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        (window as any).androidHost.postMessage(json);
        return;
      }

      // Fallback to window.postMessage for normal web environment
      window.postMessage(payload, '*');
    } catch (e) {
      // swallow errors in bridge to avoid breaking UI
      // eslint-disable-next-line no-console
      console.warn('nativeHost.postMessage failed', e);
    }
  },

  isAvailable(): boolean {
    return isAndroidBridgePresent();
  },
};

// Also forward window.postMessage events to Android bridge if present
window.addEventListener('message', (ev) => {
  try {
    if (!isAndroidBridgePresent()) return;
    const data = ev.data;
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if ((window as any).Android && typeof (window as any).Android.postMessage === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (window as any).Android.postMessage(json);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if ((window as any).androidHost && typeof (window as any).androidHost.postMessage === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (window as any).androidHost.postMessage(json);
    }
  } catch (e) {
    // ignore
  }
});

// Expose a friendly global for the app
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.gooser = window.gooser || {};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.gooser.nativeHost = nativeHost;

// ...existing code...
