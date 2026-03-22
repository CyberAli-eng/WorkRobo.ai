import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Bot, 
  Trash2, 
  Play,
  Pause,
  Loader2,
  Webhook,
  Clock,
  Zap
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { hiveApi } from '../lib/api';
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
import { Textarea } from '../components/ui/textarea';

const triggerTypes = [
  { id: 'webhook', label: 'Webhook', icon: Webhook, description: 'Triggered by HTTP request' },
  { id: 'schedule', label: 'Schedule', icon: Clock, description: 'Runs on a schedule' },
  { id: 'event', label: 'Event', icon: Zap, description: 'Triggered by an event' },
];

export default function HivePage() {
  const [robos, setRobos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'webhook',
    trigger_config: {},
    actions: []
  });

  useEffect(() => {
    fetchRobos();
  }, []);

  const fetchRobos = async () => {
    try {
      const response = await hiveApi.getAll();
      setRobos(response.data);
    } catch (error) {
      console.error('Failed to fetch robos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    try {
      const response = await hiveApi.create(formData);
      setRobos([...robos, response.data]);
      setIsDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        trigger_type: 'webhook',
        trigger_config: {},
        actions: []
      });
      toast.success('WorkRobo created');
    } catch (error) {
      toast.error('Failed to create WorkRobo');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this WorkRobo?')) return;
    
    try {
      await hiveApi.delete(id);
      setRobos(robos.filter(r => r.id !== id));
      toast.success('WorkRobo deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleToggle = async (robo) => {
    setToggling(robo.id);
    try {
      if (robo.state === 'active') {
        await hiveApi.deactivate(robo.id);
        toast.success('WorkRobo deactivated');
      } else {
        await hiveApi.activate(robo.id);
        toast.success('WorkRobo activated');
      }
      fetchRobos();
    } catch (error) {
      toast.error('Failed to toggle state');
    } finally {
      setToggling(null);
    }
  };

  const getTriggerIcon = (type) => {
    const trigger = triggerTypes.find(t => t.id === type);
    return trigger ? trigger.icon : Webhook;
  };

  return (
    <DashboardLayout
      title="The Hive"
      subtitle="Autonomous WorkRobo Agents"
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-robo-btn"
              className="bg-green-600 hover:bg-green-500"
            >
              <Plus className="w-4 h-4 mr-2" /> Create WorkRobo
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121212] border-white/10 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Create WorkRobo Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="WorkRobo Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="robo-name-input"
                className="bg-black/50 border-white/10 text-white"
              />
              <Textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="robo-description-input"
                rows={3}
                className="bg-black/50 border-white/10 text-white"
              />
              
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Trigger Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {triggerTypes.map((trigger) => (
                    <button
                      key={trigger.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, trigger_type: trigger.id })}
                      data-testid={`trigger-${trigger.id}`}
                      className={`p-3 rounded-xl border text-center transition-colors ${
                        formData.trigger_type === trigger.id
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <trigger.icon className={`w-5 h-5 mx-auto mb-1 ${
                        formData.trigger_type === trigger.id ? 'text-green-400' : 'text-zinc-400'
                      }`} strokeWidth={1.5} />
                      <span className={`text-xs ${
                        formData.trigger_type === trigger.id ? 'text-green-400' : 'text-zinc-400'
                      }`}>
                        {trigger.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleCreate}
                data-testid="create-robo-btn"
                className="w-full bg-green-600 hover:bg-green-500"
              >
                Create WorkRobo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : robos.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bot className="w-16 h-16 text-zinc-600 mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-white mb-2">No WorkRobos</h3>
          <p className="text-zinc-500 mb-6">Create autonomous agents to handle complex automations</p>
          <Button 
            onClick={() => setIsDialogOpen(true)}
            data-testid="empty-add-robo-btn"
            className="bg-green-600 hover:bg-green-500"
          >
            <Plus className="w-4 h-4 mr-2" /> Create First WorkRobo
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {robos.map((robo) => {
            const TriggerIcon = getTriggerIcon(robo.trigger_type);
            return (
              <motion.div
                key={robo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 relative overflow-hidden"
              >
                {/* Status indicator */}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${
                  robo.state === 'active' 
                    ? 'bg-green-500 animate-pulse' 
                    : 'bg-zinc-600'
                }`} />

                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    robo.state === 'active' ? 'bg-green-500/20' : 'bg-zinc-500/20'
                  }`}>
                    <Bot className={`w-7 h-7 ${
                      robo.state === 'active' ? 'text-green-400' : 'text-zinc-400'
                    }`} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{robo.name}</h3>
                    <p className="text-sm text-zinc-500">{robo.description || 'No description'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                    <TriggerIcon className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span className="text-xs text-zinc-400 capitalize">{robo.trigger_type}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    robo.state === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    {robo.state}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleToggle(robo)}
                    disabled={toggling === robo.id}
                    data-testid={`toggle-robo-${robo.id}`}
                    variant="ghost"
                    className={`flex-1 ${
                      robo.state === 'active'
                        ? 'text-yellow-400 hover:bg-yellow-500/10'
                        : 'text-green-400 hover:bg-green-500/10'
                    }`}
                  >
                    {toggling === robo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : robo.state === 'active' ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Activate
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDelete(robo.id)}
                    data-testid={`delete-robo-${robo.id}`}
                    variant="ghost"
                    className="text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
