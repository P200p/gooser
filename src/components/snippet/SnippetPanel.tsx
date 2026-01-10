/**
 * SnippetPanel - Main component for snippet management
 * Combines SnippetEditor and SnippetList with import/export functionality
 * Implements requirements 5.1, 5.2, 5.3 for complete snippet management interface
 */

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, FileText, List, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';
import { SnippetEditor } from './SnippetEditor';
import { SnippetList } from './SnippetList';

interface SnippetPanelProps {
  currentUrl?: string;
  onExecute?: (code: string, snippetId?: string) => void;
  onClose?: () => void;
  isVisible?: boolean;
}

export const SnippetPanel: React.FC<SnippetPanelProps> = ({
  currentUrl = '',
  onExecute,
  onClose,
  isVisible = true
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'editor'>('list');
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewSnippet = useCallback(() => {
    setEditingSnippet(null);
    setActiveTab('editor');
  }, []);

  const handleEditSnippet = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet);
    setActiveTab('editor');
  }, []);

  const handleSaveSnippet = useCallback((snippet: Snippet) => {
    // Refresh the list to show updated data
    setRefreshKey(prev => prev + 1);
    // Stay on editor tab after saving
  }, []);

  const handleDeleteSnippet = useCallback((id: string) => {
    // Refresh the list and go back to list view
    setRefreshKey(prev => prev + 1);
    setActiveTab('list');
    setEditingSnippet(null);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingSnippet(null);
    setActiveTab('list');
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSnippets = LocalStorageService.importSnippets(content);
        
        toast.success(`Imported ${importedSnippets.length} snippet(s)`);
        setRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Import failed:', error);
        toast.error('Failed to import snippets. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
        aria-label="Import snippets file"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">Snippet Manager</h1>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'list' | 'editor')}>
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Snippets
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {editingSnippet ? 'Edit' : 'New'} Snippet
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 h-full overflow-auto">
            <TabsContent value="list" className="mt-0 h-full">
              <SnippetList
                key={refreshKey} // Force re-render when snippets change
                currentUrl={currentUrl}
                onEdit={handleEditSnippet}
                onExecute={onExecute}
                onNew={handleNewSnippet}
                onImport={handleImport}
              />
            </TabsContent>

            <TabsContent value="editor" className="mt-0 h-full">
              <SnippetEditor
                snippet={editingSnippet || undefined}
                currentUrl={currentUrl}
                onSave={handleSaveSnippet}
                onDelete={handleDeleteSnippet}
                onExecute={onExecute}
                onClose={handleCloseEditor}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {currentUrl ? `Current: ${new URL(currentUrl).hostname}` : 'No active page'}
          </span>
          <span>
            Snippets are stored locally in your browser
          </span>
        </div>
      </div>
    </div>
  );
};