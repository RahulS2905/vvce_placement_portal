import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Home, 
  Megaphone, 
  Briefcase, 
  FileText, 
  Video, 
  User, 
  LogOut,
  CheckCircle,
  Users,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { UserRole, hasAnyRole } from '@/lib/roles';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';
import vvceLogo from '@/assets/vvce-logo-new.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) {
            setUserRoles(data.map(r => r.role as UserRole));
          }
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  const canCreateAnnouncements = userRoles.some(r => 
    ['admin', 'placement_head', 'training_head'].includes(r)
  );
  
  const canCreatePlacements = userRoles.some(r => 
    ['admin', 'placement_head'].includes(r)
  );
  
  const canApproveVideos = userRoles.some(r => 
    ['admin', 'training_head'].includes(r)
  );

  const isAdmin = userRoles.includes('admin');
  const isStudent = userRoles.includes('student');

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/dashboard" className="flex items-center">
              <img src={vvceLogo} alt="VVCE Logo" className="h-12 w-12 object-contain" />
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              <Link to="/dashboard">
                <Button 
                  variant={isActive('/dashboard') ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              <Link to="/announcements">
                <Button 
                  variant={isActive('/announcements') ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Megaphone className="h-4 w-4" />
                  Announcements
                </Button>
              </Link>

              <Link to="/placements">
                <Button 
                  variant={isActive('/placements') ? 'default' : 'ghost'} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Placements
                </Button>
              </Link>

              {isStudent && (
                <>
                  <Link to="/resume">
                    <Button 
                      variant={isActive('/resume') ? 'default' : 'ghost'} 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      My Resume
                    </Button>
                  </Link>

                  <Link to="/videos">
                    <Button 
                      variant={isActive('/videos') ? 'default' : 'ghost'} 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Video className="h-4 w-4" />
                      My Videos
                    </Button>
                  </Link>

                  <Link to="/approved-videos">
                    <Button 
                      variant={isActive('/approved-videos') ? 'default' : 'ghost'} 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Training Videos
                    </Button>
                  </Link>
                </>
              )}

              {hasAnyRole(userRoles, ['training_head', 'admin']) && (
                <Link to="/review-videos">
                  <Button 
                    variant={isActive('/review-videos') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Review Videos
                  </Button>
                </Link>
              )}

              {hasAnyRole(userRoles, ['admin', 'placement_head', 'training_head']) && (
                <Link to="/analytics">
                  <Button 
                    variant={isActive('/analytics') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
              )}

              {isAdmin && (
                <Link to="/admin">
                  <Button 
                    variant={isActive('/admin') ? 'default' : 'ghost'} 
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            
            <Link to="/profile" className="hidden md:block">
              <Button 
                variant={isActive('/profile') ? 'default' : 'ghost'} 
                size="sm"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
            </Link>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSignOut}
              className="hidden md:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <nav className="flex flex-col space-y-4 mt-8">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive('/dashboard') ? 'default' : 'ghost'} 
                      className="w-full justify-start gap-2"
                    >
                      <Home className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>

                  <Link to="/announcements" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive('/announcements') ? 'default' : 'ghost'} 
                      className="w-full justify-start gap-2"
                    >
                      <Megaphone className="h-4 w-4" />
                      Announcements
                    </Button>
                  </Link>

                  <Link to="/placements" onClick={() => setMobileMenuOpen(false)}>
                    <Button 
                      variant={isActive('/placements') ? 'default' : 'ghost'} 
                      className="w-full justify-start gap-2"
                    >
                      <Briefcase className="h-4 w-4" />
                      Placements
                    </Button>
                  </Link>

                  {isStudent && (
                    <>
                      <Link to="/resume" onClick={() => setMobileMenuOpen(false)}>
                        <Button 
                          variant={isActive('/resume') ? 'default' : 'ghost'} 
                          className="w-full justify-start gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          My Resume
                        </Button>
                      </Link>

                      <Link to="/videos" onClick={() => setMobileMenuOpen(false)}>
                        <Button 
                          variant={isActive('/videos') ? 'default' : 'ghost'} 
                          className="w-full justify-start gap-2"
                        >
                          <Video className="h-4 w-4" />
                          My Videos
                        </Button>
                      </Link>

                      <Link to="/approved-videos" onClick={() => setMobileMenuOpen(false)}>
                        <Button 
                          variant={isActive('/approved-videos') ? 'default' : 'ghost'} 
                          className="w-full justify-start gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Training Videos
                        </Button>
                      </Link>
                    </>
                  )}

                  {hasAnyRole(userRoles, ['training_head', 'admin']) && (
                    <Link to="/review-videos" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant={isActive('/review-videos') ? 'default' : 'ghost'} 
                        className="w-full justify-start gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Review Videos
                      </Button>
                    </Link>
                  )}

                  {hasAnyRole(userRoles, ['admin', 'placement_head', 'training_head']) && (
                    <Link to="/analytics" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant={isActive('/analytics') ? 'default' : 'ghost'} 
                        className="w-full justify-start gap-2"
                      >
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                      </Button>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant={isActive('/admin') ? 'default' : 'ghost'} 
                        className="w-full justify-start gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Admin
                      </Button>
                    </Link>
                  )}

                  <div className="pt-4 border-t border-border">
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant={isActive('/profile') ? 'default' : 'ghost'} 
                        className="w-full justify-start gap-2"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Button>
                    </Link>

                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full justify-start gap-2 mt-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
