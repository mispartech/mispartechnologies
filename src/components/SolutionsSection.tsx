import React, { useRef, useEffect, useState } from 'react';
import { Shield, Heart, GraduationCap, Users, Target, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import AttendanceSimulation from './AttendanceSimulation';

interface SecondarySolutionProps {
  icon: React.ReactNode;
  title: string;
  whoItsFor: string;
  problemSolved: string;
  delay: number;
  isVisible: boolean;
}

const SecondarySolution = ({ icon, title, whoItsFor, problemSolved, delay, isVisible }: SecondarySolutionProps) => {
  return (
    <Card 
      className={`group h-full overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 h-full flex flex-col">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <div className="text-primary">{icon}</div>
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold mb-4 group-hover:text-primary transition-colors">{title}</h3>
        
        {/* Who it's for */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            <Users size={14} />
            <span>Who it's for</span>
          </div>
          <p className="text-foreground text-sm">{whoItsFor}</p>
        </div>
        
        {/* Problem solved */}
        <div className="flex-grow">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            <Target size={14} />
            <span>Problem solved</span>
          </div>
          <p className="text-foreground text-sm">{problemSolved}</p>
        </div>
        
        {/* Learn more link */}
        <button className="mt-4 text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          Learn more
          <ArrowRight size={14} />
        </button>
      </CardContent>
    </Card>
  );
};

const SolutionsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
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

  const secondarySolutions = [
    {
      icon: <Shield size={24} />,
      title: "Security Access",
      whoItsFor: "Offices, banks, and gated communities",
      problemSolved: "Eliminates unauthorized access and security breaches with instant face verification."
    },
    {
      icon: <Heart size={24} />,
      title: "Healthcare Systems",
      whoItsFor: "Hospitals, clinics, and pharmacies",
      problemSolved: "Prevents medical identity fraud and ensures correct patient records every time."
    },
    {
      icon: <GraduationCap size={24} />,
      title: "Education Solutions",
      whoItsFor: "Schools, universities, and training centers",
      problemSolved: "Automates student attendance and enhances campus security effortlessly."
    }
  ];

  return (
    <section id="solutions" className="section bg-muted/30" ref={sectionRef}>
      <div className="container-custom">
        {/* Section header */}
        <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Our Solutions
          </span>
          <h2 className="mb-4">One Technology, Many Applications</h2>
          <p className="text-muted-foreground text-lg">
            Face recognition that adapts to your industry's unique needs.
          </p>
        </div>

        {/* Featured Smart Attendance - Interactive Simulation */}
        <div className={`mb-12 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <CardContent className="p-8 lg:p-10">
              <div className="flex items-center justify-center gap-2 mb-8">
                <span className="px-3 py-1 rounded-full bg-mint text-charcoal text-sm font-bold">
                  Flagship Product
                </span>
              </div>
              <AttendanceSimulation />
            </CardContent>
          </Card>
        </div>

        {/* Secondary Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {secondarySolutions.map((solution, index) => (
            <SecondarySolution
              key={index}
              icon={solution.icon}
              title={solution.title}
              whoItsFor={solution.whoItsFor}
              problemSolved={solution.problemSolved}
              delay={200 + index * 100}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
