import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/roles';
import { Megaphone, Plus, Search, Trash2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

const announcementSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  content: z.string().trim().min(1, "Content is required").max(5000, "Content must be less than 5000 characters"),
  targetYear: z.string(),
  targetBranch: z.string()
});

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  
  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetYear, setTargetYear] = useState<string>('all');
  const [targetBranch, setTargetBranch] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRoles();
      fetchAnnouncements();
    }
  }, [user]);

  useEffect(() => {
    filterAnnouncements();
  }, [announcements, searchQuery, filterYear, filterBranch]);

  const filterAnnouncements = () => {
    let filtered = announcements;

    if (searchQuery) {
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(a => 
        !a.target_year || a.target_year.toString() === filterYear
      );
    }

    if (filterBranch !== 'all') {
      filtered = filtered.filter(a => 
        !a.target_branch || a.target_branch === filterBranch
      );
    }

    setFilteredAnnouncements(filtered);
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    setProfile(data);
  };

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    if (data) {
      setUserRoles(data.map(r => r.role as UserRole));
    }
  };

  const fetchAnnouncements = async () => {
    let query = supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    // Filter by student's year and branch if they're a student
    if (profile && userRoles.includes('student')) {
      query = query.or(`target_year.is.null,target_year.eq.${profile.year}`);
      query = query.or(`target_branch.is.null,target_branch.eq.${profile.branch}`);
    }

    const { data } = await query;
    setAnnouncements(data || []);
  };

  const canCreateAnnouncements = userRoles.some(r => 
    ['admin', 'placement_head', 'training_head'].includes(r)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type (images and PDFs)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Only images (JPEG, PNG, WEBP, GIF) and PDF files are allowed",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);

      // Create preview for images only
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string, filePath?: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    // Delete file from storage if exists
    if (filePath) {
      await supabase.storage
        .from('announcements')
        .remove([filePath]);
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement deleted successfully",
      });
      fetchAnnouncements();
    }
  };

  const sendAnnouncementNotifications = async (announcementTitle: string, announcementContent: string, year: string, branch: string) => {
    try {
      // Fetch eligible students
      let query = supabase
        .from('profiles')
        .select('id, full_name, email');

      if (year !== 'all') {
        query = query.eq('year', parseInt(year));
      }
      if (branch !== 'all') {
        query = query.eq('branch', branch);
      }

      const { data: students } = await query;

      if (students) {
        // Send email to each eligible student
        for (const student of students) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: student.email,
              subject: `New Announcement: ${announcementTitle}`,
              type: 'announcement',
              data: {
                userName: student.full_name,
                title: announcementTitle,
                content: announcementContent,
                link: `${window.location.origin}/announcements`
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending announcement notifications:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    // Validate input using zod schema
    const validationResult = announcementSchema.safeParse({
      title,
      content,
      targetYear,
      targetBranch
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0].message;
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    let filePath = null;
    let fileName = null;
    let fileType = null;

    // Upload file if selected
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      filePath = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, selectedFile);

      if (uploadError) {
        toast({
          title: "Error",
          description: "Failed to upload file",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      fileName = selectedFile.name;
      fileType = selectedFile.type;
    }

    const { error } = await supabase.from('announcements').insert({
      title: validationResult.data.title,
      content: validationResult.data.content,
      target_year: targetYear === 'all' ? null : parseInt(targetYear),
      target_branch: targetBranch === 'all' ? null : targetBranch,
      created_by: user?.id,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
      
      // Send email notifications to eligible students
      sendAnnouncementNotifications(title, content, targetYear, targetBranch);
      
      setDialogOpen(false);
      setTitle('');
      setContent('');
      setTargetYear('all');
      setTargetBranch('all');
      setSelectedFile(null);
      setFilePreview(null);
      fetchAnnouncements();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Announcements</h1>
          </div>

          {canCreateAnnouncements && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                  <DialogDescription>
                    Share important updates with students
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[calc(90vh-120px)] pr-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter announcement title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter announcement details"
                        rows={6}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Target Year</Label>
                        <Select value={targetYear} onValueChange={setTargetYear}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Years</SelectItem>
                            <SelectItem value="1">1st Year</SelectItem>
                            <SelectItem value="2">2nd Year</SelectItem>
                            <SelectItem value="3">3rd Year</SelectItem>
                            <SelectItem value="4">4th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Target Branch</Label>
                        <Select value={targetBranch} onValueChange={setTargetBranch}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Mechanical">Mechanical</SelectItem>
                            <SelectItem value="Civil">Civil</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Attach File (Optional)</Label>
                      <div className="flex flex-col gap-2">
                        <Input
                          id="file"
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload an image or PDF (max 5MB). Perfect for sharing placement success photos!
                        </p>
                        {filePreview && (
                          <div className="mt-2">
                            <img 
                              src={filePreview} 
                              alt="Preview" 
                              className="max-h-40 rounded-lg border"
                            />
                          </div>
                        )}
                        {selectedFile && !filePreview && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            <span>{selectedFile.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateAnnouncement} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Creating...' : 'Create Announcement'}
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filter Section */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="md:w-[180px]">
                  <SelectValue placeholder="Filter by Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder="Filter by Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-4 pr-4">
            {filteredAnnouncements.map(announcement => (
            <Card key={announcement.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{announcement.title}</CardTitle>
                    <CardDescription>
                      By {announcement.profiles?.full_name} • {new Date(announcement.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-2">
                      {announcement.target_year && (
                        <Badge variant="secondary">Year {announcement.target_year}</Badge>
                      )}
                      {announcement.target_branch && (
                        <Badge variant="outline">{announcement.target_branch}</Badge>
                      )}
                    </div>
                    {canCreateAnnouncements && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAnnouncement(announcement.id, announcement.file_path)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{announcement.content}</p>
                
                {announcement.file_path && (
                  <div className="mt-4">
                    {announcement.file_type?.startsWith('image/') ? (
                      <img 
                        src={`${supabase.storage.from('announcements').getPublicUrl(announcement.file_path).data.publicUrl}`}
                        alt={announcement.file_name || 'Announcement attachment'}
                        className="max-w-full rounded-lg border shadow-sm"
                      />
                    ) : (
                      <a 
                        href={`${supabase.storage.from('announcements').getPublicUrl(announcement.file_path).data.publicUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <Upload className="h-4 w-4" />
                        {announcement.file_name || 'View attachment'}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredAnnouncements.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
