import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn, User, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { useDjangoAuth } from '@/contexts/DjangoAuthContext';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavbarProps {
  onRequestDemo?: () => void;
}

const Navbar = ({ onRequestDemo }: NavbarProps) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user: djangoUser, isAuthenticated, isLoading, logout } = useDjangoAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const getInitials = () => {
    if (djangoUser?.first_name && djangoUser?.last_name) {
      return `${djangoUser.first_name[0]}${djangoUser.last_name[0]}`.toUpperCase();
    }
    if (djangoUser?.email) {
      return djangoUser.email[0].toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (djangoUser?.first_name && djangoUser?.last_name) {
      return `${djangoUser.first_name} ${djangoUser.last_name}`;
    }
    return djangoUser?.email || 'User';
  };

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#solutions', label: 'Solutions' },
    { href: '#roadmap', label: 'Roadmap' },
    { href: '#demo', label: 'Demo' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-3' : 'bg-transparent py-5'
    }`}>
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <span className={`text-2xl font-montserrat font-bold ${
              isScrolled ? 'text-primary' : 'text-primary'
            }`}>
              Mispar <span className={isScrolled ? 'text-secondary' : 'text-purple-light'}>Technologies</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <ul className="flex items-center space-x-8 font-montserrat">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a 
                    href={link.href} 
                    className={`transition-colors ${
                      isScrolled 
                        ? 'text-foreground hover:text-primary' 
                        : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
              ) : isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`hidden lg:inline ${isScrolled ? 'text-foreground' : 'text-white'}`}>
                        {getDisplayName()}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className={`gap-2 ${!isScrolled && 'border-white/50 text-white hover:bg-white/10 hover:text-white'}`}
                    onClick={() => navigate('/auth')}
                  >
                    <LogIn className="w-4 h-4" />
                    Login
                  </Button>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                    onClick={onRequestDemo}
                  >
                    Request Demo
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={`md:hidden ${isScrolled ? 'text-foreground' : 'text-white'}`} 
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="container-custom py-4">
            <ul className="space-y-4 font-montserrat">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a 
                    href={link.href} 
                    className="block text-foreground hover:text-primary transition-colors" 
                    onClick={toggleMenu}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              
              {isLoading ? (
                <li><div className="w-full h-10 bg-muted animate-pulse rounded-md" /></li>
              ) : isAuthenticated ? (
                <>
                  <li>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={() => { navigate('/dashboard'); toggleMenu(); }}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </li>
                  <li>
                    <Button 
                      variant="ghost" 
                      className="w-full gap-2 text-destructive hover:text-destructive" 
                      onClick={() => { handleLogout(); toggleMenu(); }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Button 
                      variant="outline" 
                      className="w-full gap-2" 
                      onClick={() => { navigate('/auth'); toggleMenu(); }}
                    >
                      <LogIn className="w-4 h-4" />
                      Login
                    </Button>
                  </li>
                  <li>
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                      onClick={() => { onRequestDemo?.(); toggleMenu(); }}
                    >
                      Request Demo
                    </Button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
