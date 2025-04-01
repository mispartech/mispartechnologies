
import React, { useRef, useEffect } from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';

interface RoadmapItemProps {
  title: string;
  date: string;
  description: string;
  isCompleted?: boolean;
  isCurrent?: boolean;
  delay?: number;
}

const RoadmapItem = ({ title, date, description, isCompleted = false, isCurrent = false, delay = 0 }: RoadmapItemProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

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
    <div className="animate-on-scroll" ref={itemRef}>
      <div className={`flex border-l-4 ${isCompleted ? 'border-green-500' : isCurrent ? 'border-purple' : 'border-gray-300'} pl-6 pb-10 relative`}>
        <div className={`absolute -left-3 p-1 rounded-full 
                         ${isCompleted ? 'bg-green-500 text-white' : 
                           isCurrent ? 'bg-purple text-white' : 
                           'bg-gray-200 text-gray-500'}`}>
          {isCompleted ? (
            <CheckCircle2 size={20} />
          ) : (
            <Clock size={20} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <div className="flex items-center text-sm text-gray-500 mr-4">
              <Calendar size={16} className="mr-2" />
              <span>{date}</span>
            </div>
            <div className={`text-xs px-2 py-1 rounded font-medium 
                             ${isCompleted ? 'bg-green-100 text-green-800' : 
                               isCurrent ? 'bg-purple/10 text-purple' : 
                               'bg-gray-100 text-gray-800'}`}>
              {isCompleted ? 'Completed' : isCurrent ? 'Current Phase' : 'Upcoming'}
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};

const RoadmapSection = () => {
  const headingRef = useRef<HTMLDivElement>(null);

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

  const roadmapItems = [
    {
      title: "Smart Attendance System Launch",
      date: "January 2023",
      description: "Initial release of our core facial recognition attendance tracking solution for businesses and organizations.",
      isCompleted: true,
      delay: 0
    },
    {
      title: "Educational Sector Integration",
      date: "June 2023",
      description: "Specialized features for schools and universities, including classroom attendance and campus access management.",
      isCompleted: true,
      delay: 200
    },
    {
      title: "Enhanced Security Solutions",
      date: "December 2023",
      description: "Advanced security features including multi-factor authentication and integration with existing security systems.",
      isCurrent: true,
      delay: 400
    },
    {
      title: "Healthcare System Integration",
      date: "March 2024",
      description: "Seamless patient identification and record access for hospitals and healthcare facilities.",
      delay: 600
    },
    {
      title: "Mobile Platform & Global Expansion",
      date: "September 2024",
      description: "Launch of mobile applications and expansion of services to international markets.",
      delay: 800
    }
  ];

  return (
    <section id="roadmap" className="section bg-gray-50">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-on-scroll" ref={headingRef}>
          <h2 className="mb-4">Product Roadmap & Future Vision</h2>
          <p className="text-gray-600 text-lg">
            Our journey of innovation and expansion, with concrete dates and milestones as we revolutionize biometric technology.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          {roadmapItems.map((item, index) => (
            <RoadmapItem
              key={index}
              title={item.title}
              date={item.date}
              description={item.description}
              isCompleted={item.isCompleted}
              isCurrent={item.isCurrent}
              delay={item.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
