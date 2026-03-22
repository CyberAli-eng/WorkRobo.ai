import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
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
  Cpu,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Globe
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { streamsApi, executeApi } from '../lib/api';
import { useWorkflowWebSocket } from '../lib/useWebSocket';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

// Custom Node Component with status indicator
const NeuralLinkNode = ({ id, data, selected }) => {
  const icons = {
    trigger: Webhook,
    webhook: Webhook,
    email: Mail,
    pulse: Mail,
    database: Database,
    code: Code,
    delay: Clock,
    ai: Cpu,
    hive: Cpu,
    sentry: Eye,
    scraper: Globe,
    condition: AlertCircle,
  };
  const Icon = icons[data.nodeType] || Code;
  
  const statusColors = {
    pending: 'border-zinc-500',
    running: 'border-yellow-500 animate-pulse',
    success: 'border-green-500',
    failed: 'border-red-500',
    skipped: 'border-zinc-600',
  };
  
  const statusIcons = {
    running: <Loader2 className="w-3 h-3 text-yellow-400 animate-spin" />,
    success: <CheckCircle className="w-3 h-3 text-green-400" />,
    failed: <XCircle className="w-3 h-3 text-red-400" />,
  };

  return (
    <div className={`p-4 min-w-[200px] rounded-xl bg-[#0A0A0A]/90 backdrop-blur-lg border-2 ${
      data.status ? statusColors[data.status] : 
      selected ? 'border-purple-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-white/10'
    } transition-all relative`}>
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-[#0A0A0A]"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-[#0A0A0A]"
      />
      
      {/* Status indicator */}
      {data.status && statusIcons[data.status] && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0A0A0A] flex items-center justify-center">
          {statusIcons[data.status]}
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          data.nodeType === 'trigger' || data.nodeType === 'webhook' ? 'bg-green-500/20' :
          data.nodeType === 'email' || data.nodeType === 'pulse' ? 'bg-purple-500/20' :
          data.nodeType === 'ai' || data.nodeType === 'hive' ? 'bg-cyan-500/20' :
          data.nodeType === 'sentry' || data.nodeType === 'scraper' ? 'bg-yellow-500/20' :
          'bg-zinc-500/20'
        }`}>
          <Icon className={`w-5 h-5 ${
            data.nodeType === 'trigger' || data.nodeType === 'webhook' ? 'text-green-400' :
            data.nodeType === 'email' || data.nodeType === 'pulse' ? 'text-purple-400' :
            data.nodeType === 'ai' || data.nodeType === 'hive' ? 'text-cyan-400' :
            data.nodeType === 'sentry' || data.nodeType === 'scraper' ? 'text-yellow-400' :
            'text-zinc-400'
          }`} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium text-sm">{data.label}</p>
          <p className="text-zinc-500 text-xs capitalize">{data.nodeType}</p>
        </div>
        {data.config && Object.keys(data.config).length > 0 && (
          <Settings className="w-4 h-4 text-zinc-500" />
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  neuralLink: NeuralLinkNode,
};

const nodeTemplates = [
  { type: 'trigger', label: 'Webhook Trigger', icon: Webhook, color: 'green', description: 'Start workflow on HTTP request' },
  { type: 'sentry', label: 'Web Scraper', icon: Eye, color: 'yellow', description: 'Scrape and monitor webpages' },
  { type: 'ai', label: 'AI Process', icon: Cpu, color: 'cyan', description: 'Analyze data with Gemini AI' },
  { type: 'email', label: 'Send Email', icon: Mail, color: 'purple', description: 'Send email via Resend' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'orange', description: 'Wait before next step' },
  { type: 'code', label: 'Run Code', icon: Code, color: 'gray', description: 'Execute custom code' },
  { type: 'database', label: 'Database', icon: Database, color: 'blue', description: 'Query MongoDB' },
  { type: 'condition', label: 'Condition', icon: AlertCircle, color: 'pink', description: 'Branch based on condition' },
];

// Node configuration forms
const NodeConfigForm = ({ node, onSave, onClose }) => {
  const [config, setConfig] = useState(node?.data?.config || {});
  
  const renderConfigFields = () => {
    const nodeType = node?.data?.nodeType;
    
    switch (nodeType) {
      case 'sentry':
      case 'scraper':
        return (
          <>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">URL to scrape</label>
              <Input
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://example.com"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">CSS Selector (optional)</label>
              <Input
                value={config.selector || ''}
                onChange={(e) => setConfig({ ...config, selector: e.target.value })}
                placeholder=".content, #main"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
          </>
        );
        
      case 'ai':
      case 'hive':
        return (
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">AI Prompt</label>
            <Textarea
              value={config.prompt || ''}
              onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
              placeholder="Analyze the following data: {{scraped_data}}"
              rows={4}
              className="bg-black/50 border-white/10 text-white"
            />
            <p className="text-xs text-zinc-500 mt-1">Use {'{{scraped_data}}'} to reference scraped content</p>
          </div>
        );
        
      case 'email':
      case 'pulse':
        return (
          <>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">To Email</label>
              <Input
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                placeholder="recipient@example.com"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Subject</label>
              <Input
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                placeholder="WorkRobo Alert"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email Body (HTML)</label>
              <Textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder="<p>{{ai_summary}}</p>"
                rows={4}
                className="bg-black/50 border-white/10 text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Use {'{{ai_summary}}'} or {'{{scraped_data}}'} for dynamic content</p>
            </div>
          </>
        );
        
      case 'delay':
        return (
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Delay (seconds)</label>
            <Input
              type="number"
              value={config.seconds || 5}
              onChange={(e) => setConfig({ ...config, seconds: parseInt(e.target.value) || 5 })}
              min={1}
              max={3600}
              className="bg-black/50 border-white/10 text-white"
            />
          </div>
        );
        
      case 'condition':
        return (
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Condition</label>
            <Input
              value={config.condition || ''}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              placeholder="change_detected == True"
              className="bg-black/50 border-white/10 text-white"
            />
            <p className="text-xs text-zinc-500 mt-1">Python expression using context variables</p>
          </div>
        );
        
      default:
        return (
          <p className="text-zinc-500 text-sm">No configuration required for this node type.</p>
        );
    }
  };
  
  return (
    <div className="space-y-4">
      {renderConfigFields()}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={() => onSave(config)}
          className="flex-1 bg-purple-600 hover:bg-purple-500"
        >
          Save Configuration
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/10 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default function BuilderPage() {
  const navigate = useNavigate();
  const { streamId } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [streamName, setStreamName] = useState('Untitled Stream');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // WebSocket for real-time updates
  const { 
    isConnected, 
    nodeStatuses, 
    executionLogs, 
    subscribeToWorkflow,
    clearStatuses 
  } = useWorkflowWebSocket(streamId);

  // Update node statuses when WebSocket receives updates
  useEffect(() => {
    if (Object.keys(nodeStatuses).length > 0) {
      setNodes((nds) =>
        nds.map((node) => {
          const status = nodeStatuses[node.id];
          if (status) {
            return {
              ...node,
              data: {
                ...node.data,
                status: status.status,
              },
            };
          }
          return node;
        })
      );
    }
  }, [nodeStatuses, setNodes]);

  useEffect(() => {
    if (streamId) {
      loadStream(streamId);
      subscribeToWorkflow(streamId);
    }
  }, [streamId, subscribeToWorkflow]);

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

  const handleNodeDoubleClick = (event, node) => {
    setSelectedNode(node);
    setConfigDialogOpen(true);
  };

  const handleSaveNodeConfig = (config) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? { ...n, data: { ...n.data, config } }
            : n
        )
      );
    }
    setConfigDialogOpen(false);
    setSelectedNode(null);
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

  const handleExecute = async () => {
    if (!streamId) {
      toast.error('Please save the stream first');
      return;
    }
    
    setExecuting(true);
    clearStatuses();
    
    // Clear all node statuses
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, status: 'pending' },
      }))
    );
    
    try {
      const response = await executeApi.executeStream(streamId, {});
      toast.success('Workflow execution started!');
    } catch (error) {
      toast.error('Failed to execute workflow');
      // Reset node statuses on error
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, status: undefined },
        }))
      );
    } finally {
      setExecuting(false);
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
          {/* WebSocket status indicator */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={isConnected ? 'Real-time connected' : 'Disconnected'} />
          
          {streamId && (
            <>
              <button
                onClick={handleExecute}
                disabled={executing}
                data-testid="execute-stream-btn"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-500 transition-colors disabled:opacity-50"
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" strokeWidth={1.5} />
                )}
                Execute
              </button>
              <button
                onClick={handleDelete}
                data-testid="delete-stream-btn"
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </>
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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center`}
                     style={{ backgroundColor: `${template.color === 'green' ? '#22c55e' : 
                                                  template.color === 'purple' ? '#8B5CF6' :
                                                  template.color === 'cyan' ? '#06B6D4' :
                                                  template.color === 'yellow' ? '#EAB308' :
                                                  template.color === 'orange' ? '#F97316' :
                                                  '#71717A'}20` }}>
                  <template.icon className="w-4 h-4" 
                                 style={{ color: template.color === 'green' ? '#22c55e' : 
                                                 template.color === 'purple' ? '#8B5CF6' :
                                                 template.color === 'cyan' ? '#06B6D4' :
                                                 template.color === 'yellow' ? '#EAB308' :
                                                 template.color === 'orange' ? '#F97316' :
                                                 '#71717A' }} 
                                 strokeWidth={1.5} />
                </div>
                <div>
                  <span className="text-sm text-white block">{template.label}</span>
                  <span className="text-xs text-zinc-500">{template.description}</span>
                </div>
              </motion.button>
            ))}
          </div>
          
          {/* Execution Logs */}
          {executionLogs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Execution Log</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {executionLogs.slice(-10).map((log, i) => (
                  <div key={i} className="text-xs p-2 rounded bg-white/5">
                    <span className={`font-medium ${
                      log.status === 'success' ? 'text-green-400' :
                      log.status === 'failed' ? 'text-red-400' :
                      log.status === 'running' ? 'text-yellow-400' :
                      'text-zinc-400'
                    }`}>
                      {log.node_id?.substring(0, 8) || log.type}
                    </span>
                    <span className="text-zinc-500 ml-2">{log.status || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
              onNodeDoubleClick={handleNodeDoubleClick}
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
                  {executing && <span className="ml-2 text-yellow-400">· Running...</span>}
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Configure {selectedNode?.data?.label}
            </DialogTitle>
          </DialogHeader>
          <NodeConfigForm
            node={selectedNode}
            onSave={handleSaveNodeConfig}
            onClose={() => setConfigDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
