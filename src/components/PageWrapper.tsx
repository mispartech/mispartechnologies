import React from 'react';
import useDocumentTitle from '@/hooks/useDocumentTitle';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
}

/**
 * A wrapper component that sets the document title based on the current route
 */
const PageWrapper: React.FC<PageWrapperProps> = ({ children, title }) => {
  useDocumentTitle(title);
  return <>{children}</>;
};

export default PageWrapper;
