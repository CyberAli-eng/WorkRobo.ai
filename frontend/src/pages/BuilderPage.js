import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { 
  Save, 
  Play, 
  Plus, 
  Trash2, 
  Webhook, 
  Mail, 
  Database, 
  Code,
  Clock,
  ArrowLeft,
  Cpu,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { streamsApi } from '../lib/api';
import { toast } from 'sonner';

// Custom Node Component
const NeuralLinkNode = ({ data, selected }) => {
  const icons = {
    trigger: Webhook,
    email: Mail,
    database: Database,
    code: Code,
    delay: Clock,
    ai: Cpu
  };
  const Icon = icons[data.nodeType] || Code;

  return (
    <div className={`p-4 min-w-[180px] rounded-xl bg-[#0A0A0A]/80 backdrop-blur-lg border ${
      selected ? 'border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/10'
    } transition-all`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          data.nodeType === 'trigger' ? 'bg-green-500/20' :
          data.nodeType === 'email' ? 'bg-purple-500/20' :
          data.nodeType === 'ai' ? 'bg-cyan-500/20' :
          'bg-zinc-500/20'
        }`}>
          <Icon className={`w-4 h-4 ${
            data.nodeType === 'trigger' ? 'text-green-400' :
            data.nodeType === 'email' ? 'text-purple-400' :
            data.nodeType === 'ai' ? 'text-cyan-400' :
            'text-zinc-400'
          }`} strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-white font-medium text-sm">{data.label}</p>
          <p className="text-zinc-500 text-xs capitalize">{data.nodeType}</p>
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  neuralLink: NeuralLinkNode,
};

const nodeTemplates = [
  { type: 'trigger', label: 'Webhook Trigger', icon: Webhook, color: 'green' },
  { type: 'email', label: 'Send Email', icon: Mail, color: 'purple' },
  { type: 'database', label: 'Database Query', icon: Database, color: 'blue' },
  { type: 'code', label: 'Run Code', icon: Code, color: 'yellow' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'orange' },
  { type: 'ai', label: 'AI Process', icon: Cpu, color: 'cyan' },
];

export default function BuilderPage() {
  const navigate = useNavigate();
  const { streamId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [streamName, setStreamName] = useState('Untitled Stream');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (streamId) {
      loadStream(streamId);
    }
  }, [streamId]);

  const loadStream = async (id) => {
    setLoading(true);
    try {
      const response = await streamsApi.getOne(id);
      const stream = response.data;
      setStreamName(stream.name);
      setNodes(stream.nodes || []);
      setEdges(stream.edges || []);
    } catch (error) {
      toast.error('Failed to load stream');
      navigate('/builder');
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' },
      style: { stroke: '#8B5CF6', strokeWidth: 2 },
      animated: true,
    }, eds)),
    [setEdges]
  );

  const addNode = (template) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'neuralLink',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: { 
        label: template.label,
        nodeType: template.type,
        config: {}
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const streamData = {
        name: streamName,
        description: '',
        nodes: nodes,
        edges: edges,
      };

      if (streamId) {
        await streamsApi.update(streamId, streamData);
        toast.success('Stream updated successfully');
      } else {
        const response = await streamsApi.create(streamData);
        toast.success('Stream created successfully');
        navigate(`/builder/${response.data.id}`);
      }
    } catch (error) {
      toast.error('Failed to save stream');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!streamId) return;
    
    if (window.confirm('Are you sure you want to delete this stream?')) {
      try {
        await streamsApi.delete(streamId);
        toast.success('Stream deleted');
        navigate('/builder');
      } catch (error) {
        toast.error('Failed to delete stream');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="flex items-center justify-center h-[600px]">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="The Synapse"
      subtitle="Visual Workflow Builder"
      actions={
        <div className="flex items-center gap-3">
          {streamId && (
            <button
              onClick={handleDelete}
              data-testid="delete-stream-btn"
              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-stream-btn"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" strokeWidth={1.5} />
            )}
            Save
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* Node Palette */}
        <div className="col-span-3 glass-card p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Neural Links</h3>
          <div className="space-y-2">
            {nodeTemplates.map((template) => (
              <motion.button
                key={template.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => addNode(template)}
                data-testid={`add-node-${template.type}`}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${template.color}-500/20`}>
                  <template.icon className={`w-4 h-4 text-${template.color}-400`} strokeWidth={1.5} />
                </div>
                <span className="text-sm text-white">{template.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Flow Canvas */}
        <div className="col-span-9 glass-card overflow-hidden">
          {/* Stream Name Input */}
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              value={streamName}
              onChange={(e) => setStreamName(e.target.value)}
              placeholder="Stream Name"
              data-testid="stream-name-input"
              className="bg-transparent text-lg font-semibold text-white placeholder-zinc-500 focus:outline-none w-full"
            />
          </div>
          
          <div className="h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[16, 16]}
              defaultEdgeOptions={{
                markerEnd: { type: MarkerType.ArrowClosed, color: '#8B5CF6' },
                style: { stroke: '#8B5CF6', strokeWidth: 2 },
                animated: true,
              }}
            >
              <Background color="#333" gap={32} size={1} />
              <Controls />
              <Panel position="top-right" className="bg-transparent">
                <div className="glass p-2 rounded-lg text-xs text-zinc-400">
                  {nodes.length} nodes · {edges.length} connections
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
