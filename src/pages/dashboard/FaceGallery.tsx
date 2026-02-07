import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { djangoApi } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Camera,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  face_image_url: string | null;
  department?: string;
}

const FaceGallery = () => {
  const { profile } = useOutletContext<{ profile: any }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'registered' | 'pending'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, face_image_url, department')
        .order('first_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedMember) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedMember.id}/face.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('face-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('face-images')
        .getPublicUrl(fileName);

      // Update profile with face image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ face_image_url: publicUrl })
        .eq('id', selectedMember.id);

      if (updateError) throw updateError;

      // Register face with Django API directly
      try {
        await djangoApi.enrollFace(
          selectedMember.id,
          publicUrl,
          `${selectedMember.first_name} ${selectedMember.last_name}`
        );
      } catch (faceErr) {
        console.warn('Django face enrollment failed (non-fatal):', faceErr);
      }

      setMembers(prev => prev.map(m => 
        m.id === selectedMember.id ? { ...m, face_image_url: publicUrl } : m
      ));

      toast({
        title: 'Face Registered',
        description: `Face image uploaded for ${selectedMember.first_name} ${selectedMember.last_name}`,
      });

      setSelectedMember(null);
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload face image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFace = async (member: Member) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ face_image_url: null })
        .eq('id', member.id);

      if (error) throw error;

      setMembers(prev => prev.map(m => 
        m.id === member.id ? { ...m, face_image_url: null } : m
      ));

      toast({
        title: 'Face Removed',
        description: `Face image removed for ${member.first_name} ${member.last_name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove face image.',
        variant: 'destructive',
      });
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === 'registered') return matchesSearch && member.face_image_url;
    if (filter === 'pending') return matchesSearch && !member.face_image_url;
    return matchesSearch;
  });

  const registeredCount = members.filter(m => m.face_image_url).length;
  const pendingCount = members.filter(m => !m.face_image_url).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Face Gallery</h1>
          <p className="text-muted-foreground">Manage face images for recognition</p>
        </div>
        <Button onClick={fetchMembers} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{registeredCount}</p>
                <p className="text-sm text-muted-foreground">Faces Registered</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100">
                <XCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Registration</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'registered' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('registered')}
              >
                Registered
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                Pending
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No members found
          </div>
        ) : (
          filteredMembers.map((member) => (
            <Card key={member.id} className="group overflow-hidden">
              <CardContent className="p-4">
                <div className="relative aspect-square mb-3">
                  {member.face_image_url ? (
                    <img
                      src={member.face_image_url}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => setSelectedMember(member)}
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    {member.face_image_url && (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDeleteFace(member)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Status badge */}
                  <Badge 
                    className={`absolute top-2 right-2 ${
                      member.face_image_url 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    }`}
                  >
                    {member.face_image_url ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  </Badge>
                </div>

                <h3 className="font-medium text-sm truncate">
                  {member.first_name} {member.last_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {member.department || member.email}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Face Image</DialogTitle>
            <DialogDescription>
              Upload a clear, front-facing photo for {selectedMember?.first_name} {selectedMember?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="w-32 h-32">
                <AvatarImage src={selectedMember?.face_image_url || undefined} />
                <AvatarFallback className="text-3xl">
                  {selectedMember?.first_name?.[0]}{selectedMember?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Uploading...' : 'Select Image'}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Use a clear photo with good lighting for best recognition accuracy
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FaceGallery;
