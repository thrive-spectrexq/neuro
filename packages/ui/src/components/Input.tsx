import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-[#A1A1A6] mb-1.5 tracking-tight">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B] pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`flex h-9 w-full rounded-xl border border-white/[0.09] bg-white/[0.05] px-3.5 py-1.5 text-xs text-[#F5F5F7] placeholder:text-[#86868B] transition-all duration-150 focus:outline-none focus:border-[#0071E3] focus:bg-white/[0.08] focus:ring-2 focus:ring-[#0071E3]/30 disabled:cursor-not-allowed disabled:opacity-40 ${icon ? 'pl-9' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-[#FF453A] font-medium tracking-tight">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
