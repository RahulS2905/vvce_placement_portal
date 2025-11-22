import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUserRoles, hasAnyRole, isAdmin } from '@/lib/roles';
import { Video, CheckCircle, XCircle, Clock, Eye, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ReviewVideos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    file: null as File | null,
  });
  const [userRoles, setUserRoles] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      if (user) {
        const roles = await getUserRoles(user.id);
        setUserRoles(roles);
      }
      checkAccess();
      fetchVideos();
    };
    init();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;
    const roles = await getUserRoles(user.id);
    if (!hasAnyRole(roles, ['training_head', 'admin'])) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  };

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles!videos_user_id_fkey(full_name, email, year, branch)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load videos.',
        variant: 'destructive',
      });
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const handleReview = async (videoId: string, status: 'approved' | 'rejected') => {
    setSubmitting(true);
    const video = videos.find(v => v.id === videoId);
    
    const { error } = await supabase
      .from('videos')
      .update({
        status,
        review_notes: reviewNotes,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update video status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Video ${status} successfully.`,
      });
      
      // Send email notification to video owner
      if (video) {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: video.profiles.email,
            subject: `Your Video Has Been ${status === 'approved' ? 'Approved' : 'Rejected'}`,
            type: 'video_review',
            data: {
              userName: video.profiles.full_name,
              title: video.title,
              status: status,
              reviewNotes: reviewNotes,
              link: `${window.location.origin}/videos`
            }
          }
        });
      }
      
      setSelectedVideo(null);
      setReviewNotes('');
      fetchVideos();
    }
    setSubmitting(false);
  };

  const handlePreview = async (video: any) => {
    const { data } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.file_path, 3600);

    if (data) {
      setPreviewUrl(data.signedUrl);
      setSelectedVideo(video);
    }
  };

  const handleDelete = async (video: any) => {
    if (!confirm(`Are you sure you want to delete "${video.title}"?`)) return;

    setSubmitting(true);

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([video.file_path]);

    if (storageError) {
      toast({
        title: 'Error',
        description: 'Failed to delete video file from storage.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', video.id);

    if (dbError) {
      toast({
        title: 'Error',
        description: 'Failed to delete video record.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Video deleted successfully.',
      });
      fetchVideos();
    }

    setSubmitting(false);
  };

  const handleAdminUpload = async () => {
    if (!uploadData.title || !uploadData.file) {
      toast({
        title: 'Error',
        description: 'Please provide a title and select a video file.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const fileExt = uploadData.file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, uploadData.file);

      if (uploadError) throw uploadError;

      // Insert record with approved status
      const { error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: user?.id,
          title: uploadData.title,
          description: uploadData.description,
          file_name: uploadData.file.name,
          file_path: filePath,
          file_size: uploadData.file.size,
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      toast({
        title: 'Success',
        description: 'Video uploaded and approved successfully.',
      });

      setShowUploadDialog(false);
      setUploadData({ title: '', description: '', file: null });
      fetchVideos();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload video.',
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const pendingVideos = videos.filter(v => v.status === 'pending');
  const reviewedVideos = videos.filter(v => v.status !== 'pending');

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Review Videos</h1>
            <p className="text-muted-foreground">
              Review and approve student video submissions
            </p>
          </div>
          {isAdmin(userRoles) && (
            <Button onClick={() => setShowUploadDialog(true)} size="lg">
              <Upload className="h-5 w-5 mr-2" />
              Add Video
            </Button>
          )}
        </div>

        {/* Pending Videos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Review ({pendingVideos.length})
            </CardTitle>
            <CardDescription>Videos waiting for approval</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : pendingVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending videos to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVideos.map(video => (
                  <div key={video.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{video.title}</h3>
                          {getStatusBadge(video.status)}
                        </div>
                        {video.description && (
                          <p className="text-sm text-muted-foreground mb-2">{video.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{video.profiles?.full_name}</span>
                          <span>•</span>
                          <span>{video.profiles?.email}</span>
                          <span>•</span>
                          <span>Year {video.profiles?.year}</span>
                          <span>•</span>
                          <span>{video.profiles?.branch}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Uploaded {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => handlePreview(video)} variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview & Review
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedVideo(video);
                              handleReview(video.id, 'rejected');
                            }}
                            variant="destructive"
                            size="sm"
                            disabled={submitting}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedVideo(video);
                              handleReview(video.id, 'approved');
                            }}
                            size="sm"
                            disabled={submitting}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleDelete(video)}
                          variant="outline"
                          size="sm"
                          disabled={submitting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviewed Videos */}
        <Card>
          <CardHeader>
            <CardTitle>Previously Reviewed ({reviewedVideos.length})</CardTitle>
            <CardDescription>Videos that have been approved or rejected</CardDescription>
          </CardHeader>
          <CardContent>
            {reviewedVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No reviewed videos yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {reviewedVideos.map(video => (
                  <div key={video.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{video.title}</h3>
                          {getStatusBadge(video.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {video.profiles?.full_name} • {video.profiles?.email}
                        </p>
                        {video.review_notes && (
                          <p className="text-sm bg-muted p-2 rounded mt-2">
                            <strong>Review Notes:</strong> {video.review_notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Reviewed {new Date(video.reviewed_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDelete(video)}
                        variant="outline"
                        size="sm"
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => {
        setSelectedVideo(null);
        setReviewNotes('');
        setPreviewUrl(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Video: {selectedVideo?.title}</DialogTitle>
            <DialogDescription>
              Watch the video and provide your review
            </DialogDescription>
          </DialogHeader>
          
          {previewUrl && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
              <video src={previewUrl} controls className="w-full h-full">
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          <div className="flex gap-2 justify-center mb-6">
            <Button
              onClick={() => handleReview(selectedVideo.id, 'rejected')}
              variant="destructive"
              disabled={submitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleReview(selectedVideo.id, 'approved')}
              disabled={submitting}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">Student Information</h4>
              <p className="text-sm text-muted-foreground">
                {selectedVideo?.profiles?.full_name} ({selectedVideo?.profiles?.email})
              </p>
              <p className="text-sm text-muted-foreground">
                Year {selectedVideo?.profiles?.year} • {selectedVideo?.profiles?.branch}
              </p>
            </div>

            {selectedVideo?.description && (
              <div>
                <h4 className="font-semibold mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Review Notes (Optional)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add feedback or notes for the student..."
                rows={4}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Video (Admin)</DialogTitle>
            <DialogDescription>
              Upload a video that will be automatically approved and visible to everyone
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={uploadData.title}
                onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                placeholder="Enter video title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadData.description}
                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                placeholder="Enter video description (optional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="file">Video File *</Label>
              <Input
                id="file"
                type="file"
                accept="video/*"
                onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
              />
              {uploadData.file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {uploadData.file.name} ({(uploadData.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAdminUpload} disabled={submitting}>
                {submitting ? 'Uploading...' : 'Upload & Approve'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
