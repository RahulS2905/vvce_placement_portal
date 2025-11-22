import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { getUserRoles, hasAnyRole } from '@/lib/roles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation } from '@/components/Navigation';
import { Users, Briefcase, Megaphone, Video, FileText, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  totalStudents: number;
  totalPlacements: number;
  totalAnnouncements: number;
  pendingVideos: number;
  approvedVideos: number;
  avgAtsScore: number;
  placementRate: number;
}

interface ChartData {
  placementsByCompany: Array<{ name: string; count: number }>;
  studentsByYear: Array<{ name: string; count: number }>;
  studentsByBranch: Array<{ name: string; count: number }>;
  videoStatus: Array<{ name: string; value: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && user) {
        const roles = await getUserRoles(user.id);
        const hasAccess = hasAnyRole(roles, ['admin', 'placement_head', 'training_head']);
        
        if (!hasAccess) {
          navigate('/dashboard');
          return;
        }
        
        setAuthorized(true);
        await fetchAnalytics();
      }
    };

    checkAuth();
  }, [user, authLoading, navigate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        studentsResult,
        placementsResult,
        announcementsResult,
        videosResult,
        resumesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('placements').select('company_name', { count: 'exact' }),
        supabase.from('announcements').select('*', { count: 'exact' }),
        supabase.from('videos').select('status'),
        supabase.from('resumes').select('ats_score'),
      ]);

      // Calculate stats
      const totalStudents = studentsResult.count || 0;
      const totalPlacements = placementsResult.count || 0;
      const totalAnnouncements = announcementsResult.count || 0;

      const videos = videosResult.data || [];
      const pendingVideos = videos.filter(v => v.status === 'pending').length;
      const approvedVideos = videos.filter(v => v.status === 'approved').length;

      const resumes = resumesResult.data || [];
      const avgAtsScore = resumes.length > 0
        ? Math.round(resumes.reduce((sum, r) => sum + (r.ats_score || 0), 0) / resumes.length)
        : 0;

      const placementRate = totalStudents > 0 ? Math.round((totalPlacements / totalStudents) * 100) : 0;

      setStats({
        totalStudents,
        totalPlacements,
        totalAnnouncements,
        pendingVideos,
        approvedVideos,
        avgAtsScore,
        placementRate,
      });

      // Prepare chart data
      const placements = placementsResult.data || [];
      const placementsByCompany = Object.entries(
        placements.reduce((acc, p) => {
          acc[p.company_name] = (acc[p.company_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const students = studentsResult.data || [];
      const studentsByYear = Object.entries(
        students.reduce((acc, s) => {
          const year = `Year ${s.year || 'Unknown'}`;
          acc[year] = (acc[year] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      const studentsByBranch = Object.entries(
        students.reduce((acc, s) => {
          const branch = s.branch || 'Unknown';
          acc[branch] = (acc[branch] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, count]) => ({ name, count }));

      const videoStatus = [
        { name: 'Pending', value: pendingVideos },
        { name: 'Approved', value: approvedVideos },
        { name: 'Rejected', value: videos.filter(v => v.status === 'rejected').length },
      ].filter(item => item.value > 0);

      setChartData({
        placementsByCompany,
        studentsByYear,
        studentsByBranch,
        videoStatus,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Overview of placement portal statistics and insights</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered users</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Placements</CardTitle>
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalPlacements}</div>
                  <p className="text-xs text-muted-foreground mt-1">Job opportunities</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Announcements</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAnnouncements}</div>
                  <p className="text-xs text-muted-foreground mt-1">Published updates</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Placement Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.placementRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Success metric</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Videos</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingVideos}</div>
                  <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Approved Videos</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.approvedVideos}</div>
                  <p className="text-xs text-muted-foreground mt-1">Published content</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg ATS Score</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.avgAtsScore}</div>
                  <p className="text-xs text-muted-foreground mt-1">Resume quality</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(stats?.pendingVideos || 0) + (stats?.approvedVideos || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">All submissions</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Companies */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Companies</CardTitle>
                  <CardDescription>Placements by company</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData?.placementsByCompany || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Students by Year */}
              <Card>
                <CardHeader>
                  <CardTitle>Students by Year</CardTitle>
                  <CardDescription>Distribution across academic years</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData?.studentsByYear || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Students by Branch */}
              <Card>
                <CardHeader>
                  <CardTitle>Students by Branch</CardTitle>
                  <CardDescription>Branch-wise distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData?.studentsByBranch || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--primary))"
                        dataKey="count"
                      >
                        {chartData?.studentsByBranch.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Video Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Video Status</CardTitle>
                  <CardDescription>Approval workflow distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData?.videoStatus || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="hsl(var(--accent))"
                        dataKey="value"
                      >
                        {chartData?.videoStatus.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
