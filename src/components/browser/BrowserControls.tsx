import { ArrowLeft, ArrowRight, RotateCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrowserControlsProps {
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

export const BrowserControls = ({
  onBack,
  onForward,
  onRefresh,
  onHome,
  canGoBack,
  canGoForward,
}: BrowserControlsProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        disabled={!canGoBack}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onForward}
        disabled={!canGoForward}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <RotateCw className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onHome}
        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      >
        <Home className="h-4 w-4" />
      </Button>
    </div>
  );
};
