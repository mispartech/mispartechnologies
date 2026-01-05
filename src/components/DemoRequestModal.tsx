import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Lock, Trash2, MessageCircle, User, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface DemoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DemoRequestModal = ({ isOpen, onClose }: DemoRequestModalProps) => {
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

  const handleClose = () => {
    setIsSubmitted(false);
    setFormData({ name: '', whatsapp: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple" />
            Request a Demo
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-mint/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-mint" />
            </div>
            <h3 className="text-lg font-bold mb-2">Thanks for your interest!</h3>
            <p className="text-muted-foreground text-sm">
              We'll reach out via WhatsApp with more information about how Mispar can work for your organization.
            </p>
            <Button onClick={handleClose} className="mt-4" variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-muted-foreground text-sm">
                Get personalized updates and a live demo walkthrough
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="modal-name" className="text-sm flex items-center gap-2">
                  <User size={14} className="text-muted-foreground" />
                  Name <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="modal-name"
                  name="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 bg-background"
                />
              </div>

              <div>
                <Label htmlFor="modal-whatsapp" className="text-sm flex items-center gap-2">
                  <MessageCircle size={14} className="text-muted-foreground" />
                  WhatsApp Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="modal-whatsapp"
                  name="whatsapp"
                  type="tel"
                  placeholder="+234 XXX XXX XXXX"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  required
                  className="mt-1 bg-background"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-purple hover:bg-purple-dark"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Request Demo'}
                {!isSubmitting && <ArrowRight size={16} className="ml-2" />}
              </Button>
            </form>

            {/* Privacy reassurance */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground font-medium mb-2">Your privacy matters</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock size={12} className="shrink-0 text-mint" />
                <span>Data encrypted & never shared</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield size={12} className="shrink-0 text-mint" />
                <span>Face data processed locally only</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Trash2 size={12} className="shrink-0 text-mint" />
                <span>Unsubscribe anytime</span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DemoRequestModal;
