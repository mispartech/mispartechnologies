
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, User, ArrowRight, AlertCircle } from 'lucide-react';

const DemoForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    ageRange: '',
    whatsapp: '',
    frequency: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Demo Request Submitted!",
        description: "Thank you for your interest. We'll contact you soon via WhatsApp.",
      });
      
      // Reset form
      setFormData({
        name: '',
        gender: '',
        ageRange: '',
        whatsapp: '',
        frequency: '',
      });
      setFile(null);
    }, 1500);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
      <h3 className="text-2xl font-bold mb-6">Request a Demo</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => handleSelectChange('gender', value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="ageRange">Age Range</Label>
              <Select 
                value={formData.ageRange} 
                onValueChange={(value) => handleSelectChange('ageRange', value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select age range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-25">18-25</SelectItem>
                  <SelectItem value="26-35">26-35</SelectItem>
                  <SelectItem value="36-45">36-45</SelectItem>
                  <SelectItem value="46-55">46-55</SelectItem>
                  <SelectItem value="56+">56+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label htmlFor="whatsapp">WhatsApp Number</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              placeholder="Your WhatsApp number"
              value={formData.whatsapp}
              onChange={handleInputChange}
              required
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="frequency">Demo Frequency</Label>
            <Select 
              value={formData.frequency} 
              onValueChange={(value) => handleSelectChange('frequency', value)}
              required
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="How often do you want updates?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="faceData">Upload Face Data</Label>
            <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {file ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <User className="h-10 w-10 text-purple" />
                  </div>
                  <p className="text-sm text-gray-600">{file.name}</p>
                  <button
                    type="button"
                    className="text-sm text-purple hover:text-purple-dark"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-center">
                    <Upload className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="text-sm text-gray-600">
                    <label htmlFor="faceData" className="cursor-pointer text-purple hover:text-purple-dark">
                      Click to upload
                    </label> or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  <input
                    id="faceData"
                    name="faceData"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <div className="flex items-start mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              By submitting this form, you agree to receive updates about our demo and services via WhatsApp.
            </p>
          </div>
          
          <Button
            type="submit"
            className="w-full bg-purple hover:bg-purple-dark text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Processing..." : "Request Demo"}
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DemoForm;
