import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Video, Upload, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Videos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [user]);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
      return;
    }

    // Fetch reviewer names for videos that have been reviewed
    const reviewedVideos = data?.filter(v => v.reviewed_by) || [];
    if (reviewedVideos.length > 0) {
      const reviewerIds = reviewedVideos.map(v => v.reviewed_by);
      const { data: reviewers } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', reviewerIds);
      
      const reviewerMap = new Map(reviewers?.map(r => [r.id, r.full_name]) || []);
      const videosWithReviewers = data?.map(video => ({
        ...video,
        reviewer_name: video.reviewed_by ? reviewerMap.get(video.reviewed_by) : null
      }));
      setVideos(videosWithReviewers || []);
    } else {
      setVideos(data || []);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Invalid File",
        description: "Please select a video file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Video size should be less than 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!title || !selectedFile) {
      toast({
        title: "Missing Fields",
        description: "Please provide title and select a video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(fileName, selectedFile);

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Create database entry
    const { error: dbError } = await supabase.from('videos').insert({
      user_id: user?.id,
      title,
      description,
      file_name: selectedFile.name,
      file_path: fileName,
      file_size: selectedFile.size,
      status: 'pending',
    });

    if (dbError) {
      toast({
        title: "Error",
        description: dbError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Video uploaded and sent for approval",
      });
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      fetchVideos();
    }

    setUploading(false);
  };

  const handleDelete = async (video: any) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([video.file_path]);

    if (storageError) {
      toast({
        title: "Error",
        description: storageError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', video.id);

    if (dbError) {
      toast({
        title: "Error",
        description: dbError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Video deleted successfully",
      });
      fetchVideos();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Video className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">My Videos</h1>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Upload Video
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Video</DialogTitle>
                <DialogDescription>
                  Upload your introduction video for review (Max 50MB)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Self Introduction"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add notes about your video"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-file">Video File</Label>
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={uploading || !selectedFile}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {videos.map(video => (
            <Card key={video.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{video.title}</CardTitle>
                      {getStatusBadge(video.status)}
                    </div>
                    <CardDescription>
                      Uploaded on {new Date(video.created_at).toLocaleDateString()} • {(video.file_size / (1024 * 1024)).toFixed(2)} MB
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(video)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {video.description && (
                  <p className="text-sm">{video.description}</p>
                )}

                {video.status === 'approved' && (
                  <div className="p-3 bg-success/10 rounded-md">
                    <p className="text-sm font-semibold text-success">
                      ✓ Video approved{video.reviewer_name ? ` by ${video.reviewer_name}` : ''}
                    </p>
                    {video.review_notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {video.review_notes}
                      </p>
                    )}
                  </div>
                )}

                {video.status === 'rejected' && (
                  <div className="p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm font-semibold text-destructive">
                      × Video rejected
                    </p>
                    {video.review_notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {video.review_notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {videos.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No videos uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your first video for review
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
