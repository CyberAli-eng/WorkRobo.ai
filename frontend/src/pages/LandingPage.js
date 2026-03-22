import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Eye, 
  Mail, 
  Bot, 
  ArrowRight, 
  Sparkles,
  Network,
  Shield,
  Cpu
} from 'lucide-react';
import { RoboCoreCanvas } from '../components/three/RoboCoreCanvas';
import { useAuth } from '../contexts/AuthContext';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const features = [
  {
    icon: Network,
    title: 'The Synapse',
    subtitle: 'Visual Builder',
    description: 'Create powerful automation flows with our node-based visual editor. Connect apps, APIs, and AI without code.',
    color: '#8B5CF6'
  },
  {
    icon: Eye,
    title: 'The Sentry',
    subtitle: 'Web Monitoring',
    description: 'Monitor any webpage for changes. Detect updates, track competitors, and get instant alerts.',
    color: '#06B6D4'
  },
  {
    icon: Mail,
    title: 'The Pulse',
    subtitle: 'Smart Messaging',
    description: 'High-scale email campaigns with AI personalization. Reach millions of contacts effortlessly.',
    color: '#D946EF'
  },
  {
    icon: Bot,
    title: 'The Hive',
    subtitle: 'Agent Logic',
    description: 'Deploy autonomous WorkRobos that monitor events and execute complex multi-step automations.',
    color: '#22C55E'
  }
];

const stats = [
  { value: '10M+', label: 'Automations Run' },
  { value: '50K+', label: 'Active Users' },
  { value: '99.9%', label: 'Uptime' },
  { value: '500+', label: 'Integrations' }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold font-outfit text-white">WorkRobo.ai</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                data-testid="nav-dashboard-btn"
                className="px-6 py-2.5 rounded-full bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.4)]"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  data-testid="nav-login-btn"
                  className="px-6 py-2.5 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/auth?mode=signup')}
                  data-testid="nav-signup-btn"
                  className="px-6 py-2.5 rounded-full bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.4)]"
                >
                  Get Started
                </button>
              </>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20">
        {/* 3D Background */}
        <RoboCoreCanvas />
        
        {/* Grid Background */}
        <div className="absolute inset-0 grid-bg opacity-30" />
        
        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeInUp} className="flex justify-center">
              <div className="wr-badge">
                <Sparkles className="w-4 h-4" />
                <span>The Future of Automation is Here</span>
              </div>
            </motion.div>
            
            {/* Headline */}
            <motion.h1 
              variants={fadeInUp}
              className="text-5xl md:text-7xl lg:text-8xl font-black font-outfit tracking-tighter text-white"
            >
              Automate{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-500 to-cyan-400">
                Everything
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            >
              The all-in-one autonomous automation engine. Build visual workflows, 
              monitor the web, send smart campaigns, and deploy AI agents — all from one platform.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={handleGetStarted}
                data-testid="hero-get-started-btn"
                className="group px-8 py-4 rounded-full bg-purple-600 text-white font-semibold text-lg hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:shadow-[0_0_40px_rgba(139,92,246,0.6)] flex items-center gap-2"
              >
                Start Automating
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                data-testid="hero-learn-more-btn"
                className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
              >
                See How It Works
              </button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-zinc-600 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-purple-500"
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-black font-outfit text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-zinc-500 text-sm uppercase tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-4 block">
              Core Modules
            </span>
            <h2 className="text-4xl md:text-5xl font-bold font-outfit text-white tracking-tight mb-6">
              Four Engines, One Platform
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              Each module is a powerhouse on its own. Together, they create an unstoppable automation ecosystem.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-8 group hover:border-purple-500/50 transition-colors cursor-pointer relative overflow-hidden"
              >
                {/* Glow effect */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${feature.color}15 0%, transparent 50%)` }}
                />
                
                <div className="relative z-10">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon className="w-7 h-7" style={{ color: feature.color }} strokeWidth={1.5} />
                  </div>
                  
                  <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: feature.color }}>
                    {feature.subtitle}
                  </div>
                  <h3 className="text-2xl font-semibold font-outfit text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card p-12 md:p-16 relative overflow-hidden"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 flex items-center justify-center mx-auto mb-8">
                <Zap className="w-8 h-8 text-purple-400" strokeWidth={1.5} />
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold font-outfit text-white mb-4">
                Ready to Automate Your World?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Join thousands of teams who've transformed their workflows with WorkRobo.ai. 
                Start building powerful automations in minutes.
              </p>
              
              <button
                onClick={handleGetStarted}
                data-testid="cta-get-started-btn"
                className="group px-10 py-4 rounded-full bg-purple-600 text-white font-semibold text-lg hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center gap-2 mx-auto"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-lg font-semibold text-white">WorkRobo.ai</span>
            </div>
            
            <div className="flex items-center gap-8 text-sm text-zinc-500">
              <span>© 2026 WorkRobo.ai</span>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
