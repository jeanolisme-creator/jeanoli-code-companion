import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { sampleCode } from '@/data/mockData';
import { toast } from 'sonner';

const fileTabs = [
  { name: 'ProductCard.tsx', icon: '⚛️' },
  { name: 'index.tsx', icon: '📄' },
  { name: 'styles.css', icon: '🎨' },
  { name: 'api.ts', icon: '🔌' },
];

const CodeEditor = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(sampleCode);
    setCopied(true);
    toast.success('📋 Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlightCode = (code: string) => {
    return code
      .replace(/(import|from|export|const|return|interface|default)/g, '<span class="text-purple-400">$1</span>')
      .replace(/('[@/\w.-]+')/g, '<span class="text-emerald-400">$1</span>')
      .replace(/(\/\/.*)/g, '<span class="text-muted-foreground/60">$1</span>')
      .replace(/(\{|\}|\(|\))/g, '<span class="text-yellow-300">$1</span>')
      .replace(/(className)/g, '<span class="text-cyan-400">$1</span>')
      .replace(/(string|number|boolean)/g, '<span class="text-orange-400">$1</span>');
  };

  const lines = sampleCode.split('\n');

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-editor-tab border-b border-border overflow-x-auto">
        {fileTabs.map((tab, i) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2.5 text-xs flex items-center gap-2 border-r border-border/50 whitespace-nowrap transition-all group ${
              i === activeTab
                ? 'bg-editor text-editor-foreground border-b-2 border-b-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-editor/50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.name}
            <X className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-1" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={copyCode}
          className="px-3 text-muted-foreground hover:text-foreground transition-colors"
          title="Copiar código"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex-1 bg-editor overflow-auto scrollbar-thin">
        <div className="flex">
          {/* Line numbers */}
          <div className="py-4 px-3 text-right select-none border-r border-border/20 sticky left-0 bg-editor">
            {lines.map((_, i) => (
              <div key={i} className="text-[11px] leading-relaxed text-muted-foreground/40 font-mono">
                {i + 1}
              </div>
            ))}
          </div>
          {/* Code */}
          <pre className="py-4 px-4 font-mono text-[13px] leading-relaxed text-editor-foreground flex-1">
            {lines.map((line, i) => (
              <div key={i} className="hover:bg-white/5 px-1 -mx-1 rounded" dangerouslySetInnerHTML={{ __html: highlightCode(line) || '&nbsp;' }} />
            ))}
          </pre>
        </div>
      </div>

      <div className="px-4 py-1.5 bg-editor-tab border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex gap-4">
          <span>📄 {fileTabs[activeTab].name}</span>
          <span>TypeScript React</span>
          <span>UTF-8</span>
        </div>
        <div className="flex gap-4">
          <span>Ln {lines.length}, Col 1</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
