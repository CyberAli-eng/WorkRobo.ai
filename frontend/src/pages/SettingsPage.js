import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Key, 
  Bell,
  Moon,
  Sun,
  Save,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';

export default function SettingsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    notifications: true,
    darkMode: true
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved');
    setSaving(false);
  };

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your account preferences"
    >
      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            Profile
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Full Name</label>
              <Input
                value={settings.fullName}
                onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
                data-testid="settings-name-input"
                className="bg-black/50 border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Email</label>
              <Input
                value={settings.email}
                disabled
                data-testid="settings-email-input"
                className="bg-black/50 border-white/10 text-white opacity-50"
              />
              <p className="text-xs text-zinc-500 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            Preferences
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-sm text-zinc-500">Receive updates about your automations</p>
              </div>
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, notifications: checked })}
                data-testid="notifications-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Dark Mode</p>
                <p className="text-sm text-zinc-500">Use dark theme throughout the app</p>
              </div>
              <Switch
                checked={settings.darkMode}
                onCheckedChange={(checked) => setSettings({ ...settings, darkMode: checked })}
                data-testid="darkmode-toggle"
              />
            </div>
          </div>
        </motion.div>

        {/* API Keys Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            API Keys
          </h2>
          
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-zinc-400 text-sm">
              API keys allow external applications to interact with your WorkRobo automations.
            </p>
            <Button 
              variant="outline" 
              className="mt-4 border-white/10 text-white hover:bg-white/10"
              data-testid="generate-api-key-btn"
            >
              Generate API Key
            </Button>
          </div>
        </motion.div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          data-testid="save-settings-btn"
          className="w-full bg-purple-600 hover:bg-purple-500"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </DashboardLayout>
  );
}
