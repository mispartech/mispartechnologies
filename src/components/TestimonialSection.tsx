import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote, Building2, GraduationCap, Church, Clock, TrendingUp, Users } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  type: 'school' | 'church' | 'company';
  quote: string;
  impactMetric: string;
  impactLabel: string;
}

const TestimonialSection = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Dr. Sarah Johnson",
      role: "Principal",
      company: "Heritage Academy",
      type: 'school',
      quote: "Our staff saves hours each day on attendance. Students can no longer have friends answer for them—it's completely transformed our classroom management.",
      impactMetric: "3 hrs",
      impactLabel: "Saved daily"
    },
    {
      id: 2,
      name: "Michael Thompson",
      role: "IT Director",
      company: "GlobalTech Corp",
      type: 'company',
      quote: "Implementation was smooth, and the security enhancements have been remarkable. Their support team is always available when we need them.",
      impactMetric: "98%",
      impactLabel: "Accuracy rate"
    },
    {
      id: 3,
      name: "Pastor Emmanuel Okonkwo",
      role: "Senior Pastor",
      company: "Grace Fellowship Church",
      type: 'church',
      quote: "Our congregation of over 2,000 members now enjoys a seamless attendance experience. We can focus more on ministry instead of administrative tasks.",
      impactMetric: "2,000+",
      impactLabel: "Members tracked"
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const sectionRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout>();
  
  const nextTestimonial = () => {
    if (isAnimating) return;
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };
  
  const prevTestimonial = () => {
    if (isAnimating) return;
    setSlideDirection('left');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
      setIsAnimating(false);
    }, 300);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'school': return GraduationCap;
      case 'church': return Church;
      case 'company': return Building2;
      default: return Building2;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'school': return { label: 'Education', color: 'bg-neonblue/10 text-neonblue border-neonblue/20' };
      case 'church': return { label: 'Religious Org', color: 'bg-purple/10 text-purple-light border-purple/20' };
      case 'company': return { label: 'Enterprise', color: 'bg-mint/10 text-mint border-mint/20' };
      default: return { label: 'Organization', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
    }
  };

  // Auto-play carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      nextTestimonial();
    }, 6000);

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, []);

  const currentTestimonial = testimonials[currentIndex];
  const TypeIcon = getTypeIcon(currentTestimonial.type);
  const typeBadge = getTypeBadge(currentTestimonial.type);

  return (
    <section className="py-20 bg-gradient-to-br from-charcoal via-charcoal-light to-charcoal overflow-hidden">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple/10 border border-purple/20 mb-6">
            <Users className="w-4 h-4 text-purple" />
            <span className="text-sm font-medium text-purple-light">Success Stories</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Trusted by Organizations Like Yours
          </h2>
          <p className="text-lg text-gray-400">
            See how schools, churches, and companies are transforming their operations.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto" ref={sectionRef}>
          <div className="relative">
            {/* Main testimonial card */}
            <div className={`bg-charcoal-light/50 backdrop-blur-sm rounded-2xl border border-white/10 p-8 md:p-10 transition-all duration-300 ${isAnimating ? (slideDirection === 'right' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8') : 'opacity-100 translate-x-0'}`}>
              {/* Quote icon */}
              <div className="absolute -top-4 left-8 w-8 h-8 rounded-full bg-purple flex items-center justify-center">
                <Quote size={16} className="text-white" />
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Left: Avatar and info */}
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar silhouette */}
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple/30 to-purple-light/30 flex items-center justify-center mb-4 ring-2 ring-purple/20">
                      <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center">
                        <TypeIcon className="w-8 h-8 text-purple-light" />
                      </div>
                    </div>

                    <h4 className="font-bold text-white text-lg">{currentTestimonial.name}</h4>
                    <p className="text-gray-400 text-sm mb-3">{currentTestimonial.role}</p>
                    
                    {/* Context badge */}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${typeBadge.color}`}>
                      <TypeIcon size={12} />
                      {typeBadge.label}
                    </span>

                    {/* Impact metric */}
                    <div className="mt-6 p-4 rounded-xl bg-mint/5 border border-mint/10 w-full">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-mint" />
                        <span className="text-2xl font-bold text-mint">{currentTestimonial.impactMetric}</span>
                      </div>
                      <p className="text-xs text-gray-400">{currentTestimonial.impactLabel}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Quote */}
                <div className="md:col-span-2 flex flex-col justify-center">
                  <blockquote className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-6">
                    "{currentTestimonial.quote}"
                  </blockquote>
                  <p className="text-purple-light font-medium">
                    {currentTestimonial.company}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation arrows */}
            <button 
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-6 w-10 h-10 rounded-full bg-charcoal-light border border-white/10 text-white hover:bg-purple hover:border-purple transition-all duration-300 flex items-center justify-center"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-6 w-10 h-10 rounded-full bg-charcoal-light border border-white/10 text-white hover:bg-purple hover:border-purple transition-all duration-300 flex items-center justify-center"
              aria-label="Next testimonial"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (isAnimating) return;
                  setSlideDirection(index > currentIndex ? 'right' : 'left');
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentIndex(index);
                    setIsAnimating(false);
                  }, 300);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-purple' 
                    : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialSection;
