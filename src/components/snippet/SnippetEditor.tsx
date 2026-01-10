/**
 * SnippetEditor component with Monaco Editor integration
 * Implements requirements 5.1, 5.2, 5.3 for snippet editing interface
 */

import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Play, 
  Trash2, 
  Download, 
  Upload, 
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Snippet } from '@/types/snippet';
import { LocalStorageService } from '@/services/LocalStorageService';
import { matchUrlPattern, isValidPattern, getPatternExamples } from '@/utils/urlPatterns';

interface SnippetEditorProps {
  snippet?: Snippet;
  currentUrl?: string;
  onSave?: (snippet: Snippet) => void;
  onDelete?: (id: string) => void;
  onExecute?: (code: string, snippetId?: string) => void;
  onClose?: () => void;
}

export const SnippetEditor: React.FC<SnippetEditorProps> = ({
  snippet,
  currentUrl = '',
  onSave,
  onDelete,
  onExecute,
  onClose
}) => {
  const [name, setName] = useState(snippet?.name || '');
  const [code, setCode] = useState(snippet?.code || '// Write your JavaScript code here\nconsole.log("Hello from snippet!");');
  const [urlPattern, setUrlPattern] = useState(snippet?.urlPattern || '.*');
  const [enabled, setEnabled] = useState(snippet?.enabled ?? true);
  const [executeOnLoad, setExecuteOnLoad] = useState(snippet?.executeOnLoad ?? true);
  const [isPatternValid, setIsPatternValid] = useState(true);
  const [patternMatches, setPatternMatches] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validate URL pattern and check if it matches current URL
  useEffect(() => {
    const valid = isValidPattern(urlPattern);
    setIsPatternValid(valid);
    
    if (valid && currentUrl) {
      setPatternMatches(matchUrlPattern(currentUrl, urlPattern));
    } else {
      setPatternMatches(false);
    }
  }, [urlPattern, currentUrl]);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      toast.error('Please enter a snippet name');
      return;
    }

    if (!isPatternValid) {
      toast.error('Please enter a valid URL pattern');
      return;
    }

    const now = new Date();
    const snippetToSave: Snippet = {
      id: snippet?.id || crypto.randomUUID(),
      name: name.trim(),
      code,
      urlPattern,
      enabled,
      executeOnLoad,
      createdAt: snippet?.createdAt || now,
      updatedAt: now
    };

    try {
      LocalStorageService.saveSnippet(snippetToSave);
      onSave?.(snippetToSave);
      toast.success('Snippet saved successfully');
    } catch (error) {
      console.error('Failed to save snippet:', error);
      toast.error('Failed to save snippet');
    }
  }, [name, code, urlPattern, enabled, executeOnLoad, snippet, isPatternValid, onSave]);

  const handleExecute = useCallback(() => {
    if (!code.trim()) {
      toast.error('No code to execute');
      return;
    }

    onExecute?.(code, snippet?.id);
  }, [code, snippet?.id, onExecute]);

  const handleDelete = useCallback(() => {
    if (!snippet?.id) return;

    if (confirm(`Are you sure you want to delete "${snippet.name}"?`)) {
      try {
        LocalStorageService.deleteSnippet(snippet.id);
        onDelete?.(snippet.id);
        toast.success('Snippet deleted');
        onClose?.();
      } catch (error) {
        console.error('Failed to delete snippet:', error);
        toast.error('Failed to delete snippet');
      }
    }
  }, [snippet, onDelete, onClose]);

  const handleExport = useCallback(() => {
    if (!snippet) return;

    try {
      const exportData = JSON.stringify([snippet], null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snippet.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Snippet exported');
    } catch (error) {
      console.error('Failed to export snippet:', error);
      toast.error('Failed to export snippet');
    }
  }, [snippet]);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  }, [code]);

  const patternExamples = getPatternExamples(urlPattern);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{snippet ? 'Edit Snippet' : 'New Snippet'}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </Button>
            {snippet && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Snippet Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="snippet-name">Snippet Name</Label>
            <Input
              id="snippet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter snippet name..."
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url-pattern">URL Pattern</Label>
            <div className="relative">
              <Input
                id="url-pattern"
                value={urlPattern}
                onChange={(e) => setUrlPattern(e.target.value)}
                placeholder=".*"
                className={`w-full pr-10 ${!isPatternValid ? 'border-destructive' : ''}`}
              />
              {!isPatternValid && (
                <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {currentUrl && (
              <div className="flex items-center gap-2 text-sm">
                <span>Current URL:</span>
                <Badge variant={patternMatches ? "default" : "secondary"}>
                  {patternMatches ? "Matches" : "No match"}
                </Badge>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Examples: {patternExamples.slice(0, 2).join(', ')}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
              <Label htmlFor="enabled">Enable snippet</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="execute-on-load"
                checked={executeOnLoad}
                onCheckedChange={setExecuteOnLoad}
              />
              <Label htmlFor="execute-on-load">Execute on page load</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Code Editor */}
        <div className="space-y-2">
          <Label>JavaScript Code</Label>
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="300px"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                wordWrap: 'on',
                contextmenu: true,
                selectOnLineNumbers: true,
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                renderLineHighlight: 'line',
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalHasArrows: false,
                  horizontalHasArrows: false,
                },
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExecute}
              className="flex items-center gap-2"
              disabled={!code.trim()}
            >
              <Play className="w-4 h-4" />
              Run Code
            </Button>
            <Button
              onClick={handleSave}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!name.trim() || !isPatternValid}
            >
              <Save className="w-4 h-4" />
              Save Snippet
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {snippet && (
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};