
import React, { useRef, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SolutionsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
    };
  }, []);

  const benefits = [
    "Eliminate manual attendance processes",
    "Reduce time fraud and buddy punching",
    "Generate accurate attendance reports instantly",
    "Integrate with existing HR and payroll systems",
    "Easy installation and maintenance",
    "Cost-effective solution with quick ROI"
  ];

  return (
    <section id="solutions" className="section" ref={sectionRef}>
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-on-scroll-right" ref={imageRef}>
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-purple rounded-lg opacity-30 z-0"></div>
              <img 
                src="https://images.unsplash.com/photo-1523206489230-c012c64b2b48?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80" 
                alt="Smart Attendance System" 
                className="rounded-lg shadow-xl relative z-10 w-full h-auto object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-light rounded-lg opacity-20 z-0"></div>
            </div>
            <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">Smart Attendance System</h3>
              <p className="text-gray-600">Our flagship solution that revolutionizes how organizations track and manage attendance using facial recognition.</p>
            </div>
          </div>
          
          <div className="animate-on-scroll" ref={contentRef}>
            <div className="lg:pl-8">
              <h2 className="mb-6">Transforming Attendance Management with Face Recognition</h2>
              <p className="text-lg text-gray-700 mb-8">
                Our Smart Attendance System eliminates traditional methods like ID cards, fingerprints, or manual processes. With just a glance, employees and students can check in and out, creating a seamless, hygienic, and fraud-proof experience.
              </p>
              
              <div className="space-y-3 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle className="text-purple shrink-0 mr-3 h-6 w-6" />
                    <p className="text-gray-700">{benefit}</p>
                  </div>
                ))}
              </div>
              
              <Button className="bg-purple hover:bg-purple-dark text-white">
                Learn More About Smart Attendance
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionsSection;
