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
  Play, Save, Plus, Settings, ChevronRight, X, Trash2, 
  Search, Grid, List, Activity, MessageSquare, 
  ArrowRight, Database, Globe, Brain, Zap, Clock,
  Mail, Code, Webhook, Eye, Loader2, Download, Table, FileText,
  SearchIcon, Filter, Layers, MoreVertical, Layout,
  MessageCircle, Sparkles, Wand2, HelpCircle, Bot, Cpu, AlertCircle,
  CheckCircle, XCircle
} from 'lucide-react';
import BuilderAIAssistant from '../components/builder/BuilderAIAssistant';
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
    http: Globe,
  };

  const IconNode = icons[data.nodeType] || Brain; // Changed to IconNode and Brain
  const isExecuting = data.status === 'executing' || data.status === 'running'; // Added isExecuting

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
    <div className={`relative group transition-all duration-300 ${ // Updated outer div
      selected ? 'ring-2 ring-purple-500 ring-offset-4 ring-offset-[#0A0A0A] scale-105' : 'hover:scale-102'
    }`}>
      {/* Premium Glow Effect */}
      <div className={`absolute -inset-1 rounded-xl opacity-20 blur-xl transition-opacity duration-500 group-hover:opacity-40 bg-gradient-to-r ${
        data.nodeType === 'trigger' ? 'from-green-500 to-emerald-400' :
        data.nodeType === 'ai' ? 'from-cyan-400 to-blue-500' :
        data.nodeType === 'condition' ? 'from-pink-500 to-rose-400' :
        'from-purple-500 to-blue-500'
      }`} />

      <div className={`relative px-4 py-3 rounded-xl border flex flex-col gap-2 min-w-[200px] shadow-2xl transition-all duration-300 ${ // Updated inner div
        isExecuting ? 'bg-zinc-900 border-purple-500/50' : 'bg-[#0F0F0F] border-zinc-800 backdrop-blur-md'
      }`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-zinc-500 !w-1.5 !h-8 !border-0 !rounded-sm -ml-[3px]"
      />
      
      {/* Icon Area */}
      <div className={`w-10 h-10 flex items-center justify-center shrink-0 border-r border-zinc-800 ${
        data.nodeType === 'trigger' || data.nodeType === 'webhook' ? 'text-green-400 bg-green-400/10' :
        data.nodeType === 'email' || data.nodeType === 'pulse' ? 'text-purple-400 bg-purple-400/10' :
        data.nodeType === 'ai' || data.nodeType === 'hive' ? 'text-cyan-400 bg-cyan-400/10' :
        data.nodeType === 'sentry' || data.nodeType === 'scraper' || data.nodeType === 'http' ? 'text-yellow-400 bg-yellow-400/10' :
        'text-zinc-400 bg-zinc-800'
      }`}>
        <IconNode className="w-5 h-5" strokeWidth={1.5} /> {/* Changed to IconNode */}
      </div>
      
      {/* Label Area */}
      <div className="flex-1 py-2 px-3 min-w-0">
        <p className="text-zinc-100 font-medium text-[13px] truncate">{data.label}</p>
        <p className="text-zinc-500 text-[10px] tracking-wide uppercase truncate">{data.nodeType}</p>
      </div>

      {/* Status Icons */}
      <div className="pr-2 shrink-0 flex items-center gap-1">
        {data.status && statusIcons[data.status]}
        {data.config && Object.keys(data.config).length > 0 && !data.status && (
          <Settings className="w-3 h-3 text-zinc-600" />
        )}
      </div>

      {/* Output Handles */}
      {data.nodeType === 'condition' ? (
        <>
          <Handle type="source" position={Position.Right} id="true" style={{ top: '30%' }} className="!w-1.5 !h-4 !bg-[#22c55e] !border-0 !rounded-sm -mr-[3px]" />
          <span className="absolute -right-8 top-[20%] text-[9px] text-green-500 font-bold bg-black/60 px-1 rounded backdrop-blur-sm">True</span>
          <Handle type="source" position={Position.Right} id="false" style={{ top: '70%' }} className="!w-1.5 !h-4 !bg-[#ef4444] !border-0 !rounded-sm -mr-[3px]" />
          <span className="absolute -right-8 top-[60%] text-[9px] text-red-500 font-bold bg-black/60 px-1 rounded backdrop-blur-sm">False</span>
        </>
      ) : (
        <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-1.5 !h-8 !border-0 !rounded-sm -mr-[3px]" />
      )}
    </div>
    </div>
  );
};

