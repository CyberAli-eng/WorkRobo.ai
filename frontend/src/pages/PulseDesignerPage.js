import React, { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Mail, Type, Image as ImageIcon, List, AlignLeft, Send, GripVertical, Trash2 } from "lucide-react";
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { toast } from 'sonner';

const availableChips = [
  { id: "var_scraped", label: "{{scraped_data}}", desc: "Raw text from the Sentry" },
  { id: "var_ai", label: "{{ai_summary}}", desc: "Processed output from the Hive" },
  { id: "var_url", label: "{{source_url}}", desc: "URL of the target" },
];

export default function PulseDesignerPage() {
  const [blocks, setBlocks] = useState([
    { id: "header_1", type: "header", content: "Your WorkRobo Automation Update" },
    { id: "text_1", type: "text", content: "Hi team," },
    { id: "vars_1", type: "variables", content: "{{ai_summary}}" },
    { id: "text_2", type: "text", content: "Automation managed by WorkRobo.ai" },
  ]);

  const [subject, setSubject] = useState("Daily Pulse Update");

  const addBlock = (type) => {
    setBlocks([...blocks, { id: `${type}_${Date.now()}`, type, content: "" }]);
  };

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlock = (id, content) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const handleSavePreview = () => {
    toast.success("Email template saved!");
  };

  return (
    <DashboardLayout
      title="Pulse Designer"
      subtitle="Design your dynamic email templates and variables."
      actions={
        <button 
          onClick={handleSavePreview}
          className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors shadow-[0_0_15px_rgba(147,51,234,0.5)]"
        >
          <Send size={16} className="mr-2" />
          Save Template
        </button>
      }
    >
      <div className="flex flex-1 gap-6 min-h-[500px]">
        {/* Left Sidebar - Chips & Tools */}
        <div className="w-72 flex flex-col gap-6">
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
            <h3 className="text-sm font-medium text-white mb-3 flex items-center">
              <Type size={16} className="mr-2 text-purple-400" /> Elements
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => addBlock("header")} className="flex flex-col items-center justify-center p-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs text-white/70">
                <AlignLeft size={20} className="mb-1 text-white/40" /> Heading
              </button>
              <button onClick={() => addBlock("text")} className="flex flex-col items-center justify-center p-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs text-white/70">
                <List size={20} className="mb-1 text-white/40" /> Text Block
              </button>
              <button onClick={() => addBlock("image")} className="flex flex-col items-center justify-center p-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs text-white/70">
                <ImageIcon size={20} className="mb-1 text-white/40" /> Image
              </button>
              <button onClick={() => addBlock("button")} className="flex flex-col items-center justify-center p-3 rounded bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs text-white/70">
                <div className="w-full h-5 rounded bg-purple-500/50 mb-1" /> Button
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md flex-1">
            <h3 className="text-sm font-medium text-white mb-3">Data Variables</h3>
            <p className="text-xs text-white/50 mb-4">Click below to copy variable strings.</p>
            <div className="space-y-3">
              {availableChips.map(chip => (
                <div key={chip.id} className="p-3 rounded bg-white/5 border border-purple-500/20 group hover:border-purple-500/50 transition-colors">
                  <span className="inline-block px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-mono mb-1">
                    {chip.label}
                  </span>
                  <p className="text-[10px] text-white/50 leading-tight">{chip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Builder Canvas */}
        <div className="flex-1 rounded-xl border border-white/10 bg-black/40 p-8 backdrop-blur-md overflow-y-auto relative h-[80vh]">
          <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="group relative rounded border border-white/10 bg-white/5 p-4 pl-12 transition-all">
              <Mail className="absolute left-4 top-4 text-white/40" size={18} />
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-transparent text-xl font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-b focus:border-purple-500 pb-1"
              />
              <span className="absolute right-4 top-5 text-xs text-white/30 font-medium tracking-wider uppercase">Subject Line</span>
            </div>

            <div className="w-full rounded-lg border border-white/10 bg-white/10 shadow-2xl overflow-hidden mt-8 max-w-2xl mx-auto min-h-[400px]">
              <div className="h-8 w-full bg-black/20 flex items-center px-4 space-x-2 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              
              <div className="p-8 bg-white text-black min-h-[500px]">
                <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
                  {blocks.map((block) => (
                    <Reorder.Item key={block.id} value={block} className="group relative border border-transparent hover:border-blue-500/30 rounded p-2 -mx-2 transition-all list-none">
                      <div className="opacity-0 group-hover:opacity-100 absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab text-gray-400 hover:text-blue-500">
                        <GripVertical size={16} />
                      </div>
                      
                      {block.type === 'header' && (
                        <input 
                          type="text" 
                          value={block.content}
                          onChange={e => updateBlock(block.id, e.target.value)}
                          className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                          placeholder="Heading text..."
                        />
                      )}
                      
                      {block.type === 'text' && (
                        <textarea 
                          value={block.content}
                          onChange={e => updateBlock(block.id, e.target.value)}
                          className="w-full text-base text-gray-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 min-h-[60px] resize-y"
                          placeholder="Start typing..."
                        />
                      )}
                      
                      {block.type === 'variables' && (
                        <div className="p-4 rounded-md bg-gray-50 border border-dashed border-gray-300">
                          <input 
                            type="text" 
                            value={block.content}
                            onChange={e => updateBlock(block.id, e.target.value)}
                            className="w-full font-mono text-sm text-purple-600 bg-transparent border-none focus:outline-none text-center"
                            placeholder="{{variable_name}}"
                          />
                        </div>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 absolute -right-8 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} onClick={() => removeBlock(block.id)} />
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
