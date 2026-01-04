import React, { useEffect, useRef, useState } from 'react';
import { Camera, Scan, UserCheck, ClipboardCheck } from 'lucide-react';

interface StepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  stepNumber: number;
  isActive: boolean;
  delay: number;
}

const Step = ({ icon, title, description, stepNumber, isActive, delay }: StepProps) => {
  return (
    <div 
      className={`relative flex flex-col items-center text-center group transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Step number badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center z-10">
        {stepNumber}
      </div>
      
      {/* Icon container */}
      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 border border-primary/20">
        <div className="text-primary group-hover:text-secondary transition-colors duration-300">
          {icon}
        </div>
        
        {/* Hover glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-primary/0 group-hover:bg-primary/5 transition-all duration-300" />
      </div>
      
      {/* Title */}
      <h3 className="font-montserrat font-semibold text-lg mb-2 text-foreground group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-muted-foreground text-sm max-w-[180px]">
        {description}
      </p>
    </div>
  );
};

const HowItWorksSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lineProgress, setLineProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Animate the connecting line
            setTimeout(() => setLineProgress(100), 300);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
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

  const steps = [
    {
      icon: <Camera size={32} />,
      title: "Face Capture",
      description: "Camera detects your face in a split second."
    },
    {
      icon: <Scan size={32} />,
      title: "Feature Mapping",
      description: "We map unique points that make you, you."
    },
    {
      icon: <UserCheck size={32} />,
      title: "Identity Matching",
      description: "Your face is matched securely and instantly."
    },
    {
      icon: <ClipboardCheck size={32} />,
      title: "Attendance Logged",
      description: "Done! Your attendance is recorded automatically."
    }
  ];

  return (
    <section 
      id="how-it-works" 
      className="section bg-background relative overflow-hidden"
      ref={sectionRef}
    >
      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.05)_0%,transparent_70%)]" />
      </div>

      <div className="container-custom relative z-10">
        {/* Section header */}
        <div className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="mb-4">How Face Recognition Works</h2>
          <p className="text-muted-foreground text-lg">
            Four simple steps. Zero hassle. Instant results.
          </p>
        </div>

        {/* Steps container */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line - desktop */}
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-border">
            <div 
              className="h-full bg-gradient-to-r from-primary via-secondary to-primary transition-all duration-1000 ease-out"
              style={{ width: `${lineProgress}%` }}
            />
            {/* Animated dots on line */}
            <div className="absolute inset-0 flex justify-between items-center px-8">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full bg-primary transition-all duration-500 ${isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                  style={{ transitionDelay: `${400 + i * 200}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Steps grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <Step
                key={index}
                icon={step.icon}
                title={step.title}
                description={step.description}
                stepNumber={index + 1}
                isActive={isVisible}
                delay={index * 150}
              />
            ))}
          </div>

          {/* Mobile connecting lines */}
          <div className="md:hidden absolute left-1/2 top-24 bottom-24 w-0.5 bg-border -translate-x-1/2">
            <div 
              className="w-full bg-gradient-to-b from-primary to-secondary transition-all duration-1000 ease-out"
              style={{ height: `${lineProgress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
