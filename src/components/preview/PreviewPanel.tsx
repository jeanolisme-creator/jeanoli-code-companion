import { useState } from 'react';
import { Monitor, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PreviewPanel = () => {
  const [isMobile, setIsMobile] = useState(false);

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">👁️ Live Preview</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('🔄 Preview atualizado')}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={!isMobile ? 'default' : 'ghost'}
            size="icon"
            className={`h-7 w-7 ${!isMobile ? 'gradient-primary' : ''}`}
            onClick={() => { setIsMobile(false); toast.info('💻 Desktop'); }}
          >
            <Monitor className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={isMobile ? 'default' : 'ghost'}
            size="icon"
            className={`h-7 w-7 ${isMobile ? 'gradient-primary' : ''}`}
            onClick={() => { setIsMobile(true); toast.info('📱 Mobile'); }}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-auto flex items-start justify-center">
        <div
          className={`bg-card rounded-2xl shadow-lg border border-border overflow-hidden transition-all duration-300 ${
            isMobile ? 'w-[375px]' : 'w-full max-w-lg'
          }`}
        >
          {/* Product Card Preview */}
          <div className="relative group">
            <img
              src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"
              alt="Smartwatch Pro"
              className="w-full h-52 object-cover"
            />
            <button className="absolute top-3 right-3 bg-card p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">
              ❤️
            </button>
          </div>
          <div className="p-5">
            <h3 className="font-bold text-lg mb-1">Smartwatch Pro</h3>
            <p className="text-muted-foreground mb-4">R$ 299,90</p>
            <button className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:-translate-y-0.5 hover:shadow-lg transition-all">
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
