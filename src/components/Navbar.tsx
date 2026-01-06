import React, { useState, useEffect } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onRequestDemo?: () => void;
}

const Navbar = ({ onRequestDemo }: NavbarProps) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center">
            <span className="text-2xl font-montserrat font-bold text-purple">Mispar<span className="text-purple-light">Tech</span></span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <ul className="flex items-center space-x-8 font-montserrat">
              <li><a href="#features" className="text-gray-800 hover:text-purple transition-colors">Features</a></li>
              <li><a href="#solutions" className="text-gray-800 hover:text-purple transition-colors">Solutions</a></li>
              <li><a href="#roadmap" className="text-gray-800 hover:text-purple transition-colors">Roadmap</a></li>
              <li><a href="#demo" className="text-gray-800 hover:text-purple transition-colors">Demo</a></li>
            </ul>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2" onClick={() => navigate('/auth')}>
                <LogIn className="w-4 h-4" />
                Login
              </Button>
              <Button className="bg-purple hover:bg-purple-dark text-white" onClick={onRequestDemo}>Request Demo</Button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-gray-800" onClick={toggleMenu}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white">
          <div className="container-custom py-4">
            <ul className="space-y-4 font-montserrat">
              <li><a href="#features" className="block text-gray-800 hover:text-purple transition-colors" onClick={toggleMenu}>Features</a></li>
              <li><a href="#solutions" className="block text-gray-800 hover:text-purple transition-colors" onClick={toggleMenu}>Solutions</a></li>
              <li><a href="#roadmap" className="block text-gray-800 hover:text-purple transition-colors" onClick={toggleMenu}>Roadmap</a></li>
              <li><a href="#demo" className="block text-gray-800 hover:text-purple transition-colors" onClick={toggleMenu}>Demo</a></li>
              <li><Button variant="outline" className="w-full gap-2" onClick={() => navigate('/auth')}>
                <LogIn className="w-4 h-4" />
                Login
              </Button></li>
              <li><Button className="w-full bg-purple hover:bg-purple-dark text-white" onClick={onRequestDemo}>Request Demo</Button></li>
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
