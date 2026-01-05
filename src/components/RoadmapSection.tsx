import React, { useState, useRef, useEffect } from 'react';
import { 
  Rocket, 
  GraduationCap, 
  Shield, 
  Heart, 
  Globe,
  ChevronDown,
  CheckCircle2,
  Clock,
  Users,
  Sparkles
} from 'lucide-react';

interface RoadmapItemProps {
  title: string;
  date: string;
  description: string;
  userBenefit: string;
  icon: React.ElementType;
  isCompleted?: boolean;
  isCurrent?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

const RoadmapItem = ({ 
  title, 
  date, 
  description, 
  userBenefit,
  icon: Icon,
  isCompleted = false, 
  isCurrent = false, 
  isExpanded,
  onToggle,
  delay = 0 
}: RoadmapItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current) {
        observer.unobserve(itemRef.current);
      }
    };
  }, [delay]);

  return (
    <div 
      ref={itemRef}
      className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
    >
      {/* Timeline connector */}
      <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-purple/50 to-transparent" />
      
      <div 
        className={`relative flex gap-4 cursor-pointer group ${isCurrent ? 'z-10' : ''}`}
        onClick={onToggle}
      >
        {/* Icon circle */}
        <div className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
          isCompleted 
            ? 'bg-mint text-charcoal' 
            : isCurrent 
              ? 'bg-purple text-white ring-4 ring-purple/30 animate-pulse' 
              : 'bg-charcoal-light text-gray-400'
        }`}>
          {isCompleted ? (
            <CheckCircle2 size={20} />
          ) : (
            <Icon size={20} />
          )}
          {isCurrent && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-mint rounded-full flex items-center justify-center">
              <Sparkles size={10} className="text-charcoal" />
            </div>
          )}
        </div>

        {/* Content card */}
        <div className={`flex-1 pb-8 ${isCurrent ? 'pb-10' : ''}`}>
          <div className={`bg-charcoal-light/50 backdrop-blur-sm rounded-xl border transition-all duration-300 overflow-hidden ${
            isCurrent 
              ? 'border-purple/50 shadow-lg shadow-purple/10' 
              : isExpanded 
                ? 'border-white/10' 
                : 'border-white/5 group-hover:border-white/10'
          }`}>
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isCompleted 
                      ? 'bg-mint/10 text-mint' 
                      : isCurrent 
                        ? 'bg-purple/20 text-purple-light' 
                        : 'bg-white/5 text-gray-500'
                  }`}>
                    {date}
                  </span>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple text-white font-medium animate-pulse">
                      Current Phase
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
              </div>
              <ChevronDown 
                size={20} 
                className={`text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Expandable content */}
            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-48' : 'max-h-0'}`}>
              <div className="px-4 pb-4 space-y-3">
                <p className="text-gray-400 text-sm">{description}</p>
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-purple/5 border border-purple/10">
                  <Users size={16} className="text-purple shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-purple-light font-medium mb-0.5">What this means for you</p>
                    <p className="text-sm text-gray-300">{userBenefit}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoadmapSection = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(2); // Current phase expanded by default
  const headingRef = useRef<HTMLDivElement>(null);
  const [headingVisible, setHeadingVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setHeadingVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (headingRef.current) {
      observer.observe(headingRef.current);
    }

    return () => {
      if (headingRef.current) {
        observer.unobserve(headingRef.current);
      }
    };
  }, []);

  const roadmapItems = [
    {
      title: "Smart Attendance System Launch",
      date: "January 2023",
      description: "Initial release of our core facial recognition attendance tracking solution for businesses and organizations.",
      userBenefit: "Eliminate manual attendance tracking and save hours of administrative work each day.",
      icon: Rocket,
      isCompleted: true,
      delay: 0
    },
    {
      title: "Educational Sector Integration",
      date: "June 2023",
      description: "Specialized features for schools and universities, including classroom attendance and campus access management.",
      userBenefit: "Students and staff enjoy seamless check-ins while schools get real-time attendance insights.",
      icon: GraduationCap,
      isCompleted: true,
      delay: 100
    },
    {
      title: "Enhanced Security Solutions",
      date: "December 2023",
      description: "Advanced security features including multi-factor authentication and integration with existing security systems.",
      userBenefit: "Your premises become more secure with frictionless yet robust access control.",
      icon: Shield,
      isCurrent: true,
      delay: 200
    },
    {
      title: "Healthcare System Integration",
      date: "March 2024",
      description: "Seamless patient identification and record access for hospitals and healthcare facilities.",
      userBenefit: "Faster patient check-ins and more secure access to medical records.",
      icon: Heart,
      delay: 300
    },
    {
      title: "Mobile Platform & Global Expansion",
      date: "September 2024",
      description: "Launch of mobile applications and expansion of services to international markets.",
      userBenefit: "Access attendance and security features from anywhere on your mobile device.",
      icon: Globe,
      delay: 400
    }
  ];

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <section id="roadmap" className="py-20 bg-charcoal">
      <div className="container-custom">
        <div 
          ref={headingRef}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple/10 border border-purple/20 mb-6">
            <Clock className="w-4 h-4 text-purple" />
            <span className="text-sm font-medium text-purple-light">Product Roadmap</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Our Journey of Innovation
          </h2>
          <p className="text-gray-400 text-lg">
            Tap on any milestone to learn more about our progress and what it means for you.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          {roadmapItems.map((item, index) => (
            <RoadmapItem
              key={index}
              title={item.title}
              date={item.date}
              description={item.description}
              userBenefit={item.userBenefit}
              icon={item.icon}
              isCompleted={item.isCompleted}
              isCurrent={item.isCurrent}
              isExpanded={expandedIndex === index}
              onToggle={() => toggleExpand(index)}
              delay={item.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
