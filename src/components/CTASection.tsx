import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, Sparkles } from 'lucide-react';

interface CTASectionProps {
  onRequestDemo: () => void;
}

const CTASection = ({ onRequestDemo }: CTASectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-purple/20 to-charcoal">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-purple/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-neonblue/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full bg-mint/10 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Animated scan line */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-neonblue/30 to-transparent animate-scan-down" />
        </div>
      </div>

      <div className="container-custom relative z-10">
        <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <Sparkles className="w-4 h-4 text-mint" />
            <span className="text-sm font-medium text-gray-300">Ready to transform your organization?</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            See yourself in the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-light via-neonblue to-mint">
              future of attendance.
            </span>
          </h2>

          {/* Subtext */}
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            Join thousands of organizations who have made attendance effortless. Your journey starts with a simple demo.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple to-purple-light hover:from-purple/90 hover:to-purple-light/90 text-white text-lg px-8 py-6 shadow-lg shadow-purple/30 group"
              onClick={() => {
                const demoSection = document.getElementById('demo');
                if (demoSection) demoSection.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Try Live Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 group"
              onClick={onRequestDemo}
            >
              <MessageCircle className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              Talk to an Expert
            </Button>
          </div>

          {/* Trust line */}
          <p className={`mt-10 text-sm text-gray-500 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            No commitment required • 5-minute setup • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
