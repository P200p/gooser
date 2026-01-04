import { useState } from "react";
import { Code2, Play, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface SnippetButtonProps {
  id: number;
  name: string;
  code: string;
  onExecute: (code: string) => void;
  onUpdate: (name: string, code: string) => void;
  accentColor?: "primary" | "accent";
}

export const SnippetButton = ({
  id,
  name,
  code,
  onExecute,
  onUpdate,
  accentColor = "primary",
}: SnippetButtonProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editCode, setEditCode] = useState(code);

  const handleSave = () => {
    onUpdate(editName, editCode);
    setIsEditing(false);
  };

  const handleExecute = () => {
    onExecute(code);
  };

  const colorClasses =
    accentColor === "primary"
      ? "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 text-primary"
      : "bg-accent/10 border-accent/30 hover:bg-accent/20 hover:border-accent/50 text-accent";

  const glowClass = accentColor === "primary" ? "snippet-btn-glow" : "";

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handleExecute}
        className={`h-8 px-3 text-xs font-medium border transition-all duration-300 ${colorClasses} ${glowClass}`}
        variant="ghost"
      >
        <Code2 className="h-3.5 w-3.5 mr-1.5" />
        {name}
        <Play className="h-3 w-3 ml-1.5 opacity-60" />
      </Button>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Code2 className="h-5 w-5 text-primary" />
              Edit Snippet #{id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Button Name
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background border-border font-mono text-sm"
                placeholder="Snippet name..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                JavaScript Code
              </label>
              <Textarea
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="bg-background border-border font-mono text-sm min-h-[150px] resize-none"
                placeholder="// Your JavaScript code here..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
