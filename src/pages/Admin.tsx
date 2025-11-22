import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getUserRoles, isAdmin, UserRole } from '@/lib/roles';
import { Users, Shield, UserCheck, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, UserRole[]>>({});
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const allRoles: UserRole[] = ['admin', 'placement_head', 'training_head', 'student'];

  useEffect(() => {
    checkAccess();
    fetchUsers();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;
    const roles = await getUserRoles(user.id);
    if (!isAdmin(roles)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Fetch all user roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      toast({
        title: 'Error',
        description: 'Failed to load user roles.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Map roles to users
    const rolesMap: Record<string, UserRole[]> = {};
    roles?.forEach((role) => {
      if (!rolesMap[role.user_id]) {
        rolesMap[role.user_id] = [];
      }
      rolesMap[role.user_id].push(role.role as UserRole);
    });

    setUsers(profiles || []);
    setUserRolesMap(rolesMap);
    setLoading(false);
  };

  const handleManageRoles = (userData: any) => {
    setSelectedUser(userData);
    setSelectedRoles(userRolesMap[userData.id] || []);
  };

  const toggleRole = (role: UserRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    
    setSubmitting(true);

    // Get current roles
    const currentRoles = userRolesMap[selectedUser.id] || [];
    
    // Determine roles to add and remove
    const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
    const rolesToRemove = currentRoles.filter(r => !selectedRoles.includes(r));

    try {
      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id)
          .in('role', rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({
            user_id: selectedUser.id,
            role,
          })));

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'User roles updated successfully.',
      });

      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user roles.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
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

  const stats = {
    totalUsers: users.length,
    admins: Object.values(userRolesMap).filter(roles => roles.includes('admin')).length,
    placementHeads: Object.values(userRolesMap).filter(roles => roles.includes('placement_head')).length,
    trainingHeads: Object.values(userRolesMap).filter(roles => roles.includes('training_head')).length,
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage users and roles
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Placement Heads</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.placementHeads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Heads</CardTitle>
              <UserCheck className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trainingHeads}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userData) => (
                      <TableRow key={userData.id}>
                        <TableCell className="font-medium">{userData.full_name}</TableCell>
                        <TableCell>{userData.email}</TableCell>
                        <TableCell>{userData.year || 'N/A'}</TableCell>
                        <TableCell>{userData.branch || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(userRolesMap[userData.id] || []).map((role) => (
                              <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                            {(!userRolesMap[userData.id] || userRolesMap[userData.id].length === 0) && (
                              <span className="text-xs text-muted-foreground">No roles</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleManageRoles(userData)}
                            size="sm"
                            variant="outline"
                          >
                            Manage Roles
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manage Roles Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Roles: {selectedUser?.full_name}</DialogTitle>
            <DialogDescription>
              Select roles for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {allRoles.map((role) => (
              <div key={role} className="flex items-center space-x-2">
                <Checkbox
                  id={role}
                  checked={selectedRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <label
                  htmlFor={role}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <Badge variant={getRoleBadgeVariant(role)}>
                    {role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Roles'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
