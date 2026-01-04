import React, { useState, useEffect } from 'react';
import { Zap, Clock, Shield, Users, Fingerprint, CheckCircle2 } from 'lucide-react';

type SimulationStatus = 'waiting' | 'detected' | 'confirmed';

const AttendanceSimulation = () => {
  const [status, setStatus] = useState<SimulationStatus>('waiting');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const cycle = () => {
      setStatus('waiting');
      setShowConfetti(false);
      
      setTimeout(() => setStatus('detected'), 2000);
      setTimeout(() => {
        setStatus('confirmed');
        setShowConfetti(true);
      }, 4000);
      setTimeout(() => setShowConfetti(false), 5500);
    };

    cycle();
    const interval = setInterval(cycle, 7000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    waiting: {
      text: 'Waiting for face…',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-muted-foreground/30',
      pulse: true
    },
    detected: {
      text: 'Face detected',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500',
      pulse: true
    },
    confirmed: {
      text: 'Attendance confirmed ✓',
      color: 'text-mint',
      bgColor: 'bg-mint/10',
      borderColor: 'border-mint',
      pulse: false
    }
  };

  const benefits = [
    { icon: <Zap size={18} />, text: 'Check-in under 1 second' },
    { icon: <Shield size={18} />, text: 'Stops buddy punching' },
    { icon: <Fingerprint size={18} />, text: 'Works even with masks' },
    { icon: <Users size={18} />, text: 'Handles 1000+ employees' },
    { icon: <Clock size={18} />, text: 'Auto-syncs with payroll' },
    { icon: <CheckCircle2 size={18} />, text: '99.7% accuracy rate' }
  ];

  const config = statusConfig[status];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      {/* LEFT: Mock Camera Interface */}
      <div className="relative">
        <div className="bg-charcoal rounded-2xl p-4 shadow-2xl">
          {/* Camera header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white/60 font-mono">CAM-01</span>
            </div>
            <span className="text-xs text-white/40 font-mono">
              {new Date().toLocaleTimeString()}
            </span>
          </div>

          {/* Camera viewport */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-charcoal-light to-charcoal rounded-xl overflow-hidden">
            {/* Grid overlay */}
            <div className="absolute inset-0 opacity-20">
              <div className="w-full h-full" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>

            {/* Face frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`relative w-32 h-40 transition-all duration-500 ${config.borderColor}`}>
                {/* Corner brackets */}
                <div className={`absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 ${config.borderColor} transition-colors duration-300`} />
                <div className={`absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 ${config.borderColor} transition-colors duration-300`} />
                <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 ${config.borderColor} transition-colors duration-300`} />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 ${config.borderColor} transition-colors duration-300`} />

                {/* Scanning line */}
                {status === 'detected' && (
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-scan-line" />
                )}

                {/* Face silhouette */}
                <div className="absolute inset-4 flex items-center justify-center">
                  <svg viewBox="0 0 100 120" className={`w-full h-full ${status === 'waiting' ? 'opacity-30' : 'opacity-60'} transition-opacity duration-300`}>
                    <ellipse cx="50" cy="45" rx="35" ry="40" fill="none" stroke="currentColor" strokeWidth="2" className={config.color} />
                    {status !== 'waiting' && (
                      <>
                        <circle cx="35" cy="40" r="3" className={`${status === 'confirmed' ? 'fill-mint' : 'fill-amber-500'}`} />
                        <circle cx="65" cy="40" r="3" className={`${status === 'confirmed' ? 'fill-mint' : 'fill-amber-500'}`} />
                        <ellipse cx="50" cy="55" rx="5" ry="3" className={`${status === 'confirmed' ? 'fill-mint' : 'fill-amber-500'}`} />
                        <path d="M 35 70 Q 50 80 65 70" fill="none" stroke={status === 'confirmed' ? '#4fd1c5' : '#f59e0b'} strokeWidth="2" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Success confetti */}
                {showConfetti && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-confetti"
                        style={{
                          left: `${50 + (Math.random() - 0.5) * 80}%`,
                          top: `${50 + (Math.random() - 0.5) * 80}%`,
                          backgroundColor: ['#4fd1c5', '#6366f1', '#f59e0b', '#ec4899'][i % 4],
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Landmark dots when detected/confirmed */}
            {status !== 'waiting' && (
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { x: 42, y: 38, delay: 0 },
                  { x: 58, y: 38, delay: 0.1 },
                  { x: 50, y: 48, delay: 0.2 },
                  { x: 45, y: 58, delay: 0.3 },
                  { x: 55, y: 58, delay: 0.4 },
                ].map((dot, i) => (
                  <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 ${status === 'confirmed' ? 'bg-mint' : 'bg-amber-500'}`}
                    style={{
                      left: `${dot.x}%`,
                      top: `${dot.y}%`,
                      animationDelay: `${dot.delay}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className={`mt-3 py-2 px-4 rounded-lg ${config.bgColor} transition-colors duration-300`}>
            <div className="flex items-center justify-center gap-2">
              {config.pulse && (
                <div className={`w-2 h-2 rounded-full ${status === 'waiting' ? 'bg-muted-foreground' : 'bg-amber-500'} animate-pulse`} />
              )}
              {status === 'confirmed' && <CheckCircle2 size={16} className="text-mint" />}
              <span className={`text-sm font-medium ${config.color} transition-colors duration-300`}>
                {config.text}
              </span>
            </div>
          </div>
        </div>

        {/* Camera stand */}
        <div className="flex justify-center mt-2">
          <div className="w-4 h-8 bg-muted-foreground/30 rounded-b-lg" />
        </div>
      </div>

      {/* RIGHT: Benefits */}
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-2xl font-bold mb-2">Smart Attendance</h3>
          <p className="text-muted-foreground">Face-powered time tracking that just works.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-primary/5 hover:scale-[1.02] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {benefit.icon}
              </div>
              <span className="text-sm font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 pt-4 border-t border-border mt-6">
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-primary">99%</div>
            <div className="text-xs text-muted-foreground">Accuracy</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-primary">&lt;1s</div>
            <div className="text-xs text-muted-foreground">Check-in</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl font-bold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Cards needed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSimulation;
