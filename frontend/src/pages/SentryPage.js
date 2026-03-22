import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Eye, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { sentryApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function SentryPage() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [checking, setChecking] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    selector: '',
    check_interval: 3600,
    notify_email: ''
  });

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await sentryApi.getAll();
      setTargets(response.data);
    } catch (error) {
      console.error('Failed to fetch targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.url) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      const response = await sentryApi.create(formData);
      setTargets([...targets, response.data]);
      setIsDialogOpen(false);
      setFormData({ name: '', url: '', selector: '', check_interval: 3600, notify_email: '' });
      toast.success('Sentry target created');
    } catch (error) {
      toast.error('Failed to create target');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this target?')) return;
    
    try {
      await sentryApi.delete(id);
      setTargets(targets.filter(t => t.id !== id));
      toast.success('Target deleted');
    } catch (error) {
      toast.error('Failed to delete target');
    }
  };

  const handleCheck = async (id) => {
    setChecking(id);
    try {
      const response = await sentryApi.check(id);
      if (response.data.change_detected) {
        toast.success('Change detected on this page!');
      } else {
        toast.info('No changes detected');
      }
      fetchTargets();
    } catch (error) {
      toast.error('Check failed');
    } finally {
      setChecking(null);
    }
  };

  return (
    <DashboardLayout
      title="The Sentry"
      subtitle="Web Monitoring & Change Detection"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-sentry-btn"
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Target
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121212] border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Add Sentry Target</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Target Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="sentry-name-input"
                className="bg-black/50 border-white/10 text-white"
              />
              <Input
                placeholder="URL to monitor"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                data-testid="sentry-url-input"
                className="bg-black/50 border-white/10 text-white"
              />
              <Input
                placeholder="CSS Selector (optional)"
                value={formData.selector}
                onChange={(e) => setFormData({ ...formData, selector: e.target.value })}
                data-testid="sentry-selector-input"
                className="bg-black/50 border-white/10 text-white"
              />
              <Input
                placeholder="Notification Email"
                type="email"
                value={formData.notify_email}
                onChange={(e) => setFormData({ ...formData, notify_email: e.target.value })}
                data-testid="sentry-email-input"
                className="bg-black/50 border-white/10 text-white"
              />
              <Button 
                onClick={handleCreate}
                data-testid="create-sentry-btn"
                className="w-full bg-cyan-600 hover:bg-cyan-500"
              >
                Create Target
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      ) : targets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Globe className="w-16 h-16 text-zinc-600 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-white mb-2">No Sentry Targets</h3>
          <p className="text-zinc-500 mb-6">Start monitoring webpages for changes</p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            data-testid="empty-add-sentry-btn"
            className="bg-cyan-600 hover:bg-cyan-500"
          >
            <Plus className="w-4 h-4 mr-2" /> Add First Target
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {targets.map((target) => (
            <motion.div
              key={target.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    target.change_detected ? 'bg-yellow-500/20' : 'bg-cyan-500/20'
                  }`}>
                    {target.change_detected ? (
                      <AlertCircle className="w-6 h-6 text-yellow-400" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{target.name}</h3>
                    <a 
                      href={target.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-zinc-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                    >
                      {target.url.substring(0, 50)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                      {target.last_checked && (
                        <span>Last checked: {new Date(target.last_checked).toLocaleString()}</span>
                      )}
                      {target.change_detected && (
                        <span className="text-yellow-400">Change Detected!</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCheck(target.id)}
                    disabled={checking === target.id}
                    data-testid={`check-target-${target.id}`}
                    className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {checking === target.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(target.id)}
                    data-testid={`delete-target-${target.id}`}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
