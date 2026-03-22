import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Mail, 
  Trash2, 
  Users,
  Send,
  Loader2,
  FileText,
  UserPlus
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { pulseApi } from '../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';

export default function PulsePage() {
  const [lists, setLists] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [sending, setSending] = useState(null);
  
  const [listForm, setListForm] = useState({ name: '', description: '' });
  const [contactForm, setContactForm] = useState({ email: '', name: '' });
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    list_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listsRes, campaignsRes] = await Promise.all([
        pulseApi.getLists(),
        pulseApi.getCampaigns()
      ]);
      setLists(listsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async () => {
    if (!listForm.name) {
      toast.error('List name is required');
      return;
    }
    try {
      const response = await pulseApi.createList(listForm);
      setLists([...lists, response.data]);
      setIsListDialogOpen(false);
      setListForm({ name: '', description: '' });
      toast.success('List created');
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleAddContact = async () => {
    if (!contactForm.email || !selectedList) {
      toast.error('Email is required');
      return;
    }
    try {
      await pulseApi.addContact(selectedList.id, contactForm);
      fetchData();
      setIsContactDialogOpen(false);
      setContactForm({ email: '', name: '' });
      toast.success('Contact added');
    } catch (error) {
      toast.error('Failed to add contact');
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.list_id) {
      toast.error('All fields are required');
      return;
    }
    try {
      const response = await pulseApi.createCampaign(campaignForm);
      setCampaigns([...campaigns, response.data]);
      setIsCampaignDialogOpen(false);
      setCampaignForm({ name: '', subject: '', html_content: '', list_id: '' });
      toast.success('Campaign created');
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Send this campaign to all contacts?')) return;
    
    setSending(campaignId);
    try {
      const response = await pulseApi.sendCampaign(campaignId);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to send campaign');
    } finally {
      setSending(null);
    }
  };

  return (
    <DashboardLayout
      title="The Pulse"
      subtitle="Email Campaigns & Contact Management"
    >
      <Tabs defaultValue="lists" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="lists" data-testid="pulse-lists-tab" className="data-[state=active]:bg-purple-600">
            <Users className="w-4 h-4 mr-2" /> Contact Lists
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="pulse-campaigns-tab" className="data-[state=active]:bg-purple-600">
            <Mail className="w-4 h-4 mr-2" /> Campaigns
          </TabsTrigger>
        </TabsList>

        {/* Contact Lists Tab */}
        <TabsContent value="lists" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-list-btn" className="bg-purple-600 hover:bg-purple-500">
                  <Plus className="w-4 h-4 mr-2" /> Create List
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121212] border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Contact List</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="List Name"
                    value={listForm.name}
                    onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                    data-testid="list-name-input"
                    className="bg-black/50 border-white/10 text-white"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={listForm.description}
                    onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                    data-testid="list-description-input"
                    className="bg-black/50 border-white/10 text-white"
                  />
                  <Button 
                    onClick={handleCreateList}
                    data-testid="create-list-btn"
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    Create List
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : lists.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Users className="w-16 h-16 text-zinc-600 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-semibold text-white mb-2">No Contact Lists</h3>
              <p className="text-zinc-500 mb-6">Create a list to start managing contacts</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedList(list);
                        setIsContactDialogOpen(true);
                      }}
                      data-testid={`add-contact-${list.id}`}
                      className="text-zinc-400 hover:text-white"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{list.name}</h3>
                  <p className="text-sm text-zinc-500 mb-2">{list.description || 'No description'}</p>
                  <p className="text-2xl font-bold text-purple-400">{list.contact_count} <span className="text-sm font-normal text-zinc-500">contacts</span></p>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add Contact Dialog */}
          <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
            <DialogContent className="bg-[#121212] border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white">Add Contact to {selectedList?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  data-testid="contact-email-input"
                  className="bg-black/50 border-white/10 text-white"
                />
                <Input
                  placeholder="Name (optional)"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  data-testid="contact-name-input"
                  className="bg-black/50 border-white/10 text-white"
                />
                <Button 
                  onClick={handleAddContact}
                  data-testid="add-contact-btn"
                  className="w-full bg-purple-600 hover:bg-purple-500"
                >
                  Add Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-campaign-btn" className="bg-purple-600 hover:bg-purple-500">
                  <Plus className="w-4 h-4 mr-2" /> Create Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121212] border-white/10 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Create Email Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Campaign Name"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    data-testid="campaign-name-input"
                    className="bg-black/50 border-white/10 text-white"
                  />
                  <Input
                    placeholder="Email Subject"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                    data-testid="campaign-subject-input"
                    className="bg-black/50 border-white/10 text-white"
                  />
                  <select
                    value={campaignForm.list_id}
                    onChange={(e) => setCampaignForm({ ...campaignForm, list_id: e.target.value })}
                    data-testid="campaign-list-select"
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white"
                  >
                    <option value="">Select a list</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name} ({list.contact_count} contacts)</option>
                    ))}
                  </select>
                  <Textarea
                    placeholder="Email HTML Content"
                    value={campaignForm.html_content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, html_content: e.target.value })}
                    data-testid="campaign-content-input"
                    rows={8}
                    className="bg-black/50 border-white/10 text-white"
                  />
                  <Button 
                    onClick={handleCreateCampaign}
                    data-testid="create-campaign-btn"
                    className="w-full bg-purple-600 hover:bg-purple-500"
                  >
                    Create Campaign
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {campaigns.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Mail className="w-16 h-16 text-zinc-600 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-semibold text-white mb-2">No Campaigns</h3>
              <p className="text-zinc-500 mb-6">Create your first email campaign</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-purple-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                        <p className="text-sm text-zinc-500">Subject: {campaign.subject}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            campaign.status === 'sent' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {campaign.status}
                          </span>
                          {campaign.sent_count > 0 && (
                            <span className="text-xs text-zinc-500">
                              Sent to {campaign.sent_count} contacts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {campaign.status !== 'sent' && (
                      <Button
                        onClick={() => handleSendCampaign(campaign.id)}
                        disabled={sending === campaign.id}
                        data-testid={`send-campaign-${campaign.id}`}
                        className="bg-green-600 hover:bg-green-500"
                      >
                        {sending === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" /> Send
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
