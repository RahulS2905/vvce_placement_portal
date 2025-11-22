import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  created_at: string;
  user_id: string;
}

export default function ApprovedVideos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApprovedVideos();
    }
  }, [user]);

  const fetchApprovedVideos = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        description,
        file_path,
        created_at,
        user_id
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching videos:', error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const getVideoUrl = (filePath: string) => {
    const { data } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading videos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Video className="h-10 w-10 text-primary" />
              Training Videos
            </h1>
            <p className="text-muted-foreground">
              Watch approved training videos from admins and fellow students
            </p>
          </div>

          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  No approved videos available yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2">{video.title}</span>
                      <Badge variant="secondary" className="shrink-0">
                        Approved
                      </Badge>
                    </CardTitle>
                    <CardDescription className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>Training Video</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(video.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {video.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    <video
                      controls
                      className="w-full rounded-lg border border-border"
                      src={getVideoUrl(video.file_path)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
