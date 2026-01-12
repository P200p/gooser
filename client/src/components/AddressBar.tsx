import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCw, Search } from "lucide-react";

interface AddressBarProps {
  url: string;
  onNavigate: (url: string) => void;
  onBack?: () => void;
  onForward?: () => void;
  onReload?: () => void;
}

export function AddressBar({ url, onNavigate, onBack, onForward, onReload }: AddressBarProps) {
  const { t } = useTranslation();
  const [inputUrl, setInputUrl] = useState(url);

  useEffect(() => {
    setInputUrl(url);
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl) {
      let finalUrl = inputUrl;
      // Basic URL formatting
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        // If it looks like a domain, add https://, otherwise treat as search
        if (inputUrl.includes('.') && !inputUrl.includes(' ')) {
          finalUrl = `https://${inputUrl}`;
        } else {
          finalUrl = `https://www.google.com/search?q=${encodeURIComponent(inputUrl)}`;
        }
      }
      onNavigate(finalUrl);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card/50 backdrop-blur-md border-b border-border/50 shadow-sm sticky top-0 z-40">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBack} title={t('back')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onForward} title={t('forward')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onReload} title={t('reload')}>
          <RotateCw className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder={t('url_placeholder')}
          className="pl-9 h-10 rounded-full bg-background/80 border-border/50 focus:ring-primary/20 transition-all font-mono text-sm shadow-inner"
        />
      </form>
    </div>
  );
}
