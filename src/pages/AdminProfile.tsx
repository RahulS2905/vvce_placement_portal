import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/lib/roles';

export default function AdminProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRoles();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();
    
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    }
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

  const profileSchema = z.object({
    full_name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format").optional().or(z.literal('')),
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const profileData = {
        full_name: fullName,
        phone: phone || '',
      };

      const validationResult = profileSchema.safeParse(profileData);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ');
        toast({
          title: "Validation Error",
          description: errors,
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(validationResult.data)
        .eq('id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Admin Profile</h1>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 1234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Your Roles</Label>
              <div className="flex flex-wrap gap-2">
                {userRoles.map(role => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                    {role.replace('_', ' ').toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-6">
          <Button onClick={handleUpdate} disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>

          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