const nodeTypes = {
  neuralLink: NeuralLinkNode,
};

const nodeTemplates = [
  { type: 'trigger', label: 'Webhook', icon: Webhook, color: 'green', category: 'Trigger', description: 'Start flow via HTTP request' },
  { type: 'sentry', label: 'Web Scraper', icon: Eye, color: 'yellow', category: 'Web', description: 'Scrape and monitor webpages' },
  { type: 'ai', label: 'AI Process', icon: Cpu, color: 'cyan', category: 'AI', description: 'Analyze data with Gemini AI' },
  { type: 'email', label: 'Send Email', icon: Mail, color: 'purple', category: 'Communication', description: 'Send email via Resend' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'orange', category: 'Logic', description: 'Wait before next step' },
  { type: 'code', label: 'Run Code', icon: Code, color: 'gray', category: 'Logic', description: 'Execute custom code' },
  { type: 'database', label: 'Database', icon: Database, color: 'blue', category: 'Data', description: 'Query MongoDB' },
  { type: 'condition', label: 'Condition', icon: AlertCircle, color: 'pink', category: 'Logic', description: 'Branch based on condition' },
  { type: 'http', label: 'HTTP Request', icon: Globe, color: 'yellow', category: 'Web', description: 'Make an HTTP request' },
];

const categories = ['All', 'Trigger', 'AI', 'Web', 'Logic', 'Communication', 'Data'];

