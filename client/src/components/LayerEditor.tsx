import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCreateLayer, useUpdateLayer } from "@/hooks/use-layers";
import { type Layer } from "@shared/schema";
import Editor from "@monaco-editor/react";
import { Loader2 } from "lucide-react";

interface LayerEditorProps {
  layer?: Layer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LayerEditor({ layer, open, onOpenChange }: LayerEditorProps) {
  const { t } = useTranslation();
  const createLayer = useCreateLayer();
  const updateLayer = useUpdateLayer();
  
  const [name, setName] = useState("");
  const [type, setType] = useState<"js" | "css" | "bookmarklet">("js");
  const [content, setContent] = useState("");
  const [autoRunBackground, setAutoRunBackground] = useState(false);
  const [autoRunOnLoad, setAutoRunOnLoad] = useState(false);
  const [autoRunOnUrlChange, setAutoRunOnUrlChange] = useState(false);

  // Reset form when opening/changing layer
  useEffect(() => {
    if (layer) {
      setName(layer.name);
      setType(layer.type as any);
      setContent(layer.content);
      setAutoRunBackground(layer.autoRunBackground || false);
      setAutoRunOnLoad(layer.autoRunOnLoad || false);
      setAutoRunOnUrlChange(layer.autoRunOnUrlChange || false);
    } else {
      setName("");
      setType("js");
      setContent("");
      setAutoRunBackground(false);
      setAutoRunOnLoad(false);
      setAutoRunOnUrlChange(false);
    }
  }, [layer, open]);

  const handleSave = async () => {
    try {
      if (layer) {
        await updateLayer.mutateAsync({ 
          id: layer.id, 
          name, 
          type, 
          content,
          autoRunBackground,
          autoRunOnLoad,
          autoRunOnUrlChange
        });
      } else {
        await createLayer.mutateAsync({ 
          name, 
          type, 
          content, 
          isVisible: true, 
          isLocked: false, 
          showOnFab: false, 
          sortOrder: 0,
          autoRunBackground,
          autoRunOnLoad,
          autoRunOnUrlChange
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save layer", error);
    }
  };

  const isPending = createLayer.isPending || updateLayer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col glass-panel border-none">
        <DialogHeader>
          <DialogTitle>{layer ? t('edit_layer') : t('new_layer')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('layer_name')}</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="My Custom Layer"
              className="bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('layer_type')}</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="js">{t('code_js')}</SelectItem>
                <SelectItem value="css">{t('code_css')}</SelectItem>
                <SelectItem value="bookmarklet">{t('bookmarklet')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="bg" 
              checked={autoRunBackground} 
              onChange={(e) => setAutoRunBackground(e.target.checked)} 
            />
            <Label htmlFor="bg">{t('auto_run_bg') || 'รันพื้นหลัง'}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="load" 
              checked={autoRunOnLoad} 
              onChange={(e) => setAutoRunOnLoad(e.target.checked)} 
            />
            <Label htmlFor="load">{t('auto_run_load') || 'รันตอนโหลด'}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="url" 
              checked={autoRunOnUrlChange} 
              onChange={(e) => setAutoRunOnUrlChange(e.target.checked)} 
            />
            <Label htmlFor="url">{t('auto_run_url') || 'รันเมื่อเปลี่ยน URL'}</Label>
          </div>
        </div>

        <div className="flex-1 min-h-0 border rounded-md overflow-hidden mt-4">
          <Editor
            height="100%"
            defaultLanguage={type === "css" ? "css" : "javascript"}
            language={type === "css" ? "css" : "javascript"}
            value={content}
            onChange={(value) => setContent(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 16 },
            }}
          />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name} className="bg-primary hover:bg-primary/90 text-white">
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
