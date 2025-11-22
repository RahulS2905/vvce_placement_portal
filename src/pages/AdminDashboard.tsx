import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/lib/roles';
import { Users, Megaphone, Briefcase, Video, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    announcements: 0,
    placements: 0,
    pendingVideos: 0,
    totalVideos: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [recentPlacements, setRecentPlacements] = useState<any[]>([]);
  const [pendingVideos, setPendingVideos] = useState<any[]>([]);

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
    const [users, students, announcements, placements, videos, pendingVideos] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('announcements').select('id', { count: 'exact', head: true }),
      supabase.from('placements').select('id', { count: 'exact', head: true }),
      supabase.from('videos').select('id', { count: 'exact', head: true }),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setStats({
      totalUsers: users.count || 0,
      totalStudents: students.count || 0,
      announcements: announcements.count || 0,
      placements: placements.count || 0,
      totalVideos: videos.count || 0,
      pendingVideos: pendingVideos.count || 0,
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

    const { data: videos } = await supabase
      .from('videos')
      .select('*, profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentAnnouncements(announcements || []);
    setRecentPlacements(placements || []);
    setPendingVideos(videos || []);
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
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name}
          </p>
          <div className="flex gap-2 mt-2">
            {userRoles.map(role => (
              <Badge key={role} variant={getRoleBadgeVariant(role)}>
                {role.replace('_', ' ').toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Announcements</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.announcements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Placements</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.placements}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
              <Video className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVideos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVideos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/admin">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Manage Users
                </CardTitle>
                <CardDescription>View and manage user roles</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/review-videos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Review Videos
                </CardTitle>
                <CardDescription>{stats.pendingVideos} pending reviews</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/announcements">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Announcements
                </CardTitle>
                <CardDescription>Create and manage announcements</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Recent Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
              <CardDescription>Latest updates from the portal</CardDescription>
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
              <CardTitle>Pending Video Reviews</CardTitle>
              <CardDescription>Videos awaiting approval</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingVideos.map(video => (
                <div key={video.id} className="border-l-4 border-accent pl-4">
                  <h4 className="font-semibold">{video.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    Submitted by {video.profiles?.full_name}
                  </p>
                  <Badge variant="outline" className="mt-1">Pending</Badge>
                </div>
              ))}
              <Link to="/review-videos">
                <Button variant="outline" className="w-full">
                  Review All Videos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
