import React, { useState, useEffect } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FaceScanVisualization from './FaceScanVisualization';

interface HeroSectionProps {
  onRequestDemo?: () => void;
}

const HeroSection = ({ onRequestDemo }: HeroSectionProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showScrollCue, setShowScrollCue] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setIsLoaded(true), 100);
    const scrollTimer = setTimeout(() => setShowScrollCue(true), 1500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(scrollTimer);
    };
  }, []);

  const scrollToHowItWorks = () => {
    const section = document.getElementById('how-it-works');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Face scan visualization background */}
      <FaceScanVisualization />

      {/* Content */}
      <div className="container-custom relative z-20 pt-20">
        <div className="max-w-2xl">
          {/* Badge */}
          <div 
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm border border-primary/30 mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span className="text-sm font-medium text-primary-foreground/90">Smart Attendance System</span>
          </div>

          {/* Headline */}
          <h1 
            className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-primary-foreground transition-all duration-700 delay-150 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            Attendance that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonblue to-mint">
              recognizes you.
            </span>
          </h1>

          {/* Subheadline */}
          <p 
            className={`text-xl md:text-2xl mb-8 text-primary-foreground/80 font-light transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            No cards. No clocks. Just your face.
          </p>

          {/* CTA Buttons */}
          <div 
            className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground text-lg px-8 shadow-lg shadow-primary/30 group"
              onClick={() => {
                const demoSection = document.getElementById('demo');
                if (demoSection) demoSection.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Try Live Face Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 group"
              onClick={scrollToHowItWorks}
            >
              <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              See How It Works
            </Button>
          </div>

          {/* Trust indicators */}
          <div 
            className={`mt-12 flex flex-wrap items-center gap-4 sm:gap-6 text-primary-foreground/60 text-sm transition-all duration-700 delay-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <span className="text-xs font-bold">99%</span>
              </div>
              <span>Accuracy</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-primary-foreground/20" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <span className="text-xs font-bold">&lt;1s</span>
              </div>
              <span>Recognition</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-primary-foreground/20" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <span className="text-xs font-bold">24/7</span>
              </div>
              <span>Available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue with scanning line animation */}
      <div 
        className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 transition-all duration-700 ${showScrollCue ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <button 
          onClick={scrollToHowItWorks}
          className="group flex flex-col items-center text-primary-foreground/70 hover:text-primary-foreground transition-colors cursor-pointer"
          aria-label="Scroll to learn more"
        >
          <span className="text-sm mb-3 font-medium tracking-wide">Discover the Technology</span>
          
          {/* Arrow that morphs into scanning line on hover */}
          <div className="relative w-8 h-12 overflow-hidden">
            {/* Arrow */}
            <svg 
              className="w-6 h-6 absolute top-0 left-1/2 -translate-x-1/2 animate-bounce group-hover:opacity-0 transition-opacity" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            
            {/* Scanning line (appears on hover) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-neonblue to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-scan-down transition-opacity" />
          </div>
        </button>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
};

export default HeroSection;
