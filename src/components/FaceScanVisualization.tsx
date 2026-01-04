import React from 'react';

const FaceScanVisualization = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(270,60%,12%)] via-[hsl(270,50%,18%)] to-[hsl(300,40%,15%)]" />
      
      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(270, 60%, 50%)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Scanning line animation */}
      <div className="absolute left-1/2 top-0 w-px h-full -translate-x-1/2">
        <div className="scan-line absolute w-[400px] md:w-[600px] h-[2px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
      </div>

      {/* Face detection frame */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[350px] md:w-[320px] md:h-[400px]">
        {/* Corner brackets */}
        <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-primary/80 animate-pulse" />
        <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-primary/80 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-primary/80 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-primary/80 animate-pulse" style={{ animationDelay: '0.6s' }} />
        
        {/* Face landmark dots */}
        <div className="face-dots absolute inset-0">
          {/* Eyes */}
          <div className="absolute top-[35%] left-[30%] w-2 h-2 rounded-full bg-neonblue shadow-[0_0_10px_hsl(195,100%,42%)] animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-[35%] right-[30%] w-2 h-2 rounded-full bg-neonblue shadow-[0_0_10px_hsl(195,100%,42%)] animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          
          {/* Nose */}
          <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-mint shadow-[0_0_8px_hsl(160,47%,72%)] animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          
          {/* Mouth corners */}
          <div className="absolute top-[65%] left-[35%] w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(270,60%,50%)] animate-ping" style={{ animationDuration: '2s', animationDelay: '0.7s' }} />
          <div className="absolute top-[65%] right-[35%] w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(270,60%,50%)] animate-ping" style={{ animationDuration: '2s', animationDelay: '0.9s' }} />
          
          {/* Jawline points */}
          <div className="absolute top-[75%] left-[25%] w-1 h-1 rounded-full bg-primary/60" />
          <div className="absolute top-[75%] right-[25%] w-1 h-1 rounded-full bg-primary/60" />
          <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/60" />
        </div>

        {/* Connecting lines */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1="30" y1="35" x2="70" y2="35" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
          <line x1="30" y1="35" x2="50" y2="50" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
          <line x1="70" y1="35" x2="50" y2="50" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
          <line x1="50" y1="50" x2="35" y2="65" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
          <line x1="50" y1="50" x2="65" y2="65" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
          <line x1="35" y1="65" x2="65" y2="65" stroke="hsl(270, 60%, 50%)" strokeWidth="0.3" className="animate-pulse" />
        </svg>
      </div>

      {/* Status indicator */}
      <div className="absolute top-1/2 right-[10%] -translate-y-1/2 hidden lg:block">
        <div className="space-y-3 text-xs font-montserrat text-primary-foreground/70">
          <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span>Face Detected</span>
          </div>
          <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            <div className="w-2 h-2 rounded-full bg-neonblue animate-pulse" />
            <span>Mapping Features</span>
          </div>
          <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '1.1s' }}>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Identity Verified</span>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/40 animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
};

export default FaceScanVisualization;
