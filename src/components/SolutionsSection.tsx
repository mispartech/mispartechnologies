import React, { useRef, useEffect, useState } from 'react';
import { Clock, Shield, Heart, GraduationCap, Users, Target, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

        {/* Featured Smart Attendance Card */}
        <div className={`mb-8 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
            <CardContent className="p-0">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Image side */}
                <div className="relative h-64 lg:h-auto min-h-[300px] overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=774&q=80" 
                    alt="Employee using smart attendance" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/60 to-secondary/40" />
                  
                  {/* Badge */}
                  <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-mint text-charcoal text-sm font-bold flex items-center gap-1">
                    <Clock size={14} />
                    Flagship Product
                  </div>
                  
                  {/* Floating stats */}
                  <div className="absolute bottom-4 left-4 right-4 flex gap-4">
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-primary">99%</div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-primary">&lt;1s</div>
                      <div className="text-xs text-muted-foreground">Check-in</div>
                    </div>
                    <div className="bg-background/90 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                      <div className="text-2xl font-bold text-primary">0</div>
                      <div className="text-xs text-muted-foreground">Cards needed</div>
                    </div>
                  </div>
                </div>
                
                {/* Content side */}
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Smart Attendance</h3>
                      <p className="text-muted-foreground text-sm">Face-powered time tracking</p>
                    </div>
                  </div>
                  
                  {/* Who it's for */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                      <Users size={16} />
                      <span>Who it's for</span>
                    </div>
                    <p className="text-foreground">
                      Businesses, churches, schools, and any organization that needs reliable attendance tracking without the hassle of cards or manual registers.
                    </p>
                  </div>
                  
                  {/* Problem solved */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                      <Target size={16} />
                      <span>Problem solved</span>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-mint shrink-0 mt-0.5" />
                        <span className="text-foreground">Ends buddy punching and time theft</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-mint shrink-0 mt-0.5" />
                        <span className="text-foreground">No lost or forgotten ID cards</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={18} className="text-mint shrink-0 mt-0.5" />
                        <span className="text-foreground">Instant, touchless check-in experience</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground group">
                      Try Live Demo
                      <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/5">
                      See Pricing
                    </Button>
                  </div>
                </div>
              </div>
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
