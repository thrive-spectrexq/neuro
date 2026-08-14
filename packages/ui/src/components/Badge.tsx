import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'sm', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center gap-1 font-medium select-none rounded';

    const variants = {
      default: 'bg-[#161A24] text-[#94A3B8] border border-[#242A3C]',
      primary: 'bg-[#1E1B4B] text-[#A5B4FC] border border-[#3730A3]',
      success: 'bg-[#06281E] text-[#6EE7B7] border border-[#065F46]',
      warning: 'bg-[#2A1D0B] text-[#FDE047] border border-[#78350F]',
      danger: 'bg-[#2D141A] text-[#FDA4AF] border border-[#881337]',
      outline: 'bg-transparent text-[#94A3B8] border border-[#242A3C]',
    };

    const sizes = {
      xs: 'text-[10px] px-1.5 py-0.5',
      sm: 'text-[11px] px-2 py-0.5',
      md: 'text-xs px-2.5 py-1',
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
