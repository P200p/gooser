import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WebViewContainer } from "@/components/WebViewContainer";
import { AddressBar } from "@/components/AddressBar";
import { FloatingMenu } from "@/components/FloatingMenu";
import { LayerManager } from "@/components/LayerManager";
import { useLayers } from "@/hooks/use-layers";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

// Initial state for demonstration
const DEFAULT_URL = "https://www.google.com";

export default function BrowserPage() {
  const { i18n } = useTranslation();
  const { data: layers = [] } = useLayers();
  
  const [url1, setUrl1] = useState(DEFAULT_URL);
  const [url2, setUrl2] = useState("https://www.wikipedia.org");
  const [activeTab, setActiveTab] = useState<1 | 2>(1);
  const [isSplit, setIsSplit] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  const [isLayerManagerOpen, setIsLayerManagerOpen] = useState(false);

  // Native bridge detection
  const ANDROID_BRIDGE = typeof (window as any).Android !== "undefined";

  // Toggle Language
  const toggleLanguage = () => {
    const newLang = i18n.language === 'th' ? 'en' : 'th';
    i18n.changeLanguage(newLang);
  };

  const handleToggleSplit = () => {
    if (!isSplit) {
      setIsSplit(true);
      setSplitOrientation('horizontal');
    } else if (splitOrientation === 'horizontal') {
      setSplitOrientation('vertical');
    } else {
      setIsSplit(false);
    }

    // Inform native to toggle split if available
    try {
      if (ANDROID_BRIDGE && (window as any).Android.toggleSplit) {
        (window as any).Android.toggleSplit(JSON.stringify({ isSplit: !isSplit }));
      } else {
        // Emit event to WebViewContainer fallback
        window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'toggleSplit', payload: { isSplit: !isSplit } } }));
      }
    } catch (e) {
      console.warn('toggleSplit bridge error', e);
    }
  };

  const handleNavigate = (newUrl: string) => {
    if (activeTab === 1) setUrl1(newUrl);
    else setUrl2(newUrl);

    const payload = { url: newUrl, tab: activeTab };

    if (ANDROID_BRIDGE && (window as any).Android.navigate) {
      try { (window as any).Android.navigate(JSON.stringify(payload)); } catch (e) { console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'navigate', payload } }));
    }
  };

  const handleBack = () => {
    console.log("Back navigation triggered for tab", activeTab);
    if (ANDROID_BRIDGE && (window as any).Android.goBack) {
      try { (window as any).Android.goBack(JSON.stringify({ tab: activeTab })); } catch (e) { console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'goBack', payload: { tab: activeTab } } }));
    }
  };

  const handleReload = () => {
    if (ANDROID_BRIDGE && (window as any).Android.reload) {
      try { (window as any).Android.reload(JSON.stringify({ tab: activeTab })); } catch (e) { console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'reload', payload: { tab: activeTab } } }));
    }
  };

  // When layers change from server, push to native or fallback
  useEffect(() => {
    const payload = { layers };
    if (ANDROID_BRIDGE && (window as any).Android.injectLayers) {
      try { (window as any).Android.injectLayers(JSON.stringify(payload)); } catch (e) { console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'injectLayers', payload } }));
    }
  }, [layers, activeTab]);

  // If cross-origin issues arise, fallback helper page
  const setFallbackHelper = (targetUrl?: string) => {
    const payload = { fallbackUrl: 'https://goonee.netlify.app', targetUrl };
    if (ANDROID_BRIDGE && (window as any).Android.setFallback) {
      try { (window as any).Android.setFallback(JSON.stringify(payload)); } catch (e) { console.warn(e); }
    } else {
      window.dispatchEvent(new CustomEvent('browser-command', { detail: { cmd: 'setFallback', payload } }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation Bar */}
      <AddressBar 
        url={activeTab === 1 ? url1 : url2} 
        onNavigate={handleNavigate}
        onBack={handleBack}
        onReload={handleReload}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isSplit ? (
          <ResizablePanelGroup direction={splitOrientation} className="h-full">
            <ResizablePanel defaultSize={50} minSize={30}>
              <div 
                className={`h-full border-r border-b border-border transition-all ${activeTab === 1 ? 'ring-2 ring-primary ring-inset' : 'opacity-80 hover:opacity-100'}`}
                onClick={() => setActiveTab(1)}
              >
                <WebViewContainer url={url1} isActive={activeTab === 1} layers={layers} />
              </div>
            </ResizablePanel>
            
            <ResizableHandle withHandle />
            
            <ResizablePanel defaultSize={50} minSize={30}>
              <div 
                className={`h-full transition-all ${activeTab === 2 ? 'ring-2 ring-primary ring-inset' : 'opacity-80 hover:opacity-100'}`}
                onClick={() => setActiveTab(2)}
              >
                <WebViewContainer url={url2} isActive={activeTab === 2} layers={layers} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <WebViewContainer url={url1} isActive={true} layers={layers} />
        )}
      </div>

      {/* Floating Action Button & Menu */}
      <FloatingMenu 
        onOpenLayers={() => setIsLayerManagerOpen(true)}
        onToggleSplit={handleToggleSplit}
        isSplit={isSplit}
        splitOrientation={splitOrientation}
        onLanguageChange={toggleLanguage}
      />

      {/* Layer Management Sheet */}
      <LayerManager 
        open={isLayerManagerOpen} 
        onOpenChange={setIsLayerManagerOpen} 
      />
    </div>
  );
}
