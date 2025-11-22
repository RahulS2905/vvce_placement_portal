import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/roles';
import { Megaphone, Briefcase, FileText, Video, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [stats, setStats] = useState({
    announcements: 0,
    placements: 0,
    resumes: 0,
    videos: 0,
    notifications: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [recentPlacements, setRecentPlacements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRoles();
      fetchStats();
      fetchRecentData();
    }
  }, [user]);

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

  const fetchStats = async () => {
    const [announcements, placements, resumes, videos, notifications] = await Promise.all([
      supabase.from('announcements').select('id', { count: 'exact', head: true }),
      supabase.from('placements').select('id', { count: 'exact', head: true }),
      supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('user_id', user?.id),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user?.id).eq('read', false),
    ]);

    setStats({
      announcements: announcements.count || 0,
      placements: placements.count || 0,
      resumes: resumes.count || 0,
      videos: videos.count || 0,
      notifications: notifications.count || 0,
    });
  };

  const fetchRecentData = async () => {
    const { data: announcements } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: placements } = await supabase
      .from('placements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    setRecentAnnouncements(announcements || []);
    setRecentPlacements(placements || []);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'placement_head':
        return 'default';
      case 'training_head':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {profile?.full_name}!
          </h1>
          <p className="text-muted-foreground">
            {profile?.year && `Year ${profile.year}`} {profile?.branch && `• ${profile.branch}`}
          </p>
          <div className="flex gap-2 mt-2">
            {userRoles.map(role => (
              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                {role.replace('_', ' ').toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Link to="/announcements" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                <Megaphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.announcements}</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/placements" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Placements</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.placements}</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/resume" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Resumes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.resumes}</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/videos" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Videos</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.videos}</div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/notifications" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.notifications}</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
              <CardDescription>Latest updates from placement & training teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentAnnouncements.map(announcement => (
                <div key={announcement.id} className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {announcement.content}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    By {announcement.profiles?.full_name}
                  </p>
                </div>
              ))}
              <Link to="/announcements">
                <Button variant="outline" className="w-full">
                  View All Announcements
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Placements</CardTitle>
              <CardDescription>Latest opportunities for students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentPlacements.map(placement => (
                <div key={placement.id} className="border-l-4 border-accent pl-4">
                  <h4 className="font-semibold">{placement.company_name}</h4>
                  <p className="text-sm text-muted-foreground">{placement.role}</p>
                  <p className="text-xs text-accent mt-1">{placement.package}</p>
                </div>
              ))}
              <Link to="/placements">
                <Button variant="outline" className="w-full">
                  View All Placements
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
