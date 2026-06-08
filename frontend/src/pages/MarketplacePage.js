import React, { useState } from 'react';
import { Download, Search, Star, Users, Briefcase, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { toast } from 'sonner';

const templates = [
  {
    id: "t1",
    name: "Competitor Price Watcher",
    category: "Monitoring",
    description: "Automatically scrape competitor pricing pages daily. Uses Gemini to analyze price drops and sends a Pulse email to your sales team.",
    downloads: "12.4k",
    rating: 4.9,
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10"
  },
  {
    id: "t2",
    name: "LinkedIn Lead Scraper",
    category: "Sales",
    description: "Monitors search results for your target audience, extracts their public details, and automatically categorizes them using Hive Brain.",
    downloads: "8.2k",
    rating: 4.7,
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10"
  },
  {
    id: "t3",
    name: "Daily News Summarizer",
    category: "Productivity",
    description: "Scrapes your favorite tech blogs every morning at 8 AM. Gemini summarizes the top 5 articles into a clean email digest.",
    downloads: "4.1k",
    rating: 4.8,
    icon: Briefcase,
    color: "text-purple-400",
    bg: "bg-purple-500/10"
  }
];

export default function MarketplacePage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = templates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleClone = () => {
    toast.success("Template successfully cloned to your Hive!");
  };

  return (
    <DashboardLayout
      title="Robo-Gallery"
      subtitle="Discover and clone top-performing automation streams from the community."
    >
      <div className="flex-1 space-y-6">
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text" 
            placeholder="Search for templates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full flex h-10 rounded-md border border-white/10 bg-black/40 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((template, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={template.id} 
              className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-md hover:border-purple-500/50 hover:bg-white/10 transition-all group"
              style={{ 
                boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)"
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${template.bg}`}>
                  <template.icon className={template.color} size={24} />
                </div>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {template.category}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
              <p className="text-sm text-white/70 mb-6 flex-1">{template.description}</p>
              
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center space-x-4 text-xs font-medium text-white/60">
                  <span className="flex items-center">
                    <Download size={14} className="mr-1" />
                    {template.downloads}
                  </span>
                  <span className="flex items-center">
                    <Star size={14} className="mr-1 text-yellow-500" />
                    {template.rating}
                  </span>
                </div>
                <button 
                  onClick={handleClone}
                  className="flex items-center text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Download size={16} className="mr-2" />
                  Clone to Hive
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
