import React, { useRef, useEffect, useState } from 'react';
import InteractiveFaceDemo from './InteractiveFaceDemo';
import LightweightDemoForm from './LightweightDemoForm';

const DemoSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  return (
    <section id="demo" className="section bg-gradient-to-b from-background to-muted/30" ref={sectionRef}>
      <div className="container-custom">
        <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Try It Now
          </span>
          <h2 className="mb-4">Experience Face Recognition</h2>
          <p className="text-muted-foreground text-lg">
            Upload your photo to enroll, then use your camera to experience real-time face recognition. Free 7-day trial.
          </p>
        </div>
        
        <div className={`transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Interactive Demo Experience */}
          <InteractiveFaceDemo onComplete={() => setShowForm(true)} />
          
          {/* Lightweight Form - appears after demo */}
          <div className={`mt-12 pt-8 border-t border-border transition-all duration-500 ${showForm ? 'opacity-100' : 'opacity-0'}`}>
            <LightweightDemoForm isVisible={showForm} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
