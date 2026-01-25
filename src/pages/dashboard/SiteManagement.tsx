import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Image, 
  Palette,
  Save,
  Upload,
  Eye,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useDocumentTitle from '@/hooks/useDocumentTitle';

interface SiteSettings {
  favicon_url: string;
  logo_url: string;
  logo_dark_url: string;
  site_name: string;
  preloader_enabled: boolean;
  preloader_color: string;
  preloader_type: 'spinner' | 'pulse' | 'dots';
}

const defaultSettings: SiteSettings = {
  favicon_url: '/favicon.ico',
  logo_url: '',
  logo_dark_url: '',
  site_name: 'Mispar Technologies',
  preloader_enabled: true,
  preloader_color: '#8B5CF6',
  preloader_type: 'spinner',
};

const SiteManagement = () => {
  useDocumentTitle('Site Management | Mispar Technologies');
  
  const { profile } = useOutletContext<{ profile: any }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, [profile]);

  const fetchSettings = async () => {
    if (!profile?.organization_id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      if (error) throw error;
      
      if (data?.settings && typeof data.settings === 'object') {
        const orgSettings = data.settings as Record<string, any>;
        setSettings({
          ...defaultSettings,
          ...orgSettings.site_settings,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { upsert: true });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('site-assets')
      .getPublicUrl(path);
    
    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!profile?.organization_id) return;

    setIsSaving(true);
    try {
      let updatedSettings = { ...settings };

      // Upload files if selected
      if (faviconFile) {
        const url = await uploadFile(faviconFile, `${profile.organization_id}/favicon.${faviconFile.name.split('.').pop()}`);
        updatedSettings.favicon_url = url;
      }
      if (logoFile) {
        const url = await uploadFile(logoFile, `${profile.organization_id}/logo.${logoFile.name.split('.').pop()}`);
        updatedSettings.logo_url = url;
      }
      if (logoDarkFile) {
        const url = await uploadFile(logoDarkFile, `${profile.organization_id}/logo-dark.${logoDarkFile.name.split('.').pop()}`);
        updatedSettings.logo_dark_url = url;
      }

      // Get existing settings
      const { data: existingData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', profile.organization_id)
        .single();

      const existingSettings = existingData?.settings && typeof existingData.settings === 'object' 
        ? existingData.settings as Record<string, any>
        : {};

      // Update with new site settings
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...existingSettings,
            site_settings: updatedSettings,
          },
        })
        .eq('id', profile.organization_id);

      if (error) throw error;

      setSettings(updatedSettings);
      setFaviconFile(null);
      setLogoFile(null);
      setLogoDarkFile(null);

      toast({
        title: 'Settings Saved',
        description: 'Site management settings have been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (type: 'favicon' | 'logo' | 'logo_dark', file: File | null) => {
    if (!file) return;
    
    switch (type) {
      case 'favicon':
        setFaviconFile(file);
        break;
      case 'logo':
        setLogoFile(file);
        break;
      case 'logo_dark':
        setLogoDarkFile(file);
        break;
    }
  };

  const getPreviewWidth = () => {
    switch (previewDevice) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-full';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Site Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your site's branding and appearance</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 w-full sm:w-auto">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="xl:col-span-2 space-y-6">
          <Tabs defaultValue="branding" className="space-y-6">
            <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="branding" className="gap-2 flex-1 min-w-[120px]">
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger value="preloader" className="gap-2 flex-1 min-w-[120px]">
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Preloader</span>
              </TabsTrigger>
              <TabsTrigger value="seo" className="gap-2 flex-1 min-w-[120px]">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">SEO</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Branding Assets</CardTitle>
                  <CardDescription>Upload your logo and favicon</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Site Name */}
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.site_name}
                      onChange={(e) => setSettings(prev => ({ ...prev, site_name: e.target.value }))}
                      placeholder="Your Organization Name"
                    />
                  </div>

                  {/* Favicon */}
                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <p className="text-sm text-muted-foreground">
                      The small icon shown in browser tabs. Recommended size: 32x32 or 64x64 pixels.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                        {faviconFile ? (
                          <img 
                            src={URL.createObjectURL(faviconFile)} 
                            alt="Favicon preview" 
                            className="w-8 h-8 object-contain"
                          />
                        ) : settings.favicon_url ? (
                          <img 
                            src={settings.favicon_url} 
                            alt="Current favicon" 
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <Image className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          ref={faviconInputRef}
                          type="file"
                          accept=".ico,.png,.svg"
                          className="hidden"
                          onChange={(e) => handleFileSelect('favicon', e.target.files?.[0] || null)}
                        />
                        <Button 
                          variant="outline" 
                          className="gap-2 w-full sm:w-auto"
                          onClick={() => faviconInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Favicon
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Logo Light */}
                  <div className="space-y-2">
                    <Label>Logo (Light Mode)</Label>
                    <p className="text-sm text-muted-foreground">
                      Your organization logo for light backgrounds. Recommended width: 200-400px.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-32 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-white">
                        {logoFile ? (
                          <img 
                            src={URL.createObjectURL(logoFile)} 
                            alt="Logo preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : settings.logo_url ? (
                          <img 
                            src={settings.logo_url} 
                            alt="Current logo" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Image className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => handleFileSelect('logo', e.target.files?.[0] || null)}
                        />
                        <Button 
                          variant="outline" 
                          className="gap-2 w-full sm:w-auto"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Logo
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Logo Dark */}
                  <div className="space-y-2">
                    <Label>Logo (Dark Mode)</Label>
                    <p className="text-sm text-muted-foreground">
                      Your organization logo for dark backgrounds. Leave empty to use the light logo.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-32 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-gray-900">
                        {logoDarkFile ? (
                          <img 
                            src={URL.createObjectURL(logoDarkFile)} 
                            alt="Dark logo preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : settings.logo_dark_url ? (
                          <img 
                            src={settings.logo_dark_url} 
                            alt="Current dark logo" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <Image className="w-8 h-8 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <input
                          ref={logoDarkInputRef}
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => handleFileSelect('logo_dark', e.target.files?.[0] || null)}
                        />
                        <Button 
                          variant="outline" 
                          className="gap-2 w-full sm:w-auto"
                          onClick={() => logoDarkInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                          Upload Dark Logo
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preloader">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preloader Settings</CardTitle>
                  <CardDescription>Configure the loading animation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Preloader</p>
                      <p className="text-sm text-muted-foreground">
                        Show a loading animation when the page loads
                      </p>
                    </div>
                    <Switch
                      checked={settings.preloader_enabled}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, preloader_enabled: checked }))}
                    />
                  </div>

                  {settings.preloader_enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="preloaderColor">Preloader Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="preloaderColor"
                            value={settings.preloader_color}
                            onChange={(e) => setSettings(prev => ({ ...prev, preloader_color: e.target.value }))}
                            className="w-10 h-10 rounded-lg cursor-pointer border-0"
                          />
                          <Input
                            value={settings.preloader_color}
                            onChange={(e) => setSettings(prev => ({ ...prev, preloader_color: e.target.value }))}
                            className="w-32"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Preloader Style</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {(['spinner', 'pulse', 'dots'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => setSettings(prev => ({ ...prev, preloader_type: type }))}
                              className={`p-4 rounded-lg border-2 transition-colors ${
                                settings.preloader_type === type 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-muted hover:border-muted-foreground/50'
                              }`}
                            >
                              <div className="h-12 flex items-center justify-center">
                                {type === 'spinner' && (
                                  <div 
                                    className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                                    style={{ borderColor: settings.preloader_color, borderTopColor: 'transparent' }}
                                  />
                                )}
                                {type === 'pulse' && (
                                  <div 
                                    className="w-8 h-8 rounded-full animate-pulse"
                                    style={{ backgroundColor: settings.preloader_color }}
                                  />
                                )}
                                {type === 'dots' && (
                                  <div className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                      <div 
                                        key={i}
                                        className="w-2 h-2 rounded-full animate-bounce"
                                        style={{ 
                                          backgroundColor: settings.preloader_color,
                                          animationDelay: `${i * 0.15}s`
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm font-medium capitalize mt-2">{type}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">SEO Settings</CardTitle>
                  <CardDescription>Configure search engine optimization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Dynamic page titles are automatically set based on the current page. 
                      Each page in the dashboard displays the appropriate title in the browser tab.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Page Title Examples</Label>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Dashboard:</span>
                        <span className="font-medium">Dashboard | {settings.site_name}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Members:</span>
                        <span className="font-medium">Members | {settings.site_name}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Attendance:</span>
                        <span className="font-medium">Mark Attendance | {settings.site_name}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview Panel */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preview
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSettings({ ...settings })}
                  className="gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Button
                  variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                  className="flex-1"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                  className="flex-1"
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                  className="flex-1"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Browser Tab Preview */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2">Browser Tab</p>
                <div className="bg-muted rounded-t-lg p-2">
                  <div className="flex items-center gap-2 bg-background rounded px-2 py-1">
                    <div className="w-4 h-4 flex items-center justify-center">
                      {faviconFile ? (
                        <img 
                          src={URL.createObjectURL(faviconFile)} 
                          alt="" 
                          className="w-4 h-4 object-contain"
                        />
                      ) : settings.favicon_url ? (
                        <img 
                          src={settings.favicon_url} 
                          alt="" 
                          className="w-4 h-4 object-contain"
                        />
                      ) : (
                        <div className="w-4 h-4 bg-primary/20 rounded" />
                      )}
                    </div>
                    <span className="text-xs truncate flex-1">{settings.site_name}</span>
                    <span className="text-xs text-muted-foreground">×</span>
                  </div>
                </div>
              </div>

              {/* Page Preview */}
              <div className={`mx-auto transition-all duration-300 ${getPreviewWidth()}`}>
                <div className="border rounded-lg overflow-hidden bg-background">
                  {/* Header Preview */}
                  <div className="border-b p-3 flex items-center justify-between bg-card">
                    <div className="flex items-center gap-2">
                      {logoFile || settings.logo_url ? (
                        <img 
                          src={logoFile ? URL.createObjectURL(logoFile) : settings.logo_url} 
                          alt="Logo" 
                          className="h-6 object-contain"
                        />
                      ) : (
                        <span className="font-bold text-sm text-primary">{settings.site_name}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded bg-muted" />
                      <div className="w-6 h-6 rounded bg-muted" />
                    </div>
                  </div>
                  
                  {/* Content Preview */}
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted/50 rounded w-full" />
                    <div className="h-3 bg-muted/50 rounded w-5/6" />
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="h-16 bg-muted/30 rounded" />
                      <div className="h-16 bg-muted/30 rounded" />
                    </div>
                  </div>

                  {/* Preloader Preview */}
                  {settings.preloader_enabled && (
                    <div className="border-t p-4">
                      <p className="text-xs text-muted-foreground mb-2 text-center">Preloader</p>
                      <div className="flex justify-center">
                        {settings.preloader_type === 'spinner' && (
                          <div 
                            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: settings.preloader_color, borderTopColor: 'transparent' }}
                          />
                        )}
                        {settings.preloader_type === 'pulse' && (
                          <div 
                            className="w-8 h-8 rounded-full animate-pulse"
                            style={{ backgroundColor: settings.preloader_color }}
                          />
                        )}
                        {settings.preloader_type === 'dots' && (
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <div 
                                key={i}
                                className="w-2 h-2 rounded-full animate-bounce"
                                style={{ 
                                  backgroundColor: settings.preloader_color,
                                  animationDelay: `${i * 0.15}s`
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SiteManagement;
