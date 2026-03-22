import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Network, 
  Eye, 
  Mail, 
  Bot, 
  Plus,
  TrendingUp,
  Activity,
  Users,
  Zap
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { statsApi } from '../lib/api';
import { toast } from 'sonner';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const StatCard = ({ icon: Icon, label, value, subValue, color, delay }) => (
  <motion.div
    variants={fadeInUp}
    initial="hidden"
    animate="visible"
    transition={{ delay }}
    className="glass-card p-6 relative overflow-hidden group"
  >
    <div 
      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ background: `radial-gradient(circle at 0% 0%, ${color}15 0%, transparent 50%)` }}
    />
    <div className="relative z-10">
      <div 
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color }} strokeWidth={1.5} />
      </div>
      <p className="text-zinc-500 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold font-outfit text-white">{value}</p>
      {subValue && (
        <p className="text-sm text-zinc-500 mt-1">{subValue}</p>
      )}
    </div>
  </motion.div>
);

const QuickActionCard = ({ icon: Icon, title, description, onClick, color }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="glass-card p-6 text-left w-full group hover:border-purple-500/50 transition-colors"
  >
    <div 
      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.5} />
    </div>
    <h3 className="font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
      {title}
    </h3>
    <p className="text-sm text-zinc-500">{description}</p>
  </motion.button>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    streams: { total: 0, active: 0 },
    sentry: { total: 0 },
    contacts: { total: 0 },
    robos: { total: 0, active: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await statsApi.getDashboard();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Use default values on error
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Network,
      title: 'Create Robo-Stream',
      description: 'Build a new automation workflow',
      color: '#8B5CF6',
      onClick: () => navigate('/builder')
    },
    {
      icon: Eye,
      title: 'Add Sentry Target',
      description: 'Monitor a webpage for changes',
      color: '#06B6D4',
      onClick: () => navigate('/sentry')
    },
    {
      icon: Mail,
      title: 'Start Campaign',
      description: 'Launch an email campaign',
      color: '#D946EF',
      onClick: () => navigate('/pulse')
    },
    {
      icon: Bot,
      title: 'Deploy WorkRobo',
      description: 'Create an autonomous agent',
      color: '#22C55E',
      onClick: () => navigate('/hive')
    }
  ];

  return (
    <DashboardLayout 
      title="Dashboard" 
      subtitle="Welcome back! Here's your automation overview."
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Network}
            label="Robo-Streams"
            value={stats.streams.total}
            subValue={`${stats.streams.active} active`}
            color="#8B5CF6"
            delay={0}
          />
          <StatCard
            icon={Eye}
            label="Sentry Targets"
            value={stats.sentry.total}
            subValue="Monitoring"
            color="#06B6D4"
            delay={0.1}
          />
          <StatCard
            icon={Users}
            label="Total Contacts"
            value={stats.contacts.total}
            subValue="In lists"
            color="#D946EF"
            delay={0.2}
          />
          <StatCard
            icon={Bot}
            label="WorkRobos"
            value={stats.robos.total}
            subValue={`${stats.robos.active} active`}
            color="#22C55E"
            delay={0.3}
          />
        </div>

        {/* Quick Actions */}
        <motion.div variants={fadeInUp}>
          <h2 className="text-lg font-semibold font-outfit text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <QuickActionCard key={action.title} {...action} />
            ))}
          </div>
        </motion.div>

        {/* Activity Feed (Placeholder) */}
        <motion.div variants={fadeInUp} className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold font-outfit text-white">Recent Activity</h2>
            <Activity className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white">
                    {i === 0 && 'System initialized - Ready for automation'}
                    {i === 1 && 'Create your first Robo-Stream to get started'}
                    {i === 2 && 'Monitor webpages with Sentry for updates'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Just now</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
