import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/roles';
import { Briefcase, Plus, Calendar, DollarSign, Search, X, Users, CheckCircle, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { z } from 'zod';

const placementSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required").max(200, "Company name must be less than 200 characters"),
  role: z.string().trim().min(1, "Role is required").max(200, "Role must be less than 200 characters"),
  package: z.string().max(100, "Package must be less than 100 characters").optional(),
  description: z.string().max(5000, "Description must be less than 5000 characters").optional(),
  eligibility_criteria: z.string().max(2000, "Eligibility criteria must be less than 2000 characters").optional(),
  roles: z.array(z.string().max(100)).max(10, "Maximum 10 roles allowed"),
  target_branch: z.array(z.string()).max(20, "Maximum 20 branches allowed")
});

export default function Placements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState<any[]>([]);
  const [filteredPlacements, setFilteredPlacements] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  
  // Form states
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [packageAmount, setPackageAmount] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [targetYear, setTargetYear] = useState<string>('all');
  const [targetBranches, setTargetBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState('');
  const [deadline, setDeadline] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState('');
  
  // Application dialog states
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [resumeShared, setResumeShared] = useState(false);
  const [userHasResume, setUserHasResume] = useState(false);
  
  // View applications dialog states
  const [viewApplicationsDialogOpen, setViewApplicationsDialogOpen] = useState(false);
  const [viewingPlacementId, setViewingPlacementId] = useState<string | null>(null);
  const [expandedApplications, setExpandedApplications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRoles();
      fetchPlacements();
      fetchUserApplications();
    }
  }, [user]);

  useEffect(() => {
    filterPlacements();
  }, [placements, searchQuery, filterYear, filterBranch]);

  // Realtime subscription for all placement applications to update counts
  useEffect(() => {
    const channel = supabase
      .channel('all_applications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'placement_applications'
        },
        () => {
          // Refetch placements to update counts when any new application is added
          fetchPlacements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Realtime subscription for placement applications
  useEffect(() => {
    if (!viewingPlacementId) return;

    const channel = supabase
      .channel('placement_applications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'placement_applications',
          filter: `placement_id=eq.${viewingPlacementId}`
        },
        () => {
          // Refetch applications when a new one is added
          fetchApplicationsForPlacement(viewingPlacementId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingPlacementId]);

  const filterPlacements = () => {
    let filtered = placements;

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterYear !== 'all') {
      filtered = filtered.filter(p => 
        !p.target_year || p.target_year.toString() === filterYear
      );
    }

    if (filterBranch !== 'all') {
      filtered = filtered.filter(p => 
        !p.target_branch || p.target_branch.length === 0 || p.target_branch.includes(filterBranch)
      );
    }

    setFilteredPlacements(filtered);
  };

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

  const fetchPlacements = async () => {
    const { data } = await supabase
      .from('placements')
      .select(`
        *,
        placement_applications(count)
      `)
      .order('created_at', { ascending: false });

    // Filter by student's year and branch if they're a student
    if (profile && userRoles.includes('student')) {
      const filtered = (data || []).filter(placement => {
        // Check year eligibility
        const yearMatch = !placement.target_year || placement.target_year === profile.year;
        
        // Check branch eligibility
        const branchMatch = !placement.target_branch || 
                           placement.target_branch.length === 0 || 
                           placement.target_branch.includes(profile.branch);
        
        return yearMatch && branchMatch;
      });
      setPlacements(filtered);
    } else {
      // Admins and heads see all placements
      setPlacements(data || []);
    }
  };

  const canCreatePlacements = userRoles.some(r => 
    ['admin', 'placement_head'].includes(r)
  );

  const isStudent = userRoles.includes('student');

  const handleDeletePlacement = async (placementId: string) => {
    if (!confirm('Are you sure you want to delete this placement?')) {
      return;
    }

    const { error } = await supabase
      .from('placements')
      .delete()
      .eq('id', placementId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete placement",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Placement deleted successfully",
      });
      fetchPlacements();
    }
  };
  
  const fetchUserApplications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('placement_applications')
      .select('placement_id')
      .eq('user_id', user.id);
    if (data) {
      setUserApplications(new Set(data.map(app => app.placement_id)));
    }
  };

  const fetchApplicationsForPlacement = async (placementId: string) => {
    // First fetch all applications for this placement
    const { data: apps, error: appsError } = await supabase
      .from('placement_applications')
      .select('*')
      .eq('placement_id', placementId)
      .order('created_at', { ascending: false });

    if (appsError) {
      console.error('Error fetching applications:', appsError);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
      return;
    }

    if (!apps || apps.length === 0) {
      setApplications([]);
      return;
    }

    // Fetch profiles for all applicants in a single query
    const userIds = apps.map((app) => app.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, year, branch, cgpa')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching applicant profiles:', profilesError);
      // We still show applications even if profile details fail to load
    }

    // Fetch resumes for applicants who shared them
    const appsWithSharedResume = apps.filter((app) => app.resume_shared);
    const sharedResumeUserIds = appsWithSharedResume.map((app) => app.user_id);
    
    let resumeMap = new Map();
    if (sharedResumeUserIds.length > 0) {
      const { data: resumes } = await supabase
        .from('resumes')
        .select('user_id, file_path, file_name')
        .in('user_id', sharedResumeUserIds);
      
      if (resumes) {
        resumeMap = new Map(resumes.map((r: any) => [r.user_id, r]));
      }
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const appsWithProfiles = apps.map((app: any) => ({
      ...app,
      profiles: profileMap.get(app.user_id) || null,
      resume: app.resume_shared ? resumeMap.get(app.user_id) || null : null,
    }));

    setApplications(appsWithProfiles);
  };

  const handleAddRole = () => {
    if (roleInput.trim() && availableRoles.length < 5) {
      setAvailableRoles([...availableRoles, roleInput.trim()]);
      setRoleInput('');
    }
  };

  const handleRemoveRole = (index: number) => {
    setAvailableRoles(availableRoles.filter((_, i) => i !== index));
  };

  const handleAddBranch = () => {
    const branches = ['Computer Science', 'Electrical', 'Mechanical', 'Civil', 'Electronics'];
    if (branchInput && branches.includes(branchInput) && !targetBranches.includes(branchInput)) {
      setTargetBranches([...targetBranches, branchInput]);
      setBranchInput('');
    }
  };

  const handleRemoveBranch = (index: number) => {
    setTargetBranches(targetBranches.filter((_, i) => i !== index));
  };

  const handleApplyClick = async (placement: any) => {
    setSelectedPlacement(placement);
    setSelectedRole('');
    setResumeShared(false);
    
    // Check if user has uploaded a resume
    const { data: resume } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', user?.id)
      .limit(1)
      .single();
    
    setUserHasResume(!!resume);
    setApplyDialogOpen(true);
  };

  const handleViewApplications = async (placementId: string) => {
    setViewingPlacementId(placementId);
    await fetchApplicationsForPlacement(placementId);
    setViewApplicationsDialogOpen(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedRole || !selectedPlacement) {
      toast({
        title: "Missing Selection",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    // Check if user wants to share resume but hasn't uploaded one
    if (resumeShared && !userHasResume) {
      toast({
        title: "Resume Not Available",
        description: "Resume not shared in website. Please upload your resume first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('placement_applications')
      .insert({
        placement_id: selectedPlacement.id,
        user_id: user?.id,
        selected_role: selectedRole,
        resume_shared: resumeShared && userHasResume,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Application submitted successfully",
      });
      setApplyDialogOpen(false);
      fetchUserApplications();
    }

    setLoading(false);
  };

  const sendPlacementNotifications = async (company: string, roleTitle: string, year: string, branches: string[]) => {
    try {
      // Fetch eligible students
      let query = supabase
        .from('profiles')
        .select('id, full_name, email');

      if (year !== 'all') {
        query = query.eq('year', parseInt(year));
      }
      if (branches.length > 0) {
        query = query.in('branch', branches);
      }

      const { data: students } = await query;

      if (students) {
        // Send email to each eligible student
        for (const student of students) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: student.email,
              subject: `New Placement Opportunity: ${company}`,
              type: 'placement',
              data: {
                userName: student.full_name,
                title: roleTitle,
                company: company,
                link: `${window.location.origin}/placements`
              }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending placement notifications:', error);
    }
  };

  const handleCreatePlacement = async () => {
    // Validate input using zod schema
    const validationResult = placementSchema.safeParse({
      company_name: companyName,
      role: role,
      package: packageAmount || undefined,
      description: description || undefined,
      eligibility_criteria: eligibility || undefined,
      roles: availableRoles,
      target_branch: targetBranches
    });

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0].message;
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('placements').insert({
      company_name: validationResult.data.company_name,
      role: validationResult.data.role,
      package: validationResult.data.package || null,
      description: validationResult.data.description || null,
      eligibility_criteria: validationResult.data.eligibility_criteria || null,
      target_year: targetYear === 'all' ? null : parseInt(targetYear),
      target_branch: validationResult.data.target_branch.length > 0 ? validationResult.data.target_branch : null,
      application_deadline: deadline || null,
      roles: validationResult.data.roles.length > 0 ? validationResult.data.roles : null,
      created_by: user?.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Placement opportunity created successfully",
      });
      
      // Send email notifications to eligible students
      sendPlacementNotifications(companyName, role, targetYear, targetBranches);
      
      setDialogOpen(false);
      resetForm();
      fetchPlacements();
    }

    setLoading(false);
  };

  const resetForm = () => {
    setCompanyName('');
    setRole('');
    setPackageAmount('');
    setDescription('');
    setEligibility('');
    setTargetYear('all');
    setTargetBranches([]);
    setBranchInput('');
    setDeadline('');
    setAvailableRoles([]);
    setRoleInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Placement Opportunities</h1>
          </div>

          {canCreatePlacements && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New Placement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Placement Opportunity</DialogTitle>
                  <DialogDescription>
                    Add a new placement opportunity for students
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., Google"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="package">Package (Optional)</Label>
                      <Input
                        id="package"
                        value={packageAmount}
                        onChange={(e) => setPackageAmount(e.target.value)}
                        placeholder="e.g., 15 LPA"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deadline">Application Deadline (Optional)</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Job description and requirements"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eligibility">Eligibility Criteria</Label>
                    <Textarea
                      id="eligibility"
                      value={eligibility}
                      onChange={(e) => setEligibility(e.target.value)}
                      placeholder="CGPA, branch requirements, etc."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target Year</Label>
                      <Select value={targetYear} onValueChange={setTargetYear}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Years</SelectItem>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Branches (Select multiple branches)</Label>
                      <div className="flex gap-2">
                        <Select value={branchInput} onValueChange={setBranchInput}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Electrical">Electrical</SelectItem>
                            <SelectItem value="Mechanical">Mechanical</SelectItem>
                            <SelectItem value="Civil">Civil</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          type="button" 
                          onClick={handleAddBranch}
                          disabled={!branchInput || targetBranches.includes(branchInput)}
                          variant="outline"
                        >
                          Add
                        </Button>
                      </div>
                      {targetBranches.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {targetBranches.map((branch, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {branch}
                              <X 
                                className="h-3 w-3 cursor-pointer" 
                                onClick={() => handleRemoveBranch(index)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {targetBranches.length === 0 ? 'Leave empty for all branches' : 'Selected branches for this placement'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Available Roles (Optional - Add 2-5 role options for students to choose)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={roleInput}
                        onChange={(e) => setRoleInput(e.target.value)}
                        placeholder="e.g., Frontend Developer"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                      />
                      <Button 
                        type="button" 
                        onClick={handleAddRole}
                        disabled={availableRoles.length >= 5}
                        variant="outline"
                      >
                        Add
                      </Button>
                    </div>
                    {availableRoles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {availableRoles.map((role, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {role}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveRole(index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Students will select from these roles when applying
                    </p>
                  </div>

                  <Button 
                    onClick={handleCreatePlacement} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Creating...' : 'Create Placement'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search and Filter Section */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, role, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="md:w-[180px]">
                  <SelectValue placeholder="Filter by Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder="Filter by Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlacements.map(placement => (
            <Card key={placement.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{placement.company_name}</CardTitle>
                    <CardDescription className="text-lg">{placement.role}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {placement.target_year && (
                      <Badge variant="secondary">Year {placement.target_year}</Badge>
                    )}
                    {placement.target_branch && (
                      <Badge variant="outline">{placement.target_branch}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {placement.package && (
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <DollarSign className="h-5 w-5" />
                    Package: {placement.package}
                  </div>
                )}

                {placement.application_deadline && (
                  <div className="flex items-center gap-2 text-warning">
                    <Calendar className="h-5 w-5" />
                    Deadline: {new Date(placement.application_deadline).toLocaleDateString()}
                  </div>
                )}

                {placement.description && (
                  <div>
                    <h4 className="font-semibold mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {placement.description}
                    </p>
                  </div>
                )}

                {placement.eligibility_criteria && (
                  <div>
                    <h4 className="font-semibold mb-1">Eligibility</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {placement.eligibility_criteria}
                    </p>
                  </div>
                )}

                {placement.roles && placement.roles.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1">Available Roles</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {placement.roles.map((r: string, idx: number) => (
                        <Badge key={idx} variant="outline">{r}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {isStudent && (
                    <Button
                      onClick={() => handleApplyClick(placement)}
                      disabled={userApplications.has(placement.id)}
                      className="flex-1"
                    >
                      {userApplications.has(placement.id) ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Applied
                        </>
                      ) : (
                        'Apply Now'
                      )}
                    </Button>
                  )}
                  
                  {canCreatePlacements && (
                    <>
                      <Button
                        onClick={() => handleViewApplications(placement.id)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Users className="h-4 w-4" />
                        View Applications ({placement.placement_applications?.[0]?.count || 0})
                      </Button>
                      <Button
                        onClick={() => handleDeletePlacement(placement.id)}
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredPlacements.length === 0 && (
            <Card className="lg:col-span-2">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No placement opportunities yet</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {selectedPlacement?.company_name}</DialogTitle>
            <DialogDescription>
              Select the role you're applying for
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Role</Label>
              {selectedPlacement?.roles && selectedPlacement.roles.length > 0 ? (
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPlacement.roles.map((role: string, idx: number) => (
                      <SelectItem key={idx} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 border rounded-md bg-muted">
                  <p className="text-sm">
                    Role: <span className="font-semibold">{selectedPlacement?.role}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted rounded-md space-y-2 text-sm">
              <p><span className="font-semibold">Your Details:</span></p>
              <p>Name: {profile?.full_name}</p>
              <p>Branch: {profile?.branch}</p>
              <p>Year: {profile?.year}</p>
              {profile?.cgpa && <p>CGPA: {profile.cgpa}</p>}
            </div>

            <div className="flex items-start space-x-2 p-4 border rounded-md">
              <Checkbox 
                id="shareResume" 
                checked={resumeShared}
                onCheckedChange={(checked) => setResumeShared(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="shareResume"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Share my resume with this application
                </label>
                <p className="text-sm text-muted-foreground">
                  {userHasResume 
                    ? "Your resume will be visible to the placement coordinator" 
                    : "You haven't uploaded a resume yet. Upload one in the Resume section first."}
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSubmitApplication} 
              disabled={loading || (!selectedRole && selectedPlacement?.roles?.length > 0)}
              className="w-full"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Applications Dialog */}
      <Dialog open={viewApplicationsDialogOpen} onOpenChange={setViewApplicationsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applications</DialogTitle>
            <DialogDescription>
              Students who have applied for this placement. Click on a name to view full details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No applications yet
              </div>
            ) : (
              <div className="space-y-2">
                {applications.map((app) => {
                  const isExpanded = expandedApplications.has(app.id);
                  const toggleExpanded = () => {
                    const newExpanded = new Set(expandedApplications);
                    if (isExpanded) {
                      newExpanded.delete(app.id);
                    } else {
                      newExpanded.add(app.id);
                    }
                    setExpandedApplications(newExpanded);
                  };
                  
                  return (
                    <Card key={app.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer py-2"
                          onClick={toggleExpanded}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-semibold text-primary">
                                {app.profiles?.full_name?.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{app.profiles?.full_name}</p>
                              <Badge variant="outline" className="mt-1">{app.selected_role}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                        
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium">{app.profiles?.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Branch</p>
                                <p className="font-medium">{app.profiles?.branch}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Year</p>
                                <p className="font-medium">{app.profiles?.year}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">CGPA</p>
                                <p className="font-medium">{app.profiles?.cgpa || 'N/A'}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm text-muted-foreground">Applied On</p>
                                <p className="font-medium">{new Date(app.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            
                            {app.resume_shared && (
                              <div className="col-span-2 pt-2 border-t">
                                <p className="text-sm text-muted-foreground mb-2">Resume</p>
                                {app.resume ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const { data } = await supabase.storage
                                        .from('resumes')
                                        .createSignedUrl(app.resume.file_path, 3600);
                                      if (data) {
                                        window.open(data.signedUrl, '_blank');
                                      }
                                    }}
                                  >
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Resume ({app.resume.file_name})
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">Resume not shared in website</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
