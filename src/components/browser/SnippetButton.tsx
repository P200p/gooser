import { useState, useEffect } from "react";
import { Code2, Play, Settings, Zap } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AutoRunSettings {
  enabled: boolean;
  onLoad: boolean;
  onUrlChange: boolean;
  urlPattern: string;
}

interface SnippetButtonProps {
  id: number;
  name: string;
  code: string;
  autoRun: AutoRunSettings;
  onExecute: (code: string) => void;
  onUpdate: (name: string, code: string, autoRun: AutoRunSettings) => void;
  accentColor?: "primary" | "accent";
}

export const SnippetButton = ({
  id,
  name,
  code,
  autoRun,
  onExecute,
  onUpdate,
  accentColor = "primary",
}: SnippetButtonProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editCode, setEditCode] = useState(code);
  const [editAutoRun, setEditAutoRun] = useState<AutoRunSettings>(autoRun);

  useEffect(() => {
    setEditName(name);
    setEditCode(code);
    setEditAutoRun(autoRun);
  }, [name, code, autoRun]);

  const handleSave = () => {
    onUpdate(editName, editCode, editAutoRun);
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
        {autoRun.enabled && (
          <Zap className="h-3 w-3 ml-1 text-yellow-500 fill-yellow-500" />
        )}
        <Play className="h-3 w-3 ml-1.5 opacity-60" />
      </Button>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="ตั้งค่า"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Code2 className="h-5 w-5 text-primary" />
              ตั้งค่า Snippet #{id}
              {autoRun.enabled && (
                <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500/50">
                  <Zap className="h-3 w-3 mr-1 fill-yellow-500" />
                  Auto
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                ชื่อปุ่ม
              </label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background border-border font-mono text-sm"
                placeholder="ชื่อ Snippet..."
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                โค้ด JavaScript
              </label>
              <Textarea
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="bg-background border-border font-mono text-sm min-h-[120px] resize-none"
                placeholder="// โค้ด JavaScript ของคุณ..."
              />
            </div>

            {/* Auto-run Settings */}
            <div className="border border-border rounded-lg p-4 space-y-4 bg-secondary/20">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={`auto-run-${id}`} className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    รันอัตโนมัติ
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    รันโค้ดนี้โดยอัตโนมัติตามเงื่อนไขที่กำหนด
                  </p>
                </div>
                <Switch
                  id={`auto-run-${id}`}
                  checked={editAutoRun.enabled}
                  onCheckedChange={(checked) =>
                    setEditAutoRun((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>

              {editAutoRun.enabled && (
                <div className="space-y-4 pt-2 border-t border-border/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`on-load-${id}`} className="text-sm">
                        รันตอนโหลดหน้า
                      </Label>
                      <Switch
                        id={`on-load-${id}`}
                        checked={editAutoRun.onLoad}
                        onCheckedChange={(checked) =>
                          setEditAutoRun((prev) => ({ ...prev, onLoad: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`on-url-${id}`} className="text-sm">
                        รันเมื่อ URL เปลี่ยน
                      </Label>
                      <Switch
                        id={`on-url-${id}`}
                        checked={editAutoRun.onUrlChange}
                        onCheckedChange={(checked) =>
                          setEditAutoRun((prev) => ({ ...prev, onUrlChange: checked }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      URL Pattern
                    </label>
                    <Input
                      value={editAutoRun.urlPattern}
                      onChange={(e) =>
                        setEditAutoRun((prev) => ({ ...prev, urlPattern: e.target.value }))
                      }
                      className="bg-background border-border font-mono text-sm"
                      placeholder="* (ทุกเว็บ)"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      ตัวอย่าง: <code className="text-primary">*</code> (ทุกเว็บ), <code className="text-primary">youtube.com</code>, <code className="text-primary">*.pinterest.com</code>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="text-muted-foreground"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSave}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
