import { useState } from "react";
import { Terminal, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConsoleLog {
  id: number;
  type: "log" | "error" | "warn" | "info" | "auto";
  message: string;
  timestamp: Date;
}

interface ConsoleOutputProps {
  logs: ConsoleLog[];
  onClear: () => void;
}

export const ConsoleOutput = ({ logs, onClear }: ConsoleOutputProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getLogColor = (type: ConsoleLog["type"]) => {
    switch (type) {
      case "error":
        return "text-destructive";
      case "warn":
        return "text-yellow-500";
      case "info":
        return "text-primary";
      case "auto":
        return "text-yellow-500";
      default:
        return "text-foreground";
    }
  };

  const getLogPrefix = (type: ConsoleLog["type"]) => {
    if (type === "auto") return "⚡";
    return null;
  };

  return (
    <div className="border-t border-border bg-browser-chrome">
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">คอนโซล</span>
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
            title="ล้างคอนโซล"
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
              ผลลัพธ์จะแสดงที่นี่...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 ${getLogColor(log.type)}`}
              >
                <span className="text-muted-foreground opacity-50">
                  {log.timestamp.toLocaleTimeString()}
                </span>
                {getLogPrefix(log.type) && (
                  <span>{getLogPrefix(log.type)}</span>
                )}
                <span className="flex-1 break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
