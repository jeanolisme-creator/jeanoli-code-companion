import { useState, useMemo } from 'react';
import { X, Copy, Check, Loader2, FolderTree, FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { sampleCode } from '@/data/mockData';
import type { OpenFile, RepoFile, Project } from '@/types';

const fileIcons: Record<string, string> = {
  tsx: '⚛️', jsx: '⚛️', ts: '📘', js: '📒', css: '🎨', html: '🌐',
  json: '📋', md: '📝', svg: '🖼️', png: '🖼️', yml: '⚙️', yaml: '⚙️',
  toml: '⚙️', lock: '🔒', gitignore: '🔒',
};

const getFileIcon = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return fileIcons[ext] || '📄';
};

interface CodeEditorProps {
  openFiles: OpenFile[];
  activeFileIndex: number;
  onSetActiveFile: (i: number) => void;
  onCloseFile: (i: number) => void;
  onUpdateContent: (i: number, content: string) => void;
  isLoading: boolean;
  fileTree: RepoFile[];
  project: Project | null;
  onOpenFile: (path: string) => void;
}

const CodeEditor = ({
  openFiles, activeFileIndex, onSetActiveFile, onCloseFile,
  onUpdateContent, isLoading, fileTree, project, onOpenFile,
}: CodeEditorProps) => {
  const [copied, setCopied] = useState(false);
  const [showTree, setShowTree] = useState(false);

  const activeFile = openFiles[activeFileIndex];
  const code = activeFile?.content || sampleCode;
  const fileName = activeFile?.path?.split('/').pop() || 'ProductCard.tsx';

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('📋 Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (codeLine: string) => {
    return codeLine
      .replace(/(import|from|export|const|return|interface|default|function|let|var|type|async|await|if|else)/g, '<span class="text-purple-400">$1</span>')
      .replace(/('[@/\w.-]+'|"[@/\w.-]+")/g, '<span class="text-emerald-400">$1</span>')
      .replace(/(\/\/.*)/g, '<span class="text-muted-foreground/60">$1</span>')
      .replace(/(\{|\}|\(|\))/g, '<span class="text-yellow-300">$1</span>')
      .replace(/(className)/g, '<span class="text-cyan-400">$1</span>')
      .replace(/(string|number|boolean)/g, '<span class="text-orange-400">$1</span>');
  };

  const lines = code.split('\n');

  // Group file tree by directory
  const treeByDir = useMemo(() => {
    const dirs: Record<string, RepoFile[]> = {};
    fileTree
      .filter(f => !f.path.includes('node_modules') && !f.path.includes('.git/'))
      .forEach(f => {
        const parts = f.path.split('/');
        const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '/';
        if (!dirs[dir]) dirs[dir] = [];
        dirs[dir].push(f);
      });
    return dirs;
  }, [fileTree]);

  return (
    <div className="flex h-full">
      {/* File Tree Sidebar */}
      {showTree && fileTree.length > 0 && (
        <div className="w-56 bg-card border-r border-border overflow-y-auto scrollbar-thin shrink-0">
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            📂 Arquivos
          </div>
          <div className="py-1">
            {Object.entries(treeByDir).sort(([a], [b]) => a.localeCompare(b)).map(([dir, dirFiles]) => (
              <div key={dir}>
                <div className="px-3 py-1 text-[11px] font-medium text-muted-foreground/70">
                  {dir === '/' ? 'root' : dir}
                </div>
                {dirFiles.map(f => (
                  <button
                    key={f.path}
                    onClick={() => onOpenFile(f.path)}
                    className={`w-full text-left px-4 py-1 text-[12px] font-mono hover:bg-muted/50 transition-colors flex items-center gap-1.5 ${
                      activeFile?.path === f.path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <span className="text-[10px]">{getFileIcon(f.path)}</span>
                    {f.path.split('/').pop()}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex bg-[hsl(var(--editor-tab-bg))] border-b border-border overflow-x-auto">
          {fileTree.length > 0 && (
            <button
              onClick={() => setShowTree(!showTree)}
              className={`px-3 py-2.5 text-xs border-r border-border/50 transition-colors ${
                showTree ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Explorador de arquivos"
            >
              <FolderTree className="w-3.5 h-3.5" />
            </button>
          )}

          {openFiles.length > 0 ? (
            openFiles.map((file, i) => (
              <button
                key={file.path}
                onClick={() => onSetActiveFile(i)}
                className={`px-4 py-2.5 text-xs flex items-center gap-2 border-r border-border/50 whitespace-nowrap transition-all group ${
                  i === activeFileIndex
                    ? 'bg-[hsl(var(--editor-bg))] text-[hsl(var(--editor-foreground))] border-b-2 border-b-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--editor-bg))]/50'
                }`}
              >
                <span className="text-[10px]">{getFileIcon(file.path)}</span>
                {file.path.split('/').pop()}
                {file.modified && <span className="w-1.5 h-1.5 rounded-full bg-warning" />}
                <X
                  className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-1"
                  onClick={(e) => { e.stopPropagation(); onCloseFile(i); }}
                />
              </button>
            ))
          ) : (
            <div className="px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5" />
              {project ? 'Carregando arquivos...' : 'Selecione um projeto'}
            </div>
          )}

          <div className="flex-1" />
          <button onClick={copyCode} className="px-3 text-muted-foreground hover:text-foreground transition-colors" title="Copiar código">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Code area */}
        {isLoading ? (
          <div className="flex-1 bg-[hsl(var(--editor-bg))] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex-1 bg-[hsl(var(--editor-bg))] overflow-auto scrollbar-thin">
            <div className="flex">
              <div className="py-4 px-3 text-right select-none border-r border-border/20 sticky left-0 bg-[hsl(var(--editor-bg))]">
                {lines.map((_, i) => (
                  <div key={i} className="text-[11px] leading-relaxed text-muted-foreground/40 font-mono">{i + 1}</div>
                ))}
              </div>
              <pre className="py-4 px-4 font-mono text-[13px] leading-relaxed text-[hsl(var(--editor-foreground))] flex-1">
                {lines.map((line, i) => (
                  <div key={i} className="hover:bg-white/5 px-1 -mx-1 rounded" dangerouslySetInnerHTML={{ __html: highlightCode(line) || '&nbsp;' }} />
                ))}
              </pre>
            </div>
          </div>
        )}

        {/* Status bar */}
        <div className="px-4 py-1.5 bg-[hsl(var(--editor-tab-bg))] border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex gap-4">
            <span>📄 {fileName}</span>
            <span>{project?.language || 'TypeScript React'}</span>
            <span>UTF-8</span>
          </div>
          <div className="flex gap-4">
            <span>Ln {lines.length}, Col 1</span>
            <span>Spaces: 2</span>
            {fileTree.length > 0 && <span>📂 {fileTree.length} arquivos</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
