
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, label, icon, ...props }, ref) => {
  const hasIcon = icon !== undefined;
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>}
      <div className="relative">
        {hasIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                {icon}
            </div>
        )}
        <input
          type={type}
          className={`flex h-10 w-full rounded-md border border-input bg-transparent ${hasIcon ? 'pl-10' : 'px-3'} py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          ref={ref}
          {...props}
        />
      </div>
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
