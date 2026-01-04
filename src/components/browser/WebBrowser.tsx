import { useState, useCallback } from "react";
import { BrowserControls } from "./BrowserControls";
import { UrlBar } from "./UrlBar";
import { SnippetButton } from "./SnippetButton";
import { BrowserContent } from "./BrowserContent";
import { ConsoleOutput } from "./ConsoleOutput";
import { toast } from "sonner";

interface Snippet {
  id: number;
  name: string;
  code: string;
}

interface ConsoleLog {
  id: number;
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: Date;
}

const DEFAULT_SNIPPETS: Snippet[] = [
  {
    id: 1,
    name: "Alert Hello",
    code: 'alert("Hello from Snippet 1!");',
  },
  {
    id: 2,
    name: "Log Info",
    code: 'console.log("Snippet 2 executed at " + new Date().toLocaleTimeString());',
  },
];

export const WebBrowser = () => {
  const [url, setUrl] = useState("about:blank");
  const [history, setHistory] = useState<string[]>(["about:blank"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [snippets, setSnippets] = useState<Snippet[]>(DEFAULT_SNIPPETS);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [logIdCounter, setLogIdCounter] = useState(0);

  const addLog = useCallback(
    (type: ConsoleLog["type"], message: string) => {
      setConsoleLogs((prev) => [
        ...prev,
        {
          id: logIdCounter,
          type,
          message,
          timestamp: new Date(),
        },
      ]);
      setLogIdCounter((prev) => prev + 1);
    },
    [logIdCounter]
  );

  const handleNavigate = (newUrl: string) => {
    setUrl(newUrl);
    const newHistory = [...history.slice(0, historyIndex + 1), newUrl];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    addLog("info", `Navigating to: ${newUrl}`);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      addLog("info", `Back to: ${history[newIndex]}`);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUrl(history[newIndex]);
      addLog("info", `Forward to: ${history[newIndex]}`);
    }
  };

  const handleRefresh = () => {
    const currentUrl = url;
    setUrl("about:blank");
    setTimeout(() => setUrl(currentUrl), 100);
    addLog("info", "Page refreshed");
    toast.success("Page refreshed");
  };

  const handleHome = () => {
    handleNavigate("about:blank");
  };

  const handleExecuteSnippet = (code: string) => {
    try {
      // Override console methods to capture output
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

      // Execute the code
      const result = eval(code);
      
      if (result !== undefined) {
        addLog("log", `Result: ${String(result)}`);
      }

      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;

      toast.success("Snippet executed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog("error", `Error: ${errorMessage}`);
      toast.error("Snippet execution failed");
    }
  };

  const handleUpdateSnippet = (id: number, name: string, code: string) => {
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, code } : s))
    );
    toast.success("Snippet updated");
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
              onExecute={handleExecuteSnippet}
              onUpdate={(name, code) => handleUpdateSnippet(snippet.id, name, code)}
              accentColor={index === 0 ? "primary" : "accent"}
            />
          ))}
        </div>
      </div>

      {/* Browser Content */}
      <BrowserContent url={url} />

      {/* Console */}
      <ConsoleOutput logs={consoleLogs} onClear={handleClearConsole} />
    </div>
  );
};
