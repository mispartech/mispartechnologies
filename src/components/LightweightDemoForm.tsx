import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Trash2, MessageCircle, User, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LightweightDemoFormProps {
  isVisible: boolean;
}

const LightweightDemoForm = ({ isVisible }: LightweightDemoFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast({
        title: "You're all set!",
        description: "We'll send you updates and tips via WhatsApp.",
      });
    }, 1000);
  };

  if (!isVisible) return null;

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-mint/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-mint" />
        </div>
        <h3 className="text-xl font-bold mb-2">Thanks for trying our demo!</h3>
        <p className="text-muted-foreground">
          We'll reach out via WhatsApp with more information about how Mispar can work for your organization.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Want to learn more?</h3>
        <p className="text-muted-foreground text-sm">
          Get personalized updates and tips via WhatsApp
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm flex items-center gap-2">
            <User size={14} className="text-muted-foreground" />
            Name <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="Your name"
            value={formData.name}
            onChange={handleInputChange}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="whatsapp" className="text-sm flex items-center gap-2">
            <MessageCircle size={14} className="text-muted-foreground" />
            WhatsApp Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            placeholder="+234 XXX XXX XXXX"
            value={formData.whatsapp}
            onChange={handleInputChange}
            required
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending...' : 'Get Updates'}
          {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
        </Button>
      </form>

      {/* Privacy reassurance */}
      <div className="mt-6 space-y-3">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Lock size={16} className="shrink-0 mt-0.5 text-mint" />
          <span>Your data is encrypted and never shared with third parties</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Shield size={16} className="shrink-0 mt-0.5 text-mint" />
          <span>Demo face data is processed locally and not stored</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Trash2 size={16} className="shrink-0 mt-0.5 text-mint" />
          <span>Unsubscribe anytime with a simple message</span>
        </div>
      </div>
    </div>
  );
};

export default LightweightDemoForm;
