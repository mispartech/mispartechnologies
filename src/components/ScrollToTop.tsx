
import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 bg-purple text-white p-3 rounded-full shadow-lg hover:bg-purple-dark transition-colors z-50"
              aria-label="Scroll to top"
            >
              <ChevronUp size={24} />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Scroll to top</p>
          </TooltipContent>
        </Tooltip>
      )}
    </>
  );
};

export default ScrollToTop;
