
import React, { useEffect, useRef } from 'react';
import { 
  Shield, 
  Clock, 
  UserCheck, 
  Building, 
  Briefcase, 
  GraduationCap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon, title, description, delay = 0 }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('animate');
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [delay]);

  return (
    <Card className="animate-on-scroll h-full overflow-hidden" ref={cardRef}>
      <CardContent className="p-6 flex flex-col h-full">
        <div className="p-3 bg-purple/10 rounded-lg w-fit mb-4">
          <div className="text-purple">{icon}</div>
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 flex-grow">{description}</p>
      </CardContent>
    </Card>
  );
};

const FeaturesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate');
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

  const features = [
    {
      icon: <Clock size={24} />,
      title: "Smart Attendance",
      description: "Automated attendance tracking with facial recognition for businesses, schools, and events."
    },
    {
      icon: <Shield size={24} />,
      title: "Enhanced Security",
      description: "Advanced biometric access control to protect physical spaces and digital assets."
    },
    {
      icon: <UserCheck size={24} />,
      title: "Health Systems",
      description: "Streamlined patient identification and medical record access in healthcare facilities."
    },
    {
      icon: <Building size={24} />,
      title: "Corporate Solutions",
      description: "Workforce management and secure access for enterprises of all sizes."
    },
    {
      icon: <GraduationCap size={24} />,
      title: "Educational Integration",
      description: "Specialized systems for schools and universities to track attendance and enhance campus security."
    },
    {
      icon: <Briefcase size={24} />,
      title: "Custom Implementation",
      description: "Tailored biometric solutions designed for your organization's specific needs."
    }
  ];

  return (
    <section id="features" className="section bg-gray-50" ref={sectionRef}>
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="animate-on-scroll mb-4" ref={headingRef}>Unlocking Possibilities with Face Recognition</h2>
          <p className="text-gray-600 text-lg">Our biometric technology powers a range of smart solutions across different sectors.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 100}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
