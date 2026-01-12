import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface WebViewContainerProps {
  url: string;
  isActive?: boolean;
  className?: string;
  layers?: any[];
}

export function WebViewContainer({ url, isActive = true, className = "", layers = [] }: WebViewContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  // Simple bridge detection
  const ANDROID_BRIDGE = typeof (window as any).Android !== "undefined";

  useEffect(() => {
    setIsLoading(true);
    setError(false);
  }, [url]);

  // Helper: send command to native Android bridge if available
  const sendToAndroid = (method: string, payload?: any) => {
    try {
      if (ANDROID_BRIDGE && (window as any).Android && typeof (window as any).Android[method] === 'function') {
        (window as any).Android[method](payload ? JSON.stringify(payload) : '');
        return true;
      }
    } catch (e) {
      console.warn('Android bridge error', e);
    }
    return false;
  };

  // Handle commands dispatched from parent (BrowserPage) when no native bridge
  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail) return;
      const { cmd, payload } = detail;

      // If Android is available prefer native
      if (ANDROID_BRIDGE) {
        sendToAndroid(cmd, payload);
        return;
      }

      // Otherwise operate on the iframe (fallback)
      if (!iframeRef.current) return;

      try {
        if (cmd === 'navigate') {
          const target = payload?.url || url;
          iframeRef.current.src = target;
        } else if (cmd === 'injectLayers') {
          // Try to postMessage to iframe - assumes fallback page listens
          iframeRef.current.contentWindow?.postMessage({ type: 'injectLayers', layers: payload?.layers || [] }, '*');
        } else if (cmd === 'goBack') {
          iframeRef.current.contentWindow?.postMessage({ type: 'goBack' }, '*');
        } else if (cmd === 'reload') {
          iframeRef.current.contentWindow?.postMessage({ type: 'reload' }, '*');
        } else if (cmd === 'setFallback') {
          // Force fallback to helper page that supports eval
          const target = payload?.fallbackUrl || 'https://goonee.netlify.app';
          const original = payload?.targetUrl ? `?target=${encodeURIComponent(payload.targetUrl)}` : '';
          iframeRef.current.src = `${target}${original}`;
        }
      } catch (e) {
        console.warn('iframe control failed', e);
      }
    };

    window.addEventListener('browser-command', handler as any);
    return () => window.removeEventListener('browser-command', handler as any);
  }, [iframeRef, url, ANDROID_BRIDGE]);

  // When layers change: prefer native injection, otherwise try postMessage; if cross-origin blocks us, fallback to goonee helper
  useEffect(() => {
    if (ANDROID_BRIDGE) {
      sendToAndroid('injectLayers', { layers });
      return;
    }

    if (!iframeRef.current) return;

    const tryInject = () => {
      try {
        // Try direct DOM injection (works for same-origin)
        const doc = iframeRef.current?.contentDocument;
        if (doc) {
          // Remove previously injected
          const existing = doc.querySelectorAll('[data-layer-injected]');
          existing.forEach(el => el.remove());

          layers.filter((l: any) => l.isVisible || l.autoRunOnLoad || l.autoRunOnUrlChange || l.autoRunBackground).forEach((layer: any) => {
            if (layer.type === 'css') {
              const s = doc.createElement('style');
              s.setAttribute('data-layer-injected', String(layer.id));
              s.textContent = layer.content;
              doc.head.appendChild(s);
            } else if (layer.type === 'js' || layer.type === 'bookmarklet') {
              const sc = doc.createElement('script');
              sc.setAttribute('data-layer-injected', String(layer.id));
              sc.textContent = layer.content;
              doc.body.appendChild(sc);
            }
          });
          return;
        }

        // If not same-origin, try postMessage to the page (assuming it listens)
        iframeRef.current.contentWindow?.postMessage({ type: 'injectLayers', layers }, '*');
      } catch (e) {
        // Cross-origin — force fallback to goonee helper page which will accept postMessage or URL param
        console.warn('Cross-origin injection blocked, switching to fallback helper page', e);
        const fallback = `https://goonee.netlify.app?target=${encodeURIComponent(url)}`;
        setIframeSrc(fallback);

        // After a short delay, postMessage layers to helper
        setTimeout(() => {
          try {
            iframeRef.current?.contentWindow?.postMessage({ type: 'injectLayers', layers }, '*');
          } catch (err) {
            console.warn('Failed to postMessage to fallback helper', err);
          }
        }, 800);
      }
    };

    tryInject();
  }, [layers, url, ANDROID_BRIDGE]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  // Ensure URL has protocol
  const validUrl = url.startsWith('http') ? url : `https://${url}`;

  // Initialize iframe src when not running under Android bridge
  useEffect(() => {
    if (!ANDROID_BRIDGE) {
      // If we previously set a specific iframeSrc (fallback), prefer it; otherwise use target URL
      setIframeSrc(prev => prev ?? validUrl);
    }
  }, [validUrl, ANDROID_BRIDGE]);

  return (
    <div className={`relative w-full h-full bg-white overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {error ? (
        <div className="flex items-center justify-center h-full flex-col p-6 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold">Failed to load</h3>
          <p className="text-muted-foreground">{validUrl}</p>
        </div>
      ) : (
        // If Android bridge is present, we render a placeholder surface; native app will open the real WebView(s)
        ANDROID_BRIDGE ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            {/* Native Android bridge detected - WebView is hosted in native activity. */}
            <div className="space-y-2 text-center">
              <div className="text-lg font-medium">Native WebView active</div>
              <div className="text-xs">URL: {validUrl}</div>
            </div>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={iframeSrc ?? validUrl}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title="Web View"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )
      )}

      {/* Overlay for inactive state */}
      {!isActive && (
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      )}
    </div>
  );
}
