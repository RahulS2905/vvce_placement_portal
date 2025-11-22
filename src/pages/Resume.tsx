import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function Resume() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resumes, setResumes] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchResumes();
    }
  }, [user]);

  const fetchResumes = async () => {
    const { data } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setResumes(data || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.doc') && !file.name.endsWith('.docx')) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Upload Failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    // Create database entry
    const { error: dbError } = await supabase.from('resumes').insert({
      user_id: user?.id,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
    });

    if (dbError) {
      toast({
        title: "Error",
        description: dbError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Resume uploaded successfully",
    });

    fetchResumes();
    setUploading(false);
  };

  const handleDownload = async (resume: any) => {
    const { data, error } = await supabase.storage
      .from('resumes')
      .download(resume.file_path);

    if (error) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = resume.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (resume: any) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    const { error: storageError } = await supabase.storage
      .from('resumes')
      .remove([resume.file_path]);

    if (storageError) {
      toast({
        title: "Error",
        description: storageError.message,
        variant: "destructive",
      });
      return;
    }

    const { error: dbError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resume.id);

    if (dbError) {
      toast({
        title: "Error",
        description: dbError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
      fetchResumes();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Navigation />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">My Resumes</h1>
        </div>

        {/* Upload Section */}
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle>Upload New Resume</CardTitle>
            <CardDescription>
              Upload your resume for future use in placements and applications (Max 5MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label htmlFor="resume-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Choose File'}
                </div>
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Resumes List */}
        <div className="space-y-4">
          {resumes.map(resume => (
            <Card key={resume.id} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{resume.file_name}</CardTitle>
                    <CardDescription>
                      Uploaded on {new Date(resume.created_at).toLocaleDateString()} • {(resume.file_size / 1024).toFixed(2)} KB
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(resume)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(resume)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your resume is ready to be used for placement applications and can be downloaded anytime.
                </p>
              </CardContent>
            </Card>
          ))}

          {resumes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No resumes uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your resume to have it ready for placements
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
