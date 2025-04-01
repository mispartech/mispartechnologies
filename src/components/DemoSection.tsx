
import React, { useRef, useEffect } from 'react';
import DemoForm from './DemoForm';
import { CheckCircle2 } from 'lucide-react';

const DemoSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

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

    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    if (formRef.current) {
      observer.observe(formRef.current);
    }

    return () => {
      if (contentRef.current) {
        observer.unobserve(contentRef.current);
      }
      if (formRef.current) {
        observer.unobserve(formRef.current);
      }
    };
  }, []);

  const demoFeatures = [
    "Experience real-time facial recognition in action",
    "Test compatibility with your existing systems",
    "Receive personalized guidance from our experts",
    "Evaluate the technology in your specific environment",
    "No obligation or commitment required"
  ];

  return (
    <section id="demo" className="section" ref={sectionRef}>
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="mb-4">Experience Our Technology</h2>
          <p className="text-lg text-gray-600">
            Request a personalized demo of our facial recognition system and see how it can transform your organization.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="animate-on-scroll" ref={contentRef}>
            <div className="bg-gradient-to-br from-purple/5 to-purple-light/5 p-8 rounded-xl h-full">
              <h3 className="text-2xl font-bold mb-6">Why Try Our Demo?</h3>
              
              <div className="space-y-4 mb-8">
                {demoFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start">
                    <CheckCircle2 className="text-purple shrink-0 mr-3 h-6 w-6" />
                    <p className="text-gray-700">{feature}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg">Active Demo Users</h4>
                  <span className="bg-purple/10 text-purple px-3 py-1 rounded-full text-sm font-medium">
                    Live Updates
                  </span>
                </div>
                
                <div className="flex justify-around text-center">
                  <div>
                    <div className="text-3xl font-bold text-purple mb-1">147</div>
                    <div className="text-sm text-gray-500">Today</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple mb-1">1,298</div>
                    <div className="text-sm text-gray-500">This Week</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple mb-1">5,726</div>
                    <div className="text-sm text-gray-500">This Month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="animate-on-scroll-right" ref={formRef}>
            <DemoForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
