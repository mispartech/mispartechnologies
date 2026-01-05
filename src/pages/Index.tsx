import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import HowItWorksSection from '@/components/HowItWorksSection';
import SolutionsSection from '@/components/SolutionsSection';
import RoadmapSection from '@/components/RoadmapSection';
import DemoSection from '@/components/DemoSection';
import TestimonialSection from '@/components/TestimonialSection';
import PrivacyTrustSection from '@/components/PrivacyTrustSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import DemoRequestModal from '@/components/DemoRequestModal';

const Index = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  useEffect(() => {
    // Update document title
    document.title = 'Mispar Technologies - Facial Recognition Solutions';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Unlock every barrier with Mispar Technologies facial recognition solutions. Smart attendance, security, and access control for organizations.');
    }
  }, []);

  const openDemoModal = () => setIsDemoModalOpen(true);
  const closeDemoModal = () => setIsDemoModalOpen(false);

  return (
    <div className="min-h-screen">
      <Navbar onRequestDemo={openDemoModal} />
      <main>
        <HeroSection onRequestDemo={openDemoModal} />
        <HowItWorksSection />
        <SolutionsSection />
        <TestimonialSection />
        <PrivacyTrustSection />
        <RoadmapSection />
        <DemoSection />
        <CTASection onRequestDemo={openDemoModal} />
      </main>
      <Footer />
      <ScrollToTop />
      <DemoRequestModal isOpen={isDemoModalOpen} onClose={closeDemoModal} />
    </div>
  );
};

export default Index;