// Node configuration forms
// Node configuration forms
const NodeConfigForm = ({ node, status, streamId, onSave, onDelete, onClose }) => {
  const [config, setConfig] = useState(node?.data?.config || {});
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'data'

  const downloadCSV = () => {
    if (!status?.result) {
      toast.error('No data available to export');
      return;
    }
    
    try {
      const data = status.result;
      const array = Array.isArray(data) ? data : [data];
      if (array.length === 0) return;
      
      const headers = Object.keys(array[0]);
      const csvContent = [
        headers.join(','),
        ...array.map(row => headers.map(header => {
          const val = row[header];
          const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${stringVal.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${node?.data?.label || 'export'}_results.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported');
    } catch (error) {
      console.error('CSV Export Error:', error);
      toast.error('Failed to export CSV');
    }
  };

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
              placeholder="Extract the price and output JSON like {&#34;price&#34;: 499.99} from this text: {{scraped_data}}"
              rows={5}
              className="bg-black/50 border-white/10 text-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-2">Use {'{{scraped_data}}'} for context. Output JSON to create variables for Condition nodes.</p>
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
            <label className="text-sm text-zinc-400 mb-1 block">Condition Expression</label>
            <Input
              value={config.condition || ''}
              onChange={(e) => setConfig({ ...config, condition: e.target.value })}
              placeholder="price < 500"
              className="bg-black/50 border-white/10 text-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-2">Any Python expression using context variables generated by AI (e.g. price &lt; 500)</p>
          </div>
        );
        
      case 'code':
        return (
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Python Code</label>
            <Textarea
              value={config.code || ''}
              onChange={(e) => setConfig({ ...config, code: e.target.value })}
              placeholder="result = {'price': 25, 'item': 'Coffee Mug'}"
              rows={8}
              className="bg-black/50 border-white/10 text-white font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-2">Set the <code>result</code> dictionary to pass variables to next nodes.</p>
          </div>
        );

      case 'trigger':
      case 'webhook':
        return (
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Webhook URL (Read Only)</label>
            <Input
              value={`http://localhost:8000/api/webhooks/${streamId || 'new'}`}
              disabled
              className="bg-black/20 border-white/5 text-zinc-500 font-mono text-[10px]"
            />
            <p className="text-[10px] text-zinc-600 mt-1 italic">Send POST requests here to trigger this flow</p>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Collection</label>
              <Input
                value={config.collection || 'custom_data'}
                onChange={(e) => setConfig({ ...config, collection: e.target.value })}
                placeholder="users, orders, etc."
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Operation</label>
              <select 
                value={config.operation || 'find'}
                onChange={(e) => setConfig({ ...config, operation: e.target.value })}
                className="w-full h-9 bg-black/50 border border-white/10 rounded-md px-3 text-sm text-white"
              >
                <option value="find">Find</option>
                <option value="insert">Insert</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>
        );
        
      case 'http':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select 
                value={config.method || 'GET'}
                onChange={(e) => setConfig({ ...config, method: e.target.value })}
                className="w-24 h-9 bg-black/50 border border-white/10 rounded-md px-3 text-sm text-white font-bold"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
              <Input
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://api.example.com/v1"
                className="flex-1 bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Headers (JSON)</label>
              <Textarea
                value={config.headers || '{}'}
                onChange={(e) => setConfig({ ...config, headers: e.target.value })}
                placeholder='{ "Authorization": "Bearer token" }'
                rows={2}
                className="bg-black/50 border-white/10 text-white font-mono text-sm uppercase tracking-widest placeholder:lowercase"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Body (JSON)</label>
              <Textarea
                value={config.body || '{}'}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                placeholder='{ "key": "value" }'
                rows={3}
                className="bg-black/50 border-white/10 text-white font-mono text-sm"
              />
            </div>
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
      {/* Tabs */}
      <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-white/5">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === 'settings' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
            activeTab === 'data' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Data
        </button>
      </div>

      <div className="min-h-[300px]">
        {activeTab === 'settings' ? (
          <div className="space-y-4">
            {renderConfigFields()}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {!status ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                <FileText className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm">No execution data yet</p>
                <p className="text-[10px] uppercase tracking-wider mt-1">Run workflow to see results</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  {/* Quick Actions */}
          <div className="flex items-center gap-2 pr-2 border-r border-white/5 mr-2">
            {/* This button was moved to DashboardLayout actions */}
          </div>

          <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status.status === 'success' ? 'bg-green-500' : 
                      status.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                    }`} />
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      Last Execution: {status.status}
                    </span>
                  </div>
                  {status.result && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={downloadCSV}
                      className="h-7 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 gap-1.5"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </Button>
                  )}
                </div>

                <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
                  <div className="bg-zinc-800/30 px-3 py-1.5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-500">OUTPUT DATA</span>
                    <span className="text-[9px] text-zinc-600 font-mono italic">
                      {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <pre className="p-4 text-[11px] font-mono text-zinc-300 overflow-y-auto max-h-[350px] whitespace-pre-wrap break-all w-full scrollbar-thin scrollbar-thumb-zinc-800">
                    {status.error ? (
                      <span className="text-red-400 font-semibold">{status.error}</span>
                    ) : (
                      JSON.stringify(status.result || { message: 'Node executed successfully' }, null, 2)
                    )}
                  </pre>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-4 border-t border-white/5">
        <Button
          onClick={() => onSave(config)}
          className="flex-1 bg-purple-600 hover:bg-purple-500"
        >
          Save Configuration
        </Button>
        <Button
          variant="outline"
          onClick={onDelete}
          title="Delete Node"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10 px-3"
        >
          <Trash2 className="w-4 h-4" />
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
  const [streamName, setStreamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Scheduling States
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [cronExpression, setCronExpression] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState('');

  const memoEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    style: { stroke: '#52525B', strokeWidth: 2 },
    animated: true,
  }), []);

  const { 
    isConnected, 
    nodeStatuses, 
    executionLogs, 
    executing, 
    executeWorkflow, 
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
    const fetchStream = async () => {
      if (!streamId) return;
      setLoading(true);
      try {
        const response = await streamsApi.getOne(streamId);
        const stream = response.data;
        setNodes(stream.nodes || []);
        setEdges(stream.edges || []);
        setStreamName(stream.name || 'Untitled Stream');
        subscribeToWorkflow(streamId);
        
        // Fetch current schedule configurations
        try {
          const scheduleRes = await streamsApi.getSchedule(streamId);
          if (scheduleRes.data.scheduled) {
            setIsScheduled(true);
            setCurrentSchedule(scheduleRes.data.schedule.cron_expression);
            setCronExpression(scheduleRes.data.schedule.cron_expression);
          } else {
            setIsScheduled(false);
            setCurrentSchedule('');
            setCronExpression('');
          }
        } catch (e) {
          console.error('Failed to fetch schedule configuration:', e);
        }
      } catch (error) {
        console.error('Failed to fetch stream:', error);
        if (error.response?.status === 404) {
          toast.error('Stream data lost (Mock DB Reset). Starting a fresh one...', { duration: 4000 });
          setStreamName('Price Scapper');
        } else {
          toast.error('Failed to load stream');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStream();
  }, [streamId, setNodes, setEdges, subscribeToWorkflow]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      style: { stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5, 5' },
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
    }, eds)),
    [setEdges]
  );

  const handleApplyDesign = useCallback((design) => {
    if (!design || !design.nodes || !design.edges) {
      toast.error('AI design was incomplete');
      return;
    }

    // Clean current state
    setNodes([]);
    setEdges([]);
    
    // Small delay for animation feel
    setTimeout(() => {
      setNodes(design.nodes);
      setEdges(design.edges);
      toast.success('Magic Workflow Applied! 🧨');
    }, 300);
  }, [setNodes, setEdges]);

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
      // Status managed by WebSocket hook
    }
  };

  const handleSaveSchedule = async () => {
    if (!cronExpression) {
      toast.error('Please enter a valid cron expression');
      return;
    }
    try {
      await streamsApi.setSchedule(streamId, cronExpression);
      setIsScheduled(true);
      setCurrentSchedule(cronExpression);
      toast.success('Robo-Stream schedule updated');
      setScheduleDialogOpen(false);
    } catch (e) {
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    try {
      await streamsApi.deleteSchedule(streamId);
      setIsScheduled(false);
      setCurrentSchedule('');
      setCronExpression('');
      toast.success('Robo-Stream schedule removed');
      setScheduleDialogOpen(false);
    } catch (e) {
      toast.error('Failed to delete schedule');
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

  const filteredNodes = nodeTemplates.filter(template => {
    const matchesSearch = template.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout
      title="The Synapse"
      subtitle="Visual Workflow Builder"
      actions={
        <div className="flex items-center gap-3">
          {/* WebSocket status indicator */}
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
               title={isConnected ? 'Real-time connected' : 'Disconnected'} />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAssistantOpen(!isAssistantOpen)}
            className={`h-8 gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
              isAssistantOpen ? 'bg-purple-500/10 text-purple-400' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AI Assistant
          </Button>

          {streamId && (
            <>
              <button
                onClick={() => setScheduleDialogOpen(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border text-sm ${
                  isScheduled 
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
                title={isScheduled ? `Scheduled: ${currentSchedule}` : 'Configure Schedule'}
              >
                <Clock className="w-4 h-4" strokeWidth={1.5} />
                {isScheduled ? 'Scheduled' : 'Schedule'}
              </button>
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
      <div className="flex h-[calc(100vh-140px)] relative">
        {/* Node Palette (n8n Style Left Sidebar) */}
        <div className="w-[300px] bg-[#0A0A0A] border-r border-zinc-800 flex flex-col h-full shrink-0 z-10 relative">
          <div className="p-4 border-b border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Node Library</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <Input
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-[11px] bg-white/5 border-white/5 focus:ring-purple-500/20"
              />
            </div>
          </div>
          
          <div className="p-2 border-b border-zinc-800 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                  selectedCategory === cat ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300 bg-white/5 border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="p-3 overflow-y-auto space-y-1.5 flex-1 scrollbar-thin scrollbar-thumb-white/5">
            {filteredNodes.length > 0 ? (
              filteredNodes.map((template) => (
                <motion.button
                  key={template.type}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addNode(template)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors text-left group"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 shadow-lg`}
                       style={{ backgroundColor: `${
                           template.color === 'green' ? '#22c55e' : 
                           template.color === 'purple' ? '#a855f7' :
                           template.color === 'cyan' ? '#06b6d4' :
                           template.color === 'yellow' ? '#eab308' :
                           template.color === 'orange' ? '#f97316' :
                           template.color === 'blue' ? '#3b82f6' :
                           template.color === 'pink' ? '#ec4899' :
                           '#71717a'
                       }15` }}>
                    <template.icon className="w-4 h-4" 
                                   style={{ color: template.color === 'green' ? '#22c55e' : 
                                                   template.color === 'purple' ? '#a855f7' :
                                                   template.color === 'cyan' ? '#06b6d4' :
                                                   template.color === 'yellow' ? '#eab308' :
                                                   template.color === 'orange' ? '#f97316' :
                                                   template.color === 'blue' ? '#3b82f6' :
                                                   template.color === 'pink' ? '#ec4899' :
                                                   '#a1a1aa' }} 
                                   strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-medium text-zinc-200 block truncate leading-tight">{template.label}</span>
                    <span className="text-[9px] text-zinc-500 block truncate mt-0.5">{template.category} • {template.description}</span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </motion.button>
              ))
            ) : (
              <div className="py-12 text-center text-zinc-600 space-y-2">
                <Search className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-[10px] uppercase tracking-wider">No nodes found</p>
              </div>
            )}
          </div>
          
          {/* Execution Logs */}
          {executionLogs.length > 0 && (
            <div className="h-1/3 border-t border-zinc-800 bg-[#0A0A0A] flex flex-col">
              <div className="p-3 border-b border-zinc-800">
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Executions</h3>
              </div>
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                {executionLogs.slice(-15).map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] p-2 rounded bg-zinc-900/50 border border-zinc-800/50">
                    <span className={`font-mono ${
                      log.status === 'success' ? 'text-green-400' :
                      log.status === 'failed' ? 'text-red-400' :
                      log.status === 'running' ? 'text-yellow-400' :
                      'text-zinc-400'
                    }`}>
                      {log.node_id?.substring(0, 8) || log.type}
                    </span>
                    <span className="text-zinc-500 uppercase tracking-wide">{log.status || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Flow Canvas */}
        <div className="flex-1 relative bg-[#1A1A1A] h-full min-h-[500px]">
          {/* Floating Top Bar overlay */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg px-4 py-2 flex items-center shadow-lg">
               <input
                type="text"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                placeholder="My Workflow"
                data-testid="stream-name-input"
                className="bg-transparent text-sm font-semibold text-zinc-100 placeholder-zinc-500 focus:outline-none w-64"
              />
            </div>
          </div>

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
            snapGrid={[20, 20]}
            defaultEdgeOptions={memoEdgeOptions}
          >
            <Background color="#3f3f46" gap={20} size={1} />
            <Controls className="!bg-zinc-900 !border-zinc-800 !text-zinc-400 fill-zinc-400" />
            <Panel position="bottom-right" className="bg-transparent mb-4 mr-4">
              <div className="flex flex-col items-end gap-2">
                <div className="bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-zinc-800 text-[10px] font-medium text-zinc-400 tracking-wide uppercase">
                  {nodes.length} Nodes · {edges.length} Edges
                </div>
                {executing && (
                  <div className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex items-center gap-2 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" /> Executing
                  </div>
                )}
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-white">
              Configure {selectedNode?.data?.label}
            </DialogTitle>
          </DialogHeader>
          <NodeConfigForm
            node={selectedNode}
            status={nodeStatuses[selectedNode?.id]}
            streamId={streamId}
            onSave={handleSaveNodeConfig}
            onDelete={() => {
              setNodes((nds) => nds.filter((n) => n.id !== selectedNode?.id));
              setEdges((eds) => eds.filter((e) => e.source !== selectedNode?.id && e.target !== selectedNode?.id));
              setConfigDialogOpen(false);
              setSelectedNode(null);
            }}
            onClose={() => setConfigDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* AI Assistant Sidebar */}
      <BuilderAIAssistant 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
        onApplyDesign={handleApplyDesign}
      />

      {/* Scheduling Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="bg-[#121212] border-white/10 max-w-sm" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              Schedule Robo-Stream
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Cron Expression</label>
              <Input
                placeholder="*/5 * * * *"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                className="bg-black/50 border-white/10 text-white font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-2">
                Format: minute hour day-of-month month day-of-week. E.g.:<br/>
                <span className="text-purple-400 font-mono">*/5 * * * *</span> - Every 5 minutes<br/>
                <span className="text-purple-400 font-mono">0 * * * *</span> - Every hour<br/>
                <span className="text-purple-400 font-mono">0 0 * * *</span> - Daily at midnight
              </p>
            </div>
            
            {isScheduled && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs text-purple-300">
                Current Schedule: <span className="font-mono text-white">{currentSchedule}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveSchedule}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                Save Schedule
              </Button>
              {isScheduled && (
                <Button 
                  variant="outline"
                  onClick={handleDeleteSchedule}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
