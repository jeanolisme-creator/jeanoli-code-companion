import { useState } from 'react';
import { Monitor, Smartphone, Tablet, RefreshCw, ExternalLink, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const PreviewPanel = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  const viewModes: { key: ViewMode; icon: typeof Monitor; label: string; width: string }[] = [
    { key: 'desktop', icon: Monitor, label: 'Desktop', width: 'w-full' },
    { key: 'tablet', icon: Tablet, label: 'Tablet', width: 'max-w-[768px]' },
    { key: 'mobile', icon: Smartphone, label: 'Mobile', width: 'max-w-[375px]' },
  ];

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">👁️ Live Preview</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
            ● Ativo
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('🔄 Preview atualizado')}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {viewModes.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={viewMode === key ? 'default' : 'ghost'}
              size="icon"
              className={`h-7 w-7 ${viewMode === key ? 'gradient-primary' : ''}`}
              onClick={() => { setViewMode(key); toast.info(`📐 ${label}`); }}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-5 overflow-auto flex items-start justify-center bg-muted/20">
        <div
          className={`bg-card rounded-2xl shadow-xl border border-border overflow-hidden transition-all duration-300 w-full ${
            viewModes.find(v => v.key === viewMode)?.width
          }`}
        >
          {/* Product Card Preview */}
          <div className="relative group">
            <img
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800"
              alt="Smartwatch Pro"
              className="w-full h-72 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <button className="absolute top-4 right-4 bg-card p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
              ❤️
            </button>
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs bg-primary/90 text-primary-foreground px-3 py-1 rounded-full font-medium">
                🔥 Mais vendido
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-xl">Smartwatch Pro</h3>
                <p className="text-sm text-muted-foreground">Monitor cardíaco • GPS • NFC</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground line-through">R$ 499,90</p>
                <p className="text-xl font-bold text-primary">R$ 299,90</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
                Adicionar ao Carrinho
              </button>
              <button className="py-3 px-4 rounded-xl border-2 border-border text-foreground font-semibold text-sm hover:border-primary hover:text-primary transition-all">
                Comprar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
