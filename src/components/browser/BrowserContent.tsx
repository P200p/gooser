import { useState, useEffect } from "react";
import { Globe, AlertCircle, Loader2 } from "lucide-react";

interface BrowserContentProps {
  url: string;
  onLoad?: () => void;
}

export const BrowserContent = ({ url, onLoad }: BrowserContentProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
  }, [url]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // For demo purposes, show a placeholder when no valid URL
  if (!url || url === "about:blank") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto">
            <Globe className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Ready to Browse
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter a URL above or use a JavaScript snippet
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-background/30">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      {hasError ? (
        <div className="flex-1 flex flex-col items-center justify-center h-full">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Unable to Load Page
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                The page couldn't be loaded. This may be due to security restrictions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          src={url}
          className="w-full h-full border-0"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Browser Content"
        />
      )}
    </div>
  );
};
