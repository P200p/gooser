import { useState, useCallback, useEffect, useRef } from "react";
import { BrowserControls } from "./BrowserControls";
import { UrlBar } from "./UrlBar";
import { SnippetButton, AutoRunSettings } from "./SnippetButton";
import { BrowserContent } from "./BrowserContent";
import { ConsoleOutput } from "./ConsoleOutput";
import { toast } from "sonner";

interface Snippet {
  id: number;
  name: string;
  code: string;
  autoRun: AutoRunSettings;
}

interface ConsoleLog {
  id: number;
  type: "log" | "error" | "warn" | "info" | "auto";
  message: string;
  timestamp: Date;
}

const STORAGE_KEY = "devbrowser-snippets";

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 1,
    name: "Alert Hello",
    code: 'alert("สวัสดี จาก Snippet 1!");',
    autoRun: {
      enabled: false,
      onLoad: true,
      onUrlChange: false,
      urlPattern: "*",
      background: false,
      backgroundInterval: 1000,
    },
  },
  {
    id: 2,
    name: "Log Info",
    code: 'console.log("Snippet 2 ทำงานเมื่อ " + new Date().toLocaleTimeString());',
    autoRun: {
      enabled: false,
      onLoad: false,
      onUrlChange: true,
      urlPattern: "*",
      background: false,
      backgroundInterval: 1000,
    },
  },
];

const loadSnippetsFromStorage = (): Snippet[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load snippets from storage:", e);
  }
  return DEFAULT_SNIPPETS;
};

const saveSnippetsToStorage = (snippets: Snippet[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  } catch (e) {
    console.error("Failed to save snippets to storage:", e);
  }
};

