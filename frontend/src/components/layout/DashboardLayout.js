import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, 
  LayoutDashboard, 
  Network, 
  Eye, 
  Mail, 
  Bot, 
  Settings,
  LogOut,
  ChevronRight,
  ShoppingBag,
  PenTool
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/builder', icon: Network, label: 'Synapse', subtitle: 'Visual Builder' },
  { path: '/sentry', icon: Eye, label: 'Sentry', subtitle: 'Web Monitor' },
  { path: '/pulse', icon: Mail, label: 'Pulse', subtitle: 'Messaging' },
  { path: '/pulse-designer', icon: PenTool, label: 'Designer', subtitle: 'Pulse Templates' },
  { path: '/hive', icon: Bot, label: 'Hive', subtitle: 'WorkRobos' },
  { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace', subtitle: 'Robo-Gallery' },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside className="w-[280px] h-screen fixed left-0 top-0 bg-[#0A0A0A]/80 backdrop-blur-2xl border-r border-white/8 flex flex-col z-40">
      {/* Logo */}
      <div className="p-6 border-b border-white/8">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate('/')}
          data-testid="sidebar-logo"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-lg font-bold font-outfit text-white">WorkRobo.ai</span>
            <p className="text-xs text-zinc-500">Automation Engine</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? 'bg-purple-600/15 text-purple-400' 
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" strokeWidth={1.5} />
              <div className="flex-1">
                <span className="font-medium">{item.label}</span>
                {item.subtitle && (
                  <p className="text-xs text-zinc-500">{item.subtitle}</p>
                )}
              </div>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-purple-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/8 space-y-2">
        <NavLink
          to="/settings"
          data-testid="nav-settings"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
            location.pathname === '/settings'
              ? 'bg-purple-600/15 text-purple-400'
              : 'text-zinc-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-medium">Settings</span>
        </NavLink>

        <button
          onClick={handleSignOut}
          data-testid="nav-signout"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-medium">Sign Out</span>
        </button>

        {/* User Info */}
        {user && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-white/5">
            <p className="text-sm font-medium text-white truncate">
              {user.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-zinc-500 truncate">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export const DashboardLayout = ({ children, title, subtitle, actions }) => {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Sidebar />
      
      {/* Main Content */}
      <main className="ml-[280px] min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-white/8 bg-[#0A0A0A]/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="h-full px-8 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold font-outfit text-white">{title}</h1>
              {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
