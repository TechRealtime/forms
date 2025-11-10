import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className, title, description, footer }) => {
  return (
    <div className={`bg-card text-card-foreground border border-border rounded-lg shadow-sm ${className}`}>
      {(title || description) && (
        <div className="p-6">
          {title && <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      )}
      <div className={`p-6 ${title || description ? 'pt-0' : ''}`}>
        {children}
      </div>
      {footer && (
        <div className="flex items-center p-6 pt-0 border-t border-border mt-6">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
