import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLayers, useUpdateLayer, useDeleteLayer } from "@/hooks/use-layers";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit,
  Code2,
  FileCode,
  Bookmark
} from "lucide-react";
import { LayerEditor } from "./LayerEditor";
import { type Layer } from "@shared/schema";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Sortable Item Component
function SortableLayerItem({ layer, onEdit, onDelete, onToggleVisible, onToggleLock }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const Icon = layer.type === 'js' ? Code2 : layer.type === 'css' ? FileCode : Bookmark;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`
        relative flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm
        hover:border-primary/50 hover:shadow-md transition-all group
        ${isDragging ? 'opacity-50 shadow-xl ring-2 ring-primary scale-105' : ''}
      `}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="w-5 h-5" />
      </div>

      <div className={`p-2 rounded-lg ${layer.isVisible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{layer.name}</h4>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{layer.type}</p>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onToggleVisible(layer)}>
          {layer.isVisible ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onToggleLock(layer)}>
          {layer.isLocked ? <Lock className="w-4 h-4 text-orange-500" /> : <Unlock className="w-4 h-4 text-muted-foreground" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(layer)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(layer.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

interface LayerManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LayerManager({ open, onOpenChange }: LayerManagerProps) {
  const { t } = useTranslation();
  const { data: layers = [], isLoading } = useLayers();
  const updateLayer = useUpdateLayer();
  const deleteLayer = useDeleteLayer();
  
  const [editingLayer, setEditingLayer] = useState<Layer | undefined>(undefined);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // In a real app, we would calculate new sort orders and update all affected items
      // For this demo, we'll just optimistically update local state or rely on backend
      console.log('Reordered', active.id, 'to', over.id);
    }
  };

  const handleToggleVisible = (layer: Layer) => {
    updateLayer.mutate({ id: layer.id, isVisible: !layer.isVisible });
  };

  const handleToggleLock = (layer: Layer) => {
    updateLayer.mutate({ id: layer.id, isLocked: !layer.isLocked });
  };

  const handleCreate = () => {
    setEditingLayer(undefined);
    setIsEditorOpen(true);
  };

  const handleEdit = (layer: Layer) => {
    setEditingLayer(layer);
    setIsEditorOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm(t('confirm_delete'))) {
      deleteLayer.mutate(id);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0 bg-background/95 backdrop-blur-md">
          <div className="p-6 border-b border-border/50">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-2xl font-display">{t('layers')}</SheetTitle>
              <SheetDescription>Manage your scripts, styles, and tools.</SheetDescription>
            </SheetHeader>
            <Button onClick={handleCreate} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_layer')}
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
              </div>
            ) : layers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/20">
                <Code2 className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('no_layers')}</p>
              </div>
            ) : (
              <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={layers.map(l => l.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {layers.map(layer => (
                      <SortableLayerItem
                        key={layer.id}
                        layer={layer}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onToggleVisible={handleToggleVisible}
                        onToggleLock={handleToggleLock}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <LayerEditor 
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen}
        layer={editingLayer}
      />
    </>
  );
}
