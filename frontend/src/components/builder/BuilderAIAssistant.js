import React, { useState } from 'react';
import { Bot, X, Send, Sparkles, Wand2, ChevronLeft, ChevronRight, Zap, Brain } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const BuilderAIAssistant = ({ isOpen, onClose, onApplyDesign }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: "Hello! I'm your WorkRobo AI. Tell me what automation you want to build, and I'll design the logic for you!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinified, setIsMinified] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // More robust design request detection
      const designKeywords = ['build', 'design', 'automation', 'workflow', 'create', 'setup', 'how to', 'can you'];
      const isDesignRequest = designKeywords.some(kw => input.toLowerCase().includes(kw));

      if (isDesignRequest) {
        const response = await fetch('http://localhost:8000/api/execute/ai-design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ prompt: input })
        });
        
        const data = await response.json();
        
        if (data.success && data.design) {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            content: "Yes, I can absolutely design that! I've drafted a workflow with " + data.design.nodes.length + " nodes (including connections to your requested SaaS tools). Click below to apply it to your canvas! ✨",
            design: data.design 
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', content: "I have a plan for this! However, I couldn't generate the visual nodes right now. Try describing the steps one by one, or ask me to 'Build [Your Goal]'." }]);
        }
      } else {
        // Regular chat fallback
        setMessages(prev => [...prev, { role: 'ai', content: "I'm specialized in designing automations! Tell me what you want to connect (e.g., Google Sheets to Slack) and I'll build it." }]);
      }
      setLoading(false);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Something went wrong. Please check if the backend is running." }]);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (

    <div className={`fixed right-0 top-[140px] bottom-0 transition-all duration-500 z-50 flex ${
      isMinified ? 'w-12' : 'w-96'
    }`}>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsMinified(!isMinified)}
        className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-12 bg-purple-600 rounded-l-xl flex items-center justify-center text-white shadow-xl hover:bg-purple-500 transition-colors border border-purple-400/20"
      >
        {isMinified ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className={`w-full border-l border-white/10 bg-black/60 backdrop-blur-3xl flex flex-col h-full shadow-[-20px_0_50px_rgba(0,0,0,0.5)] overflow-hidden transition-opacity duration-300 ${
        isMinified ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-purple-500 rounded-full blur opacity-40 animate-pulse" />
              <div className="relative p-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/20">
                <Brain className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight">Synapse AI</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Ready to build</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[95%] p-4 rounded-2xl text-[13px] leading-relaxed transition-all ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-none shadow-xl shadow-purple-600/10' 
                  : 'bg-white/5 text-zinc-200 rounded-tl-none border border-white/10 shadow-inner'
              }`}>
                {msg.content}
              </div>
              
              {msg.design && (
                <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Button 
                    onClick={() => onApplyDesign(msg.design)}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-indigo-500/20 gap-2 group"
                  >
                    <Zap className="w-4 h-4 fill-white group-hover:scale-125 transition-transform" />
                    APPLY MAGIC WORKFLOW
                  </Button>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-duration:0.6s]" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/5 space-y-4 bg-black/40">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Describe your automation..."
                className="bg-white/5 border-white/10 text-sm h-12 pl-4 pr-4 focus:ring-purple-500/20 focus:border-purple-500/50 rounded-xl transition-all"
              />
            </div>
            <Button onClick={handleSend} size="icon" className="h-12 w-12 shrink-0 bg-purple-600 hover:bg-purple-500 shadow-xl shadow-purple-600/20 rounded-xl">
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 px-1 font-medium italic">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Tip: Try "Build a price tracker for Amazon and email me"
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderAIAssistant;
