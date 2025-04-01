
import React from 'react';
import { PhoneCall, Mail, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          <div>
            <div className="mb-5">
              <h2 className="text-2xl font-montserrat font-bold text-white">Mispar<span className="text-purple-light">Tech</span></h2>
            </div>
            <p className="text-gray-300 mb-6">
              Unlocking every barrier with innovative face recognition technology. Transform the way your organization handles identification, security, and access.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-purple transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-purple transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-purple transition-colors">
                <Linkedin size={18} />
              </a>
              <a href="#" className="bg-gray-800 p-2 rounded-full hover:bg-purple transition-colors">
                <Instagram size={18} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-6">Solutions</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Smart Attendance</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Security Systems</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Healthcare Integration</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Educational Solutions</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Corporate Access</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-6">Company</h3>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Our Team</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Press & Media</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin size={20} className="mr-3 shrink-0 text-purple-light" />
                <span className="text-gray-300">
                  Mispar Technologies, Lekki Phase 1, Lagos, Nigeria
                </span>
              </li>
              <li className="flex items-center">
                <PhoneCall size={20} className="mr-3 shrink-0 text-purple-light" />
                <a href="tel:+2348012345678" className="text-gray-300 hover:text-white transition-colors">
                  +234 801 234 5678
                </a>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 shrink-0 text-purple-light" />
                <a href="mailto:info@mispartech.com" className="text-gray-300 hover:text-white transition-colors">
                  info@mispartech.com
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-gray-400 text-sm flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {currentYear} Mispar Technologies. All rights reserved.</p>
          <div className="flex mt-4 md:mt-0 space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
