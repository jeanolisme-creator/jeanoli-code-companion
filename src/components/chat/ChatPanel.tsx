import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Zap, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STORAGE_KEY_MODELS = 'ai-settings-added-models';

interface StoredModel {
  id: string;
  name: string;
  provider: string;
  context: string;
}

function loadModelsFromStorage(): StoredModel[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MODELS) || '[]');
  } catch { return []; }
}

const ChatPanel = () => {
  const [models, setModels] = useState<StoredModel[]>(() => loadModelsFromStorage());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', type: 'assistant', content: 'Olá! Sou seu assistente IA. Como posso ajudar no desenvolvimento do seu projeto?', timestamp: new Date() },
    { id: '2', type: 'system', content: 'Projeto "ecommerce-dashboard" carregado. Arquivo atual: ProductCard.tsx', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reload models from localStorage when window regains focus or storage changes
  useEffect(() => {
    const handler = () => setModels(loadModelsFromStorage());
    window.addEventListener('focus', handler);
    window.addEventListener('storage', handler);
    return () => { window.removeEventListener('focus', handler); window.removeEventListener('storage', handler); };
  }, []);

  // Auto-select first model
  useEffect(() => {
    if (models.length > 0 && !models.find(m => m.id === selectedModel)) {
      setSelectedModel(models[0].id);
    }
  }, [models]);

  const currentModel = models.find(m => m.id === selectedModel);

  // Group by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, StoredModel[]> = {};
    const providerLabels: Record<string, string> = {
      openrouter: 'OpenRouter', gemini: 'Google Gemini', ollama: 'Ollama Local', nvidia: 'NVIDIA NIM'
    };
    models.forEach(m => {
      const label = providerLabels[m.provider] || m.provider;
      if (!groups[label]) groups[label] = [];
      groups[label].push(m);
    });
    return groups;
  }, [models]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const hasCode = input.toLowerCase().includes('favorito') || input.toLowerCase().includes('botão') || input.toLowerCase().includes('animação');
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: hasCode
          ? 'Claro! Aqui está uma sugestão com animação suave no hover:'
          : 'Entendi! Deixe-me analisar o código e criar a melhor solução...',
        codeSuggestion: hasCode ? `<button\n  onClick={() => onToggleFavorite(id)}\n  className="absolute top-2 right-2 p-2 rounded-full\n    bg-white shadow-md opacity-0 group-hover:opacity-100\n    transition-all duration-300 hover:scale-110"\n>\n  <Heart className="w-5 h-5 fill-red-500" />\n</button>` : undefined,
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, response]);
    }, 1200);
  };

  const applySuggestion = () => toast.success('✅ Código aplicado com sucesso!');

  const avatarMap = { user: <User className="w-4 h-4" />, assistant: <Bot className="w-4 h-4" />, system: <Zap className="w-4 h-4" /> };
  const bgMap = { user: 'gradient-accent', assistant: 'gradient-primary', system: 'bg-warning' };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Assistente IA
        </span>
        {models.length > 0 ? (
          <select
            value={selectedModel}
            onChange={(e) => { setSelectedModel(e.target.value); const m = models.find(x => x.id === e.target.value); if (m) toast.info(`🤖 Modelo: ${m.name}`); }}
            className="text-xs bg-muted rounded-lg px-2 py-1.5 border border-border text-foreground max-w-[180px]"
          >
            {Object.entries(groupedModels).map(([provider, list]) => (
              <optgroup key={provider} label={provider}>
                {list.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Adicione modelos em ⚙️ Configurações</span>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full ${bgMap[msg.type]} flex items-center justify-center text-primary-foreground shrink-0`}>
                {avatarMap[msg.type]}
              </div>
              <div className={`max-w-[85%] ${msg.type === 'user' ? 'ml-auto' : ''}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-tr-sm'
                    : msg.type === 'system'
                    ? 'bg-card border-l-3 border-primary text-foreground border border-border'
                    : 'bg-card text-foreground border border-border rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                {msg.codeSuggestion && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-border">
                    <div className="bg-editor-tab px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">💡 Sugestão de código</span>
                      <Button size="sm" variant="ghost" onClick={applySuggestion} className="h-6 text-xs gap-1 text-primary hover:text-primary">
                        <Check className="w-3 h-3" /> Aplicar
                      </Button>
                    </div>
                    <pre className="bg-editor p-3 text-xs font-mono text-editor-foreground overflow-x-auto">
                      {msg.codeSuggestion}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-primary-foreground shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="p-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Digite sua solicitação..."
            rows={1}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm resize-none border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
          />
          <Button onClick={sendMessage} size="icon" className="gradient-primary rounded-xl h-10 w-10 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {currentModel && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            {currentModel.name} • {currentModel.context} tokens
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
