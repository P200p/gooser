import { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Trash2, Code, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleMessage } from "@/types/snippet";

interface ConsoleOutputProps {
  logs: ConsoleMessage[];
  onClear: () => void;
}

export const ConsoleOutput = ({ logs, onClear }: ConsoleOutputProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getLogColor = (type: ConsoleMessage["type"]) => {
    switch (type) {
      case "error":
        return "text-destructive";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-primary";
      default:
        return "text-foreground";
    }
  };

  const getSourceIcon = (source: ConsoleMessage["source"]) => {
    switch (source) {
      case "snippet":
        return <Code className="h-3 w-3 text-primary" aria-label="From snippet" />;
      case "page":
        return <Globe className="h-3 w-3 text-muted-foreground" aria-label="From page" />;
      default:
        return null;
    }
  };

  const getLogPrefix = (type: ConsoleMessage["type"]) => {
    switch (type) {
      case "error":
        return "❌";
      case "warn":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📝";
    }
  };

  return (
    <div className="border-t border-border bg-browser-chrome">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Console Output</span>
          {logs.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Clear console"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="h-32 overflow-y-auto px-4 py-2 bg-background/50 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground italic">
              Console output will appear here...
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={`${log.timestamp.getTime()}-${index}`}
                className={`flex items-start gap-2 ${getLogColor(log.type)} hover:bg-secondary/20 px-2 py-1 rounded`}
              >
                <span className="text-muted-foreground opacity-50 text-[10px] mt-0.5">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                <span className="mt-0.5">{getLogPrefix(log.type)}</span>
                {getSourceIcon(log.source)}
                <div className="flex-1 break-all">
                  {log.snippetId && (
                    <span className="text-xs text-muted-foreground opacity-75 mr-2">
                      [{log.snippetId.slice(0, 8)}...]
                    </span>
                  )}
                  <span>{log.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