const matchUrlPattern = (url: string, pattern: string): boolean => {
  if (!pattern || pattern === "*") return true;
  
  try {
    // Remove protocol for comparison
    const cleanUrl = url.replace(/^https?:\/\//, "").toLowerCase();
    const cleanPattern = pattern.replace(/^https?:\/\//, "").toLowerCase();
    
    // Handle wildcard patterns like *.example.com
    if (cleanPattern.startsWith("*.")) {
      const domain = cleanPattern.slice(2);
      return cleanUrl.includes(domain);
    }
    
    // Simple contains check
    return cleanUrl.includes(cleanPattern);
  } catch {
    return false;
  }
};

export const WebBrowser = () => {
  const [url, setUrl] = useState("about:blank");
  const [history, setHistory] = useState<string[]>(["about:blank"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [snippets, setSnippets] = useState<Snippet[]>(loadSnippetsFromStorage);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [logIdCounter, setLogIdCounter] = useState(0);
  const [pageLoaded, setPageLoaded] = useState(false);
  const prevUrlRef = useRef<string>("about:blank");
  const initialLoadDoneRef = useRef(false);

  // Save snippets to localStorage whenever they change
  useEffect(() => {
    saveSnippetsToStorage(snippets);
  }, [snippets]);

  const addLog = useCallback(
    (type: ConsoleLog["type"], message: string) => {
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          type,
          message,
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  const executeSnippetInternal = useCallback(
    (code: string, isAutoRun: boolean = false) => {
      try {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
          addLog("log", args.map(String).join(" "));
          originalLog.apply(console, args);
        };
        console.error = (...args) => {
          addLog("error", args.map(String).join(" "));
          originalError.apply(console, args);
        };
        console.warn = (...args) => {
          addLog("warn", args.map(String).join(" "));
          originalWarn.apply(console, args);
        };

        const result = eval(code);

        if (result !== undefined) {
          addLog("log", `ผลลัพธ์: ${String(result)}`);
        }

        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;

        if (!isAutoRun) {
          toast.success("รัน Snippet สำเร็จ");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        addLog("error", `ข้อผิดพลาด: ${errorMessage}`);
        if (!isAutoRun) {
          toast.error("รัน Snippet ล้มเหลว");
        }
      }
    },
    [addLog]
  );

  // Auto-run on page load
  useEffect(() => {
    if (pageLoaded && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      snippets.forEach((snippet) => {
        if (
          snippet.autoRun.enabled &&
          snippet.autoRun.onLoad &&
          !snippet.autoRun.background &&
          matchUrlPattern(url, snippet.autoRun.urlPattern)
        ) {
          addLog("auto", `⚡ รันอัตโนมัติ: ${snippet.name} (โหลดหน้า)`);
          executeSnippetInternal(snippet.code, true);
        }
      });
    }
  }, [pageLoaded, snippets, url, addLog, executeSnippetInternal]);

  // Auto-run on URL change
  useEffect(() => {
    if (prevUrlRef.current !== url && initialLoadDoneRef.current) {
      snippets.forEach((snippet) => {
        if (
          snippet.autoRun.enabled &&
          snippet.autoRun.onUrlChange &&
          !snippet.autoRun.background &&
          matchUrlPattern(url, snippet.autoRun.urlPattern)
        ) {
          addLog("auto", `⚡ รันอัตโนมัติ: ${snippet.name} (URL เปลี่ยน)`);
          executeSnippetInternal(snippet.code, true);
        }
      });
    }
    prevUrlRef.current = url;
  }, [url, snippets, addLog, executeSnippetInternal]);

  // Background script runner
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    
    snippets.forEach((snippet) => {
      if (
        snippet.autoRun.enabled &&
        snippet.autoRun.background &&
        matchUrlPattern(url, snippet.autoRun.urlPattern)
      ) {
        // Log only once when starting
        addLog("auto", `🔄 เริ่ม Background: ${snippet.name} (ทุก ${snippet.autoRun.backgroundInterval}ms)`);
        
        const intervalId = setInterval(() => {
          if (matchUrlPattern(url, snippet.autoRun.urlPattern)) {
            executeSnippetInternal(snippet.code, true);
          }
        }, snippet.autoRun.backgroundInterval);
        
        intervals.push(intervalId);
      }
    });

    return () => {
      intervals.forEach((id) => clearInterval(id));
    };
  }, [url, snippets, addLog, executeSnippetInternal]);

  const handleNavigate = (newUrl: string) => {
    setPageLoaded(false);
    setUrl(newUrl);
    const newHistory = [...history.slice(0, historyIndex + 1), newUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    addLog("info", `กำลังไปที่: ${newUrl}`);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setPageLoaded(false);
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      addLog("info", `กลับไปที่: ${history[newIndex]}`);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setPageLoaded(false);
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      addLog("info", `ไปข้างหน้าที่: ${history[newIndex]}`);
    }
  };

  const handleRefresh = () => {
    const currentUrl = url;
    setPageLoaded(false);
    initialLoadDoneRef.current = false;
    setUrl("about:blank");
    setTimeout(() => setUrl(currentUrl), 100);
    addLog("info", "รีเฟรชหน้า");
    toast.success("รีเฟรชหน้าแล้ว");
  };

  const handleHome = () => {
    handleNavigate("about:blank");
  };

  const handlePageLoad = () => {
    setPageLoaded(true);
  };

  const handleExecuteSnippet = (code: string) => {
    executeSnippetInternal(code, false);
  };

  const handleUpdateSnippet = (
    id: number,
    name: string,
    code: string,
    autoRun: AutoRunSettings
  ) => {
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, code, autoRun } : s))
    );
    toast.success("บันทึก Snippet แล้ว");
  };

  const handleClearConsole = () => {
    setConsoleLogs([]);
  };

  return (
    <div className="flex flex-col h-screen bg-browser-chrome">
      {/* Title Bar */}
      <div className="flex items-center justify-center py-2 bg-browser-chrome border-b border-border/30">
        <div className="flex items-center gap-1.5 absolute left-4">
          <div className="w-3 h-3 rounded-full bg-destructive/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          DevBrowser
        </span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-browser-toolbar border-b border-border/50">
        <BrowserControls
          onBack={handleBack}
          onForward={handleForward}
          onRefresh={handleRefresh}
          onHome={handleHome}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
        />

        <UrlBar url={url} onNavigate={handleNavigate} />

        {/* Snippet Buttons */}
        <div className="flex items-center gap-2 pl-2 border-l border-border/50">
          {snippets.map((snippet, index) => (
            <SnippetButton
              key={snippet.id}
              id={snippet.id}
              name={snippet.name}
              code={snippet.code}
              autoRun={snippet.autoRun}
              onExecute={handleExecuteSnippet}
              onUpdate={(name, code, autoRun) =>
                handleUpdateSnippet(snippet.id, name, code, autoRun)
              }
              accentColor={index === 0 ? "primary" : "accent"}
            />
          ))}
        </div>
      </div>

      {/* Browser Content */}
      <BrowserContent url={url} onLoad={handlePageLoad} />

      {/* Console */}
      <ConsoleOutput logs={consoleLogs} onClear={handleClearConsole} />
    </div>
  );
};
