
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  image: string;
  quote: string;
}

const TestimonialSection = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Principal",
      company: "Heritage Academy",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      quote: "Implementing Mispar's facial recognition system has transformed how we track attendance. Our staff saves hours each day, and students can no longer have their friends answer for them!"
    },
    {
      id: 2,
      name: "Michael Thompson",
      role: "IT Director",
      company: "GlobalTech Corp",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      quote: "The security enhancements we've gained with MisparTech's biometric system have been remarkable. Implementation was smooth, and their support team is always available when we need them."
    },
    {
      id: 3,
      name: "Pastor Emmanuel Okonkwo",
      role: "Senior Pastor",
      company: "Grace Fellowship Church",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      quote: "Our congregation of over 2,000 members now enjoys a seamless attendance experience. We can focus more on ministry instead of administrative tasks, thanks to MisparTech's innovative solution."
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };
  
  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

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
    <section className="section bg-gradient-to-br from-purple/10 to-purple-light/10">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="mb-4">What Our Clients Say</h2>
          <p className="text-lg text-gray-600">
            Hear from organizations that have transformed their operations with our biometric solutions.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto animate-on-scroll" ref={sectionRef}>
          <div className="relative bg-white rounded-xl shadow-xl p-8 md:p-12">
            <div className="absolute -top-6 left-12 bg-purple text-white p-3 rounded-full">
              <MessageSquare size={24} />
            </div>
            
            <div className="pt-4">
              <blockquote className="text-xl md:text-2xl text-gray-700 italic mb-8">
                "{testimonials[currentIndex].quote}"
              </blockquote>
              
              <div className="flex items-center">
                <img 
                  src={testimonials[currentIndex].image} 
                  alt={testimonials[currentIndex].name} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple"
                />
                <div className="ml-4">
                  <p className="font-bold text-lg">{testimonials[currentIndex].name}</p>
                  <p className="text-gray-600">{testimonials[currentIndex].role}, {testimonials[currentIndex].company}</p>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-6 right-6 flex space-x-2">
              <button 
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-purple hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-purple hover:text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 mx-1 rounded-full ${
                index === currentIndex ? 'bg-purple' : 'bg-gray-300'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
