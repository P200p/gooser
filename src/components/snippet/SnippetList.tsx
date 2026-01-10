/**
 * SnippetList component for displaying and managing saved snippets
 * Implements requirements 5.2, 5.3 for snippet organization and management
 */

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Search, 
  Play, 
  Edit, 
  Trash2, 
  Plus,
  Download,
  Upload,
  Filter,
  Clock,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';
import { matchUrlPattern } from '@/utils/urlPatterns';

interface SnippetListProps {
  currentUrl?: string;
  onEdit?: (snippet: Snippet) => void;
  onExecute?: (code: string, snippetId: string) => void;
  onNew?: () => void;
  onImport?: () => void;
}

export const SnippetList: React.FC<SnippetListProps> = ({
  currentUrl = '',
  onEdit,
  onExecute,
  onNew,
  onImport
}) => {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMatching, setShowOnlyMatching] = useState(false);
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false);

  // Load snippets from storage
  const loadSnippets = useCallback(() => {
    try {
      const loadedSnippets = LocalStorageService.getSnippets();
      setSnippets(loadedSnippets);
    } catch (error) {
      console.error('Failed to load snippets:', error);
      toast.error('Failed to load snippets');
    }
  }, []);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  // Filter snippets based on search and filters
  const filteredSnippets = snippets.filter(snippet => {
    // Search filter
    if (searchTerm && !snippet.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !snippet.code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // URL matching filter
    if (showOnlyMatching && currentUrl && !matchUrlPattern(currentUrl, snippet.urlPattern)) {
      return false;
    }

    // Enabled filter
    if (showOnlyEnabled && !snippet.enabled) {
      return false;
    }

    return true;
  });

  const handleToggleEnabled = useCallback((snippet: Snippet) => {
    const updatedSnippet = { ...snippet, enabled: !snippet.enabled, updatedAt: new Date() };
    try {
      LocalStorageService.updateSnippet(updatedSnippet);
      loadSnippets();
      toast.success(`Snippet ${updatedSnippet.enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to update snippet:', error);
      toast.error('Failed to update snippet');
    }
  }, [loadSnippets]);

  const handleDelete = useCallback((snippet: Snippet) => {
    if (confirm(`Are you sure you want to delete "${snippet.name}"?`)) {
      try {
        LocalStorageService.deleteSnippet(snippet.id);
        loadSnippets();
        toast.success('Snippet deleted');
      } catch (error) {
        console.error('Failed to delete snippet:', error);
        toast.error('Failed to delete snippet');
      }
    }
  }, [loadSnippets]);

  const handleExecute = useCallback((snippet: Snippet) => {
    if (!snippet.enabled) {
      toast.error('Snippet is disabled');
      return;
    }
    onExecute?.(snippet.code, snippet.id);
  }, [onExecute]);

  const handleExportAll = useCallback(() => {
    try {
      const exportData = LocalStorageService.exportSnippets();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `snippets_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('All snippets exported');
    } catch (error) {
      console.error('Failed to export snippets:', error);
      toast.error('Failed to export snippets');
    }
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSnippetStatus = (snippet: Snippet) => {
    if (!snippet.enabled) return { text: 'Disabled', variant: 'secondary' as const };
    if (currentUrl && matchUrlPattern(currentUrl, snippet.urlPattern)) {
      return { text: 'Active', variant: 'default' as const };
    }
    return { text: 'Ready', variant: 'outline' as const };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Snippets ({filteredSnippets.length})</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onImport}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button
            onClick={handleExportAll}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={snippets.length === 0}
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
          <Button
            onClick={onNew}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Snippet
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-matching"
              checked={showOnlyMatching}
              onCheckedChange={setShowOnlyMatching}
              disabled={!currentUrl}
            />
            <label htmlFor="show-matching" className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              Show matching URL only
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-enabled"
              checked={showOnlyEnabled}
              onCheckedChange={setShowOnlyEnabled}
            />
            <label htmlFor="show-enabled" className="flex items-center gap-1">
              <Filter className="w-4 h-4" />
              Show enabled only
            </label>
          </div>
        </div>
      </div>

      {/* Snippet List */}
      <div className="space-y-3">
        {filteredSnippets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-muted-foreground mb-4">
                {snippets.length === 0 ? (
                  <>
                    <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No snippets yet</p>
                    <p className="text-sm">Create your first snippet to get started</p>
                  </>
                ) : (
                  <>
                    <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No snippets match your filters</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </>
                )}
              </div>
              {snippets.length === 0 && (
                <Button onClick={onNew} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Snippet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredSnippets.map((snippet) => {
            const status = getSnippetStatus(snippet);
            return (
              <Card key={snippet.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {snippet.name}
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {snippet.urlPattern}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(snippet.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={snippet.enabled}
                        onCheckedChange={() => handleToggleEnabled(snippet)}
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Code Preview */}
                    <div className="bg-muted/50 rounded p-2 text-xs font-mono overflow-hidden">
                      <div className="line-clamp-2">
                        {snippet.code.split('\n').slice(0, 2).join('\n') || '// Empty snippet'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleExecute(snippet)}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                          disabled={!snippet.enabled}
                        >
                          <Play className="w-3 h-3" />
                          Run
                        </Button>
                        <Button
                          onClick={() => onEdit?.(snippet)}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                      </div>
                      <Button
                        onClick={() => handleDelete(snippet)}
                        size="sm"
                        variant="ghost"
                        className="flex items-center gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};