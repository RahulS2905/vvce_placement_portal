import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, Shield, Megaphone, Briefcase, FileText, Video, CheckCircle, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  const { user } = useAuth();
  const authTarget = user ? '/dashboard' : '/auth';

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <GraduationCap className="h-20 w-20 text-primary" />
              <Shield className="h-20 w-20 text-accent -ml-4" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
              College Placement Portal
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              A comprehensive platform for managing college placements, announcements, and student resources
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={authTarget}>
                <Button size="lg" className="text-lg px-8 shadow-glow">
                  Get Started
                </Button>
              </Link>
              <Link to={authTarget}>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <Megaphone className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Announcements</CardTitle>
              <CardDescription>
                Stay updated with important notices from placement and training teams
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <Briefcase className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Placement Opportunities</CardTitle>
              <CardDescription>
                Browse and apply to latest placement opportunities from top companies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Resume Management</CardTitle>
              <CardDescription>
                Upload and manage your resumes with ATS scoring and feedback
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <Video className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Video Submissions</CardTitle>
              <CardDescription>
                Submit introduction videos for review and approval by training heads
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <CheckCircle className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Approval Workflow</CardTitle>
              <CardDescription>
                Streamlined process for content review and approval
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-md hover:shadow-glow transition-shadow">
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-4" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Different dashboards for students, placement heads, training heads, and admins
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="bg-gradient-primary text-primary-foreground shadow-glow">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join your college placement portal today and stay connected
            </p>
            <Link to={authTarget}>
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Sign Up Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2024 College Placement Portal. Secure access for college students only.</p>
        </div>
      </footer>
    </div>
  );
}
