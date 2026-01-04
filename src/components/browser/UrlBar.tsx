import { useState, KeyboardEvent } from "react";
import { Lock, Globe } from "lucide-react";

interface UrlBarProps {
  url: string;
  onNavigate: (url: string) => void;
}

export const UrlBar = ({ url, onNavigate }: UrlBarProps) => {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = url.startsWith("https://");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let newUrl = inputValue.trim();
      if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
        newUrl = "https://" + newUrl;
      }
      onNavigate(newUrl);
    }
  };

  return (
    <div
      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-browser-urlbar border transition-all duration-200 ${
        isFocused
          ? "border-primary/50 glow-primary"
          : "border-border/50 hover:border-border"
      }`}
    >
      {isSecure ? (
        <Lock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
      ) : (
        <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      )}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
        placeholder="Enter URL..."
      />
    </div>
  );
};
