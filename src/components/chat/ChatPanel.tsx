import { useState } from 'react';
import { Send, Bot, User, Zap, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { aiModels } from '@/data/mockData';
import type { ChatMessage } from '@/types';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const ChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', type: 'assistant', content: 'Olá! Sou seu assistente IA. Como posso ajudar no desenvolvimento do seu projeto?', timestamp: new Date() },
    { id: '2', type: 'system', content: 'Projeto "ecommerce-dashboard" carregado. Arquivo atual: ProductCard.tsx', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3');
  const currentModel = aiModels.find(m => m.id === selectedModel)!;

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

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
      setMessages(prev => [...prev, response]);
    }, 1200);
  };

  const applySuggestion = () => toast.success('✅ Código aplicado com sucesso!');

  const avatarMap = { user: <User className="w-4 h-4" />, assistant: <Bot className="w-4 h-4" />, system: <Zap className="w-4 h-4" /> };
  const bgMap = { user: 'gradient-accent', assistant: 'gradient-primary', system: 'bg-warning' };

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="px-4 py-2.5 bg-card border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">💬 Assistente IA</span>
        <select
          value={selectedModel}
          onChange={(e) => { setSelectedModel(e.target.value); toast.info(`🤖 Modelo: ${aiModels.find(m => m.id === e.target.value)?.name}`); }}
          className="text-xs bg-muted rounded-lg px-2 py-1.5 border border-border text-foreground"
        >
          {['OpenRouter', 'Google Gemini', 'Ollama Local'].map(provider => (
            <optgroup key={provider} label={provider}>
              {aiModels.filter(m => m.provider === provider).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
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
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {currentModel.name} • {currentModel.tokens} tokens
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
