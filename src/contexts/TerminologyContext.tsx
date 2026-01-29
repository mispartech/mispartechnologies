import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define terminology mappings based on organization type/industry
const TERMINOLOGY_MAP: Record<string, { singular: string; plural: string; title: string }> = {
  // Church/Religious
  church: { singular: 'member', plural: 'members', title: 'Member' },
  religious: { singular: 'member', plural: 'members', title: 'Member' },
  nonprofit: { singular: 'member', plural: 'members', title: 'Member' },
  
  // Corporate/Business
  corporate: { singular: 'employee', plural: 'employees', title: 'Employee' },
  business: { singular: 'employee', plural: 'employees', title: 'Employee' },
  
  // Educational
  school: { singular: 'student', plural: 'students', title: 'Student' },
  university: { singular: 'student', plural: 'students', title: 'Student' },
  education: { singular: 'student', plural: 'students', title: 'Student' },
  
  // Healthcare
  hospital: { singular: 'staff', plural: 'staff', title: 'Staff' },
  healthcare: { singular: 'staff', plural: 'staff', title: 'Staff' },
  clinic: { singular: 'staff', plural: 'staff', title: 'Staff' },
  
  // Government
  government: { singular: 'employee', plural: 'employees', title: 'Employee' },
  
  // Default fallback
  other: { singular: 'member', plural: 'members', title: 'Member' },
};

interface TerminologyContextType {
  // Core terms
  personSingular: string;  // member, employee, student, staff
  personPlural: string;    // members, employees, students, staff
  personTitle: string;     // Member, Employee, Student, Staff
  
  // Organization info
  organizationType: string;
  organizationIndustry: string;
  organizationName: string;
  
  // Helper function to get term with proper casing
  getTerm: (type: 'singular' | 'plural' | 'title', capitalize?: boolean) => string;
  
  // Loading state
  isLoading: boolean;
  
  // Refresh function for when organization changes
  refreshTerminology: () => Promise<void>;
}

const defaultContext: TerminologyContextType = {
  personSingular: 'member',
  personPlural: 'members',
  personTitle: 'Member',
  organizationType: 'other',
  organizationIndustry: '',
  organizationName: '',
  getTerm: (type, capitalize = false) => {
    const term = type === 'singular' ? 'member' : type === 'plural' ? 'members' : 'Member';
    return capitalize ? term.charAt(0).toUpperCase() + term.slice(1) : term;
  },
  isLoading: true,
  refreshTerminology: async () => {},
};

const TerminologyContext = createContext<TerminologyContextType>(defaultContext);

export const useTerminology = () => {
  const context = useContext(TerminologyContext);
  if (!context) {
    return defaultContext;
  }
  return context;
};

interface TerminologyProviderProps {
  children: ReactNode;
  organizationId?: string;
}

export const TerminologyProvider: React.FC<TerminologyProviderProps> = ({ 
  children, 
  organizationId 
}) => {
  const [terminology, setTerminology] = useState({
    personSingular: 'member',
    personPlural: 'members',
    personTitle: 'Member',
  });
  const [organizationInfo, setOrganizationInfo] = useState({
    type: 'other',
    industry: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  const determineTerminology = (type: string, industry: string) => {
    // First check by industry (more specific)
    const industryLower = industry?.toLowerCase() || '';
    const typeLower = type?.toLowerCase() || 'other';
    
    // Check industry keywords
    for (const [key, terms] of Object.entries(TERMINOLOGY_MAP)) {
      if (industryLower.includes(key) || industryLower === key) {
        return terms;
      }
    }
    
    // Fall back to organization type
    return TERMINOLOGY_MAP[typeLower] || TERMINOLOGY_MAP.other;
  };

  const fetchOrganizationData = async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('type, industry, name')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching organization for terminology:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const terms = determineTerminology(data.type, data.industry || '');
        setTerminology({
          personSingular: terms.singular,
          personPlural: terms.plural,
          personTitle: terms.title,
        });
        setOrganizationInfo({
          type: data.type,
          industry: data.industry || '',
          name: data.name,
        });
      }
    } catch (error) {
      console.error('Error in fetchOrganizationData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationData();
  }, [organizationId]);

  // Subscribe to organization changes for real-time updates
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`org-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const terms = determineTerminology(newData.type, newData.industry || '');
          setTerminology({
            personSingular: terms.singular,
            personPlural: terms.plural,
            personTitle: terms.title,
          });
          setOrganizationInfo({
            type: newData.type,
            industry: newData.industry || '',
            name: newData.name,
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Organization realtime subscription error:', err?.message || status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const getTerm = (type: 'singular' | 'plural' | 'title', capitalize = false): string => {
    let term = '';
    switch (type) {
      case 'singular':
        term = terminology.personSingular;
        break;
      case 'plural':
        term = terminology.personPlural;
        break;
      case 'title':
        term = terminology.personTitle;
        break;
    }
    return capitalize ? term.charAt(0).toUpperCase() + term.slice(1) : term;
  };

  const value: TerminologyContextType = {
    ...terminology,
    organizationType: organizationInfo.type,
    organizationIndustry: organizationInfo.industry,
    organizationName: organizationInfo.name,
    getTerm,
    isLoading,
    refreshTerminology: fetchOrganizationData,
  };

  return (
    <TerminologyContext.Provider value={value}>
      {children}
    </TerminologyContext.Provider>
  );
};

export default TerminologyContext;
