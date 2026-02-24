import { useState } from 'react';
import { X } from 'lucide-react';
import { sampleCode } from '@/data/mockData';

const fileTabs = [
  { name: 'ProductCard.tsx', icon: '📄' },
  { name: 'index.tsx', icon: '📄' },
  { name: 'styles.css', icon: '🎨' },
];

const CodeEditor = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground">📝 Editor de Código</span>
        <span className="text-xs text-muted-foreground">{fileTabs[activeTab].name}</span>
      </div>

      <div className="flex bg-editor-tab border-b border-border overflow-x-auto">
        {fileTabs.map((tab, i) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-xs flex items-center gap-1.5 border-r border-border/50 whitespace-nowrap transition-colors group ${
              i === activeTab
                ? 'bg-editor text-editor-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.name}
            <X className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-1" />
          </button>
        ))}
      </div>

      <div className="flex-1 bg-editor overflow-auto p-4 scrollbar-thin">
        <pre className="font-mono text-[13px] leading-relaxed text-editor-foreground">
          <code>{sampleCode}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeEditor;
