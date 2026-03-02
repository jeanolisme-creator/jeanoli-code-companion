import { Wifi, WifiOff, Star, StarOff, Search, Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useState, useEffect, useMemo, useCallback } from 'react';
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

interface AddedModel extends ModelInfo {
  provider: string;
}

const STORAGE_KEY_KEYS = 'ai-settings-api-keys';
const STORAGE_KEY_MODELS = 'ai-settings-added-models';

function loadApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_KEYS) || '{}');
  } catch { return {}; }
}

function saveApiKeys(keys: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY_KEYS, JSON.stringify(keys));
}

function loadAddedModels(): AddedModel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MODELS) || '[]');
  } catch { return []; }
}

function saveAddedModels(models: AddedModel[]) {
  localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
}

// Fetch models from provider APIs
async function fetchOpenRouterModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar modelos OpenRouter');
  const data = await res.json();
  return (data.data || []).map((m: any) => ({
    id: m.id,
    name: m.name || m.id,
    free: !m.pricing?.prompt || parseFloat(m.pricing.prompt) === 0,
    inputPrice: m.pricing?.prompt ? `$${(parseFloat(m.pricing.prompt) * 1_000_000).toFixed(2)}` : undefined,
    outputPrice: m.pricing?.completion ? `$${(parseFloat(m.pricing.completion) * 1_000_000).toFixed(2)}` : undefined,
    context: m.context_length ? `${Math.round(m.context_length / 1000)}k` : '?',
    description: m.description?.slice(0, 80) || m.id,
  }));
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
  if (!res.ok) throw new Error('Falha ao buscar modelos Gemini');
  const data = await res.json();
  return (data.models || [])
    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: any) => ({
      id: m.name?.replace('models/', '') || m.name,
      name: m.displayName || m.name,
      free: true,
      context: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}k` : '?',
      description: m.description?.slice(0, 80) || '',
    }));
}

async function fetchOllamaModels(url: string): Promise<ModelInfo[]> {
  const res = await fetch(`${url}/api/tags`);
  if (!res.ok) throw new Error('Falha ao conectar ao Ollama');
  const data = await res.json();
  return (data.models || []).map((m: any) => ({
    id: m.name,
    name: m.name,
    free: true,
    context: m.details?.parameter_size || '?',
    description: `${m.details?.family || ''} ${m.details?.parameter_size || ''}`.trim() || 'Modelo local',
  }));
}

async function fetchNvidiaModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error('Falha ao buscar modelos NVIDIA NIM');
  const data = await res.json();
  return (data.data || []).map((m: any) => ({
    id: m.id,
    name: m.id,
    free: false,
    context: m.max_model_len ? `${Math.round(m.max_model_len / 1000)}k` : '?',
    description: m.owned_by || 'NVIDIA NIM',
  }));
}

// ─── Model list with Add button ────────────────────────────────────
const DiscoveredModelList = ({ models, addedIds, onAdd, searchQuery }: {
  models: ModelInfo[];
  addedIds: Set<string>;
  onAdd: (m: ModelInfo) => void;
  searchQuery: string;
}) => {
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return models.filter(m =>
      m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)
    );
  }, [models, searchQuery]);

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhum modelo encontrado</p>;
  }

  return (
    <div className="space-y-1.5">
      {filtered.map((m) => {
        const isAdded = addedIds.has(m.id);
        return (
          <div
            key={m.id}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all border ${
              isAdded ? 'bg-success/5 border-success/20' : 'bg-card border-border hover:border-primary/20 hover:bg-muted/50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate text-xs">{m.name}</span>
                {isAdded && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-success/40 text-success">
                    ✓ Adicionado
                  </Badge>
                )}
              </div>
              {m.description && <p className="text-[11px] text-muted-foreground truncate">{m.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">{m.context}</span>
              {m.free ? (
                <Badge className="bg-success/15 text-success border-success/30 text-[10px] px-2 py-0.5 font-semibold">GRÁTIS</Badge>
              ) : m.inputPrice ? (
                <div className="text-right">
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-muted-foreground">In: <span className="text-foreground font-medium">{m.inputPrice}</span></span>
                    <span className="text-muted-foreground">Out: <span className="text-foreground font-medium">{m.outputPrice}</span></span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/60">por 1M tokens</span>
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px]">Pago</Badge>
              )}
              {!isAdded && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAdd(m)} title="Adicionar modelo">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Added models list with edit/delete ────────────────────────────
const AddedModelsList = ({ models, onEdit, onDelete }: {
  models: AddedModel[];
  onEdit: (model: AddedModel, newName: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (models.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-3">Nenhum modelo adicionado ainda</p>;
  }

  return (
    <div className="space-y-1">
      {models.map(m => (
        <div key={m.id} className="flex items-center gap-2 rounded-lg px-3 py-2 bg-card border border-border text-sm">
          {editingId === m.id ? (
            <>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="h-7 text-xs flex-1"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { onEdit(m, editName); setEditingId(null); }}>
                <Check className="w-3 h-3 text-success" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Star className="w-3.5 h-3.5 text-warning fill-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-xs truncate block">{m.name}</span>
                <span className="text-[10px] text-muted-foreground truncate block">{m.id}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{m.context}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(m.id); setEditName(m.name); }} title="Editar">
                <Pencil className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(m.id)} title="Excluir">
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Main modal ────────────────────────────────────────────────────
const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => ({
    openrouter: '', gemini: '', ollama: 'http://localhost:11434', nvidia: '',
    ...loadApiKeys(),
  }));
  const [addedModels, setAddedModels] = useState<AddedModel[]>(() => loadAddedModels());
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, ModelInfo[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [modelSearch, setModelSearch] = useState('');

  // Persist on change
  useEffect(() => { saveApiKeys(apiKeys); }, [apiKeys]);
  useEffect(() => { saveAddedModels(addedModels); }, [addedModels]);

  const testConnection = useCallback(async (providerKey: string) => {
    const key = apiKeys[providerKey];
    if (!key) { toast.error('Insira a API Key/URL primeiro'); return; }

    setLoading(prev => ({ ...prev, [providerKey]: true }));
    setStatuses(prev => ({ ...prev, [providerKey]: false }));

    try {
      let models: ModelInfo[] = [];
      switch (providerKey) {
        case 'openrouter': models = await fetchOpenRouterModels(key); break;
        case 'gemini': models = await fetchGeminiModels(key); break;
        case 'ollama': models = await fetchOllamaModels(key); break;
        case 'nvidia': models = await fetchNvidiaModels(key); break;
      }
      setDiscoveredModels(prev => ({ ...prev, [providerKey]: models }));
      setStatuses(prev => ({ ...prev, [providerKey]: true }));
      toast.success(`✅ ${models.length} modelos encontrados!`);
    } catch (err: any) {
      toast.error(`❌ ${err.message || 'Falha na conexão'}`);
      setStatuses(prev => ({ ...prev, [providerKey]: false }));
    } finally {
      setLoading(prev => ({ ...prev, [providerKey]: false }));
    }
  }, [apiKeys]);

  const addModel = useCallback((providerKey: string, model: ModelInfo) => {
    setAddedModels(prev => {
      if (prev.some(m => m.id === model.id && m.provider === providerKey)) return prev;
      return [...prev, { ...model, provider: providerKey }];
    });
    toast.success(`✅ ${model.name} adicionado!`);
  }, []);

  const editModel = useCallback((model: AddedModel, newName: string) => {
    setAddedModels(prev => prev.map(m => m.id === model.id && m.provider === model.provider ? { ...m, name: newName } : m));
    toast.success('Modelo atualizado');
  }, []);

  const deleteModel = useCallback((providerKey: string, modelId: string) => {
    setAddedModels(prev => prev.filter(m => !(m.id === modelId && m.provider === providerKey)));
    toast.info('Modelo removido');
  }, []);

  const providers = [
    {
      key: 'openrouter', name: 'OpenRouter', icon: '🌐',
      apiField: { label: 'API Key', placeholder: 'sk-or-v1-xxxx', type: 'password' as const },
    },
    {
      key: 'gemini', name: 'Google Gemini', icon: '✨',
      apiField: { label: 'API Key', placeholder: 'AIzaSy...', type: 'password' as const },
    },
    {
      key: 'ollama', name: 'Ollama (Local)', icon: '🦙',
      apiField: { label: 'URL do Servidor', placeholder: 'http://localhost:11434', type: 'text' as const },
    },
    {
      key: 'nvidia', name: 'NVIDIA NIM', icon: '🟢',
      apiField: { label: 'API Key', placeholder: 'nvapi-xxxx', type: 'password' as const },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl p-0 flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold">⚙️ Configurações de IA</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="openrouter" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-2 mb-0 bg-muted/50 h-10 rounded-xl p-1 flex-wrap h-auto gap-1">
            {providers.map(p => (
              <TabsTrigger key={p.key} value={p.key} className="rounded-lg text-xs font-medium gap-1.5 data-[state=active]:shadow-md">
                <span>{p.icon}</span> {p.name}
                {statuses[p.key] && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {providers.map(p => {
            const providerAdded = addedModels.filter(m => m.provider === p.key);
            const addedIds = new Set(providerAdded.map(m => m.id));
            const discovered = discoveredModels[p.key] || [];
            const isLoading = loading[p.key] || false;

            return (
              <TabsContent key={p.key} value={p.key} className="flex-1 overflow-hidden flex flex-col px-6 pb-4 mt-3">
                {/* Connection */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{p.apiField.label}</label>
                    <Input
                      type={p.apiField.type}
                      placeholder={p.apiField.placeholder}
                      value={apiKeys[p.key] || ''}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [p.key]: e.target.value }))}
                      className="h-9 text-sm rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1 pt-5">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => testConnection(p.key)}
                      disabled={isLoading}
                      className="text-xs h-9 rounded-lg"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Testar'}
                    </Button>
                    <span className={`text-[10px] flex items-center gap-1 ${statuses[p.key] ? 'text-success' : 'text-muted-foreground'}`}>
                      {statuses[p.key] ? <><Wifi className="w-3 h-3" /> OK</> : <><WifiOff className="w-3 h-3" /> Off</>}
                    </span>
                  </div>
                </div>

                {/* Added models */}
                {providerAdded.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      Meus Modelos ({providerAdded.length})
                    </h4>
                    <AddedModelsList
                      models={providerAdded}
                      onEdit={editModel}
                      onDelete={(id) => deleteModel(p.key, id)}
                    />
                  </div>
                )}

                {/* Discovered models */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">
                    {discovered.length > 0 ? `Modelos Disponíveis (${discovered.length})` : 'Modelos Disponíveis'}
                  </h4>
                  {discovered.length > 0 && (
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Buscar modelo..."
                        className="h-8 pl-8 text-xs rounded-lg"
                      />
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 -mx-1 px-1">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Buscando modelos...</span>
                    </div>
                  ) : discovered.length > 0 ? (
                    <DiscoveredModelList
                      models={discovered}
                      addedIds={addedIds}
                      onAdd={(m) => addModel(p.key, m)}
                      searchQuery={modelSearch}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">
                        Clique em <strong>Testar</strong> para buscar os modelos disponíveis
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="flex gap-3 justify-end px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-lg">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
