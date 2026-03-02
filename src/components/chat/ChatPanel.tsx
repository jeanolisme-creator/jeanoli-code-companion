import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, Bot, User, Zap, Sparkles, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const STORAGE_KEY_MODELS = 'ai-settings-added-models';
const STORAGE_KEY_KEYS = 'ai-settings-api-keys';
const CHAT_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-proxy`;

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

function loadApiKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_KEYS) || '{}');
  } catch { return {}; }
}

// ── SSE streaming helper ──────────────────────────────────────────
async function streamChat({
  provider, model, apiKey, messages, onDelta, onDone, onError, signal,
}: {
  provider: string;
  model: string;
  apiKey: string;
  messages: { role: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ provider, model, apiKey, messages }),
    signal,
  });

  if (!resp.ok) {
    const body = await resp.text();
    let msg = 'Erro na API';
    try { msg = JSON.parse(body).error || msg; } catch {}
    onError(msg);
    return;
  }

  if (!resp.body) { onError('Stream vazio'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') { onDone(); return; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
  } catch (e: any) {
    if (e.name === 'AbortError') return;
    onError(e.message || 'Erro de streaming');
    return;
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {}
    }
  }
  onDone();
}

// ── Component ─────────────────────────────────────────────────────
const ChatPanel = () => {
  const [models, setModels] = useState<StoredModel[]>(() => loadModelsFromStorage());
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', type: 'assistant', content: 'Olá! Sou seu assistente IA. Selecione um modelo nas configurações e comece a conversar!', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reload models from localStorage
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
  }, [messages, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    if (!currentModel) {
      toast.error('Selecione um modelo nas configurações primeiro.');
      return;
    }

    const apiKeys = loadApiKeys();
    const apiKey = apiKeys[currentModel.provider];
    if (!apiKey) {
      toast.error(`Configure a API Key do provedor "${currentModel.provider}" em ⚙️ Configurações.`);
      return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    // Build messages array for API (only user/assistant)
    const apiMessages = [...messages, userMsg]
      .filter(m => m.type === 'user' || m.type === 'assistant')
      .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.content }));

    const assistantId = (Date.now() + 1).toString();
    let assistantContent = '';

    const controller = new AbortController();
    abortRef.current = controller;

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      const content = assistantContent;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.id === assistantId) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
        }
        return [...prev, { id: assistantId, type: 'assistant' as const, content, timestamp: new Date() }];
      });
    };

    await streamChat({
      provider: currentModel.provider,
      model: currentModel.id,
      apiKey,
      messages: apiMessages,
      signal: controller.signal,
      onDelta: upsertAssistant,
      onDone: () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      onError: (err) => {
        setIsStreaming(false);
        abortRef.current = null;
        toast.error(`Erro: ${err}`);
        setMessages(prev => [...prev, {
          id: (Date.now() + 2).toString(),
          type: 'system' as const,
          content: `❌ Erro: ${err}`,
          timestamp: new Date(),
        }]);
      },
    });
  }, [input, isStreaming, currentModel, messages]);

  const avatarMap = { user: <User className="w-4 h-4" />, assistant: <Bot className="w-4 h-4" />, system: <Zap className="w-4 h-4" /> };
  const bgMap: Record<string, string> = { user: 'gradient-accent', assistant: 'gradient-primary', system: 'bg-warning' };

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
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.type === 'user'
                    ? 'gradient-primary text-primary-foreground rounded-tr-sm'
                    : msg.type === 'system'
                    ? 'bg-card border-l-3 border-primary text-foreground border border-border'
                    : 'bg-card text-foreground border border-border rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.type !== 'assistant' && (
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
            placeholder={isStreaming ? 'Aguardando resposta...' : 'Digite sua mensagem...'}
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm resize-none border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none disabled:opacity-50"
          />
          {isStreaming ? (
            <Button onClick={stopStreaming} size="icon" variant="destructive" className="rounded-xl h-10 w-10 shrink-0">
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={sendMessage} size="icon" className="gradient-primary rounded-xl h-10 w-10 shrink-0" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          )}
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
