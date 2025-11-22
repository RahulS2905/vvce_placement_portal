import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

export default function StudentProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [year, setYear] = useState('1');
  const [branch, setBranch] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [internshipCompany, setInternshipCompany] = useState('');
  const [internshipRole, setInternshipRole] = useState('');
  const [internshipDuration, setInternshipDuration] = useState('');
  const [internshipDescription, setInternshipDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [achievements, setAchievements] = useState('');
  const [cgpa, setCgpa] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
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
      setYear(data.year?.toString() || '1');
      setBranch(data.branch || '');
      setRollNumber(data.roll_number || '');
      setPhone(data.phone || '');
      setInternshipCompany(data.internship_company || '');
      setInternshipRole(data.internship_role || '');
      setInternshipDuration(data.internship_duration || '');
      setInternshipDescription(data.internship_description || '');
      setSkills(data.skills?.join(', ') || '');
      setAchievements(data.achievements || '');
      setCgpa(data.cgpa?.toString() || '');
    }
  };

  const profileSchema = z.object({
    full_name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number format").optional().or(z.literal('')),
    roll_number: z.string().max(50, "Roll number must be less than 50 characters").optional().or(z.literal('')),
    year: z.number().int().min(1).max(4, "Year must be between 1 and 4"),
    branch: z.string().min(1, "Branch is required").max(100, "Branch must be less than 100 characters"),
    cgpa: z.number().min(0, "CGPA cannot be negative").max(10, "CGPA cannot exceed 10").optional().nullable(),
    internship_company: z.string().max(200, "Company name must be less than 200 characters").optional().or(z.literal('')),
    internship_role: z.string().max(100, "Role must be less than 100 characters").optional().or(z.literal('')),
    internship_duration: z.string().max(50, "Duration must be less than 50 characters").optional().or(z.literal('')),
    internship_description: z.string().max(1000, "Description must be less than 1000 characters").optional().or(z.literal('')),
    skills: z.array(z.string().max(50, "Each skill must be less than 50 characters")).max(20, "Maximum 20 skills allowed"),
    achievements: z.string().max(2000, "Achievements must be less than 2000 characters").optional().or(z.literal('')),
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s !== '');
      
      const profileData = {
        full_name: fullName,
        phone: phone || '',
        roll_number: rollNumber || '',
        year: parseInt(year),
        branch,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        internship_company: internshipCompany || '',
        internship_role: internshipRole || '',
        internship_duration: internshipDuration || '',
        internship_description: internshipDescription || '',
        skills: skillsArray,
        achievements: achievements || '',
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

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <User className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">My Profile</h1>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roll">Roll Number</Label>
                <Input
                  id="roll"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cgpa">CGPA</Label>
              <Input
                id="cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                placeholder="e.g., 8.5"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md mt-6">
          <CardHeader>
            <CardTitle>Internship & Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="internshipCompany">Company Name</Label>
              <Input
                id="internshipCompany"
                placeholder="e.g., Google, Microsoft"
                value={internshipCompany}
                onChange={(e) => setInternshipCompany(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internshipRole">Role/Position</Label>
              <Input
                id="internshipRole"
                placeholder="e.g., Software Engineering Intern"
                value={internshipRole}
                onChange={(e) => setInternshipRole(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internshipDuration">Duration</Label>
              <Input
                id="internshipDuration"
                placeholder="e.g., June 2024 - August 2024"
                value={internshipDuration}
                onChange={(e) => setInternshipDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internshipDescription">Description</Label>
              <Input
                id="internshipDescription"
                placeholder="Brief description of your work"
                value={internshipDescription}
                onChange={(e) => setInternshipDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                placeholder="e.g., React, Python, Java, AWS"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="achievements">Achievements & Awards</Label>
              <Input
                id="achievements"
                placeholder="e.g., Won hackathon, Published research paper"
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
              />
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
