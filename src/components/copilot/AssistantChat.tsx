'use client';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProposal } from '@/state/proposal';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { telemetry } from '@/lib/telemetry';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AssistantChatProps {
  initialMessages: Message[];
  context: any;
  onAnalyzePlan?: (plan: any) => void;
}

export function AssistantChat({ initialMessages, context, onAnalyzePlan }: AssistantChatProps) {
  const toggleSelect = useProposal((s) => s.toggleSelect);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI response - in production this would call your AI API
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '¿Te gustaría que compare las coberturas específicas de estos planes? También puedo ayudarte a entender mejor los deducibles o exclusiones de cada uno.'
      };
      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  const renderMessage = (message: Message) => {
    // Try to parse JSON content for special message types
    let jsonContent = null;
    try {
      jsonContent = JSON.parse(message.content);
    } catch {}

    if (jsonContent?.type === 'insurance_plans') {
      return (
        <div className="space-y-3">
          {jsonContent.plans.map((plan: any) => (
            <Card key={plan.id} className="p-3">
              <div className="space-y-2">
                <div className="font-medium text-sm">
                  {plan.name}
                  <span className="text-muted-foreground ml-2">({plan.provider})</span>
                </div>
                <div className="text-sm text-muted-foreground">{plan.price}</div>
                <div className="flex gap-2 flex-wrap">
                  {plan.benefits.map((benefit: string, i: number) => (
                    <span key={i} className="text-xs bg-secondary px-2 py-1 rounded">
                      {benefit}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fullPlan = context.shortlist.find((p: any) => p.id === plan.id);
                      if (fullPlan && onAnalyzePlan) onAnalyzePlan(fullPlan);
                    }}
                  >
                    Analizar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fullPlan = context.shortlist.find((p: any) => p.id === plan.id);
                      if (fullPlan) toggleSelect(fullPlan);
                    }}
                  >
                    Añadir a propuesta
                  </Button>
                  {plan.link && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={plan.link} target="_blank" rel="noopener noreferrer">
                        Ver fuente
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Asistente Briki</h3>
        <p className="text-sm text-muted-foreground">
          Pregúntame sobre los planes, coberturas o cualquier duda
        </p>
      </div>
      
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-4 py-2',
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : message.role === 'system'
                    ? 'bg-muted text-xs italic'
                    : 'bg-secondary'
                )}
              >
                {renderMessage(message)}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            onPaste={(e) => {
              try {
                const text = e.clipboardData?.getData('text') || '';
                if (text && text.length > 0) {
                  const w = window as any;
                  w.__pasteToBriefStartTs = Date.now();
                  w.__pasteToBriefChars = text.length;
                  if (w.__pasteToBriefTimeoutId) {
                    clearTimeout(w.__pasteToBriefTimeoutId);
                  }
                  // Emit started immediately
                  telemetry.track(telemetry.events.PASTE_TO_BRIEF_STARTED, { chars: text.length });
                  // Failsafe timeout: if no completion within 12s, mark failed
                  w.__pasteToBriefTimeoutId = window.setTimeout(() => {
                    try {
                      const start = w.__pasteToBriefStartTs;
                      const ms = typeof start === 'number' ? Math.max(0, Date.now() - start) : undefined;
                      telemetry.track(telemetry.events.PASTE_TO_BRIEF_FAILED, { chars: w.__pasteToBriefChars, message: 'timeout', ms });
                    } catch {}
                    w.__pasteToBriefStartTs = null;
                    w.__pasteToBriefChars = null;
                    w.__pasteToBriefTimeoutId = null;
                  }, 12000);
                }
              } catch {}
            }}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
