import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, hasAnyRole } from '@/lib/roles';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRoles();
    }
  }, [user]);

  const fetchUserRoles = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);
    
    if (data) {
      setUserRoles(data.map(r => r.role as UserRole));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is admin, placement_head, or training_head
  const isAdminOrHead = hasAnyRole(userRoles, ['admin', 'placement_head', 'training_head']);

  // Render appropriate dashboard based on role
  if (isAdminOrHead) {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}
