import { Wifi, WifiOff, Star, StarOff, Search, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ModelInfo {
  id: string;
  name: string;
  free: boolean;
  inputPrice?: string;
  outputPrice?: string;
  context: string;
  description?: string;
}

const openRouterModels: ModelInfo[] = [
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', free: false, inputPrice: '$3.00', outputPrice: '$15.00', context: '200k', description: 'Mais inteligente da Anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', free: false, inputPrice: '$15.00', outputPrice: '$75.00', context: '200k', description: 'Máxima capacidade' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', free: false, inputPrice: '$0.25', outputPrice: '$1.25', context: '200k', description: 'Rápido e econômico' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', free: false, inputPrice: '$10.00', outputPrice: '$30.00', context: '128k', description: 'OpenAI mais poderoso' },
  { id: 'gpt-4o', name: 'GPT-4o', free: false, inputPrice: '$5.00', outputPrice: '$15.00', context: '128k', description: 'Multimodal otimizado' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false, inputPrice: '$0.15', outputPrice: '$0.60', context: '128k', description: 'Econômico e rápido' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', free: false, inputPrice: '$0.50', outputPrice: '$1.50', context: '16k', description: 'Modelo clássico' },
  { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', free: false, inputPrice: '$2.00', outputPrice: '$2.00', context: '131k', description: 'Meta mais poderoso' },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', free: true, context: '131k', description: 'Meta open-source' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', free: true, context: '131k', description: 'Leve e rápido' },
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', free: true, context: '32k', description: 'Mistral MoE' },
  { id: 'mixtral-8x22b', name: 'Mixtral 8x22B', free: false, inputPrice: '$0.65', outputPrice: '$0.65', context: '65k', description: 'Mistral avançado' },
  { id: 'gemma-2-27b', name: 'Gemma 2 27B', free: true, context: '8k', description: 'Google open-source' },
  { id: 'phi-3-medium', name: 'Phi-3 Medium', free: true, context: '128k', description: 'Microsoft compacto' },
  { id: 'qwen-2-72b', name: 'Qwen 2 72B', free: true, context: '128k', description: 'Alibaba poderoso' },
  { id: 'deepseek-v2.5', name: 'DeepSeek V2.5', free: false, inputPrice: '$0.14', outputPrice: '$0.28', context: '128k', description: 'Código e raciocínio' },
  { id: 'mistral-large', name: 'Mistral Large', free: false, inputPrice: '$2.00', outputPrice: '$6.00', context: '128k', description: 'Mistral flagship' },
  { id: 'command-r-plus', name: 'Command R+', free: false, inputPrice: '$3.00', outputPrice: '$15.00', context: '128k', description: 'Cohere avançado' },
  { id: 'wizardlm-2-8x22b', name: 'WizardLM 2 8x22B', free: true, context: '65k', description: 'Microsoft fine-tuned' },
  { id: 'nous-hermes-2', name: 'Nous Hermes 2 Mixtral', free: true, context: '32k', description: 'Community fine-tuned' },
];

const geminiModels: ModelInfo[] = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: true, context: '1M', description: 'Rápido e gratuito' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false, inputPrice: '$1.25', outputPrice: '$5.00', context: '2M', description: 'Contexto massivo' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: false, inputPrice: '$0.075', outputPrice: '$0.30', context: '1M', description: 'Velocidade otimizada' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B', free: true, context: '1M', description: 'Ultra leve' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', free: false, inputPrice: '$1.25', outputPrice: '$10.00', context: '1M', description: 'Última geração' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', free: false, inputPrice: '$0.15', outputPrice: '$0.60', context: '1M', description: 'Balanceado' },
];

const ollamaModels: ModelInfo[] = [
  { id: 'llama2-7b', name: 'Llama 2 (7B)', free: true, context: '4k', description: 'Modelo base local' },
  { id: 'codellama-7b', name: 'CodeLlama (7B)', free: true, context: '16k', description: 'Especializado em código' },
  { id: 'mistral-7b', name: 'Mistral (7B)', free: true, context: '32k', description: 'Eficiente e rápido' },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', free: true, context: '16k', description: 'Codificação avançada' },
  { id: 'phi-3-mini', name: 'Phi-3 Mini', free: true, context: '128k', description: 'Microsoft compacto' },
];

const MAX_FAVORITES = 5;

const ModelList = ({ models, favorites, onToggleFavorite, searchQuery }: {
  models: ModelInfo[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  searchQuery: string;
}) => {
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const all = models.filter(m => 
      m.name.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
    );
    const favs = all.filter(m => favorites.includes(m.id));
    const rest = all.filter(m => !favorites.includes(m.id));
    return [...favs, ...rest];
  }, [models, favorites, searchQuery]);

  return (
    <div className="space-y-1.5">
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo encontrado</p>
      )}
      {filtered.map((m) => {
        const isFav = favorites.includes(m.id);
        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all border ${
              isFav
                ? 'bg-primary/5 border-primary/20 shadow-sm'
                : 'bg-card border-border hover:border-primary/20 hover:bg-muted/50'
            }`}
          >
            <button
              onClick={() => onToggleFavorite(m.id)}
              className="shrink-0 transition-transform hover:scale-110"
              title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              {isFav ? (
                <Star className="w-4 h-4 text-warning fill-warning" />
              ) : (
                <StarOff className="w-4 h-4 text-muted-foreground hover:text-warning" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{m.name}</span>
                {isFav && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/40 text-warning">
                    ⭐ Favorito
                  </Badge>
                )}
              </div>
              {m.description && (
                <p className="text-xs text-muted-foreground truncate">{m.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">{m.context}</span>
              {m.free ? (
                <Badge className="bg-success/15 text-success border-success/30 text-[10px] px-2 py-0.5 font-semibold">
                  GRÁTIS
                </Badge>
              ) : (
                <div className="text-right">
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-muted-foreground">
                      In: <span className="text-foreground font-medium">{m.inputPrice}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Out: <span className="text-foreground font-medium">{m.outputPrice}</span>
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/60">por 1M tokens</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [statuses, setStatuses] = useState({ openrouter: false, gemini: false, ollama: true });
  const [apiKeys, setApiKeys] = useState({ openrouter: '', gemini: '', ollama: 'http://localhost:11434' });
  const [favorites, setFavorites] = useState<Record<string, string[]>>({
    openrouter: [],
    gemini: [],
    ollama: [],
  });
  const [modelSearch, setModelSearch] = useState('');

  const testConnection = (provider: string) => {
    toast.info(`🔄 Testando conexão com ${provider}...`);
    setTimeout(() => {
      setStatuses(prev => ({ ...prev, [provider]: true }));
      toast.success(`✅ Conexão com ${provider} estabelecida!`);
    }, 1500);
  };

  const toggleFavorite = (provider: string, modelId: string) => {
    setFavorites(prev => {
      const current = prev[provider] || [];
      if (current.includes(modelId)) {
        return { ...prev, [provider]: current.filter(id => id !== modelId) };
      }
      if (current.length >= MAX_FAVORITES) {
        toast.warning(`⚠️ Máximo de ${MAX_FAVORITES} favoritos por provedor`);
        return prev;
      }
      return { ...prev, [provider]: [...current, modelId] };
    });
  };

  const providers = [
    {
      key: 'openrouter', name: 'OpenRouter', icon: '🌐', color: 'gradient-primary',
      apiField: { label: 'API Key', placeholder: 'sk-or-v1-xxxx', type: 'password' as const },
      models: openRouterModels,
    },
    {
      key: 'gemini', name: 'Google Gemini', icon: '✨', color: 'bg-blue-500',
      apiField: { label: 'API Key', placeholder: 'AIzaSy...', type: 'password' as const },
      models: geminiModels,
    },
    {
      key: 'ollama', name: 'Ollama (Local)', icon: '🦙', color: 'bg-success',
      apiField: { label: 'URL do Servidor', placeholder: 'http://localhost:11434', type: 'text' as const },
      models: ollamaModels,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold">⚙️ Configurações de IA</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="openrouter" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 mb-0 bg-muted/50 h-10 rounded-xl p-1">
            {providers.map(p => (
              <TabsTrigger key={p.key} value={p.key} className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:shadow-md">
                <span>{p.icon}</span> {p.name}
                {statuses[p.key as keyof typeof statuses] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {providers.map(p => (
            <TabsContent key={p.key} value={p.key} className="flex-1 overflow-hidden flex flex-col px-6 pb-4 mt-3">
              {/* Connection section */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{p.apiField.label}</label>
                  <Input
                    type={p.apiField.type}
                    placeholder={p.apiField.placeholder}
                    value={apiKeys[p.key as keyof typeof apiKeys]}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [p.key]: e.target.value }))}
                    className="h-9 text-sm rounded-lg"
                  />
                </div>
                <div className="flex flex-col items-center gap-1 pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(p.name)}
                    className="text-xs h-9 rounded-lg"
                  >
                    Testar
                  </Button>
                  <span className={`text-[10px] flex items-center gap-1 ${statuses[p.key as keyof typeof statuses] ? 'text-success' : 'text-muted-foreground'}`}>
                    {statuses[p.key as keyof typeof statuses] ? <><Wifi className="w-3 h-3" /> OK</> : <><WifiOff className="w-3 h-3" /> Off</>}
                  </span>
                </div>
              </div>

              {/* Models section */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">
                  Modelos Disponíveis
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({(favorites[p.key] || []).length}/{MAX_FAVORITES} favoritos)
                  </span>
                </h4>
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Buscar modelo..."
                    className="h-8 pl-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 -mx-1 px-1">
                <ModelList
                  models={p.models}
                  favorites={favorites[p.key] || []}
                  onToggleFavorite={(id) => toggleFavorite(p.key, id)}
                  searchQuery={modelSearch}
                />
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-lg">Cancelar</Button>
          <Button onClick={() => { onClose(); toast.success('⚙️ Configurações salvas!'); }} className="gradient-primary rounded-lg">
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
