import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'sm', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center gap-1 font-medium select-none rounded-full tracking-tight';

    const variants = {
      default: 'bg-white/[0.06] text-[#A1A1A6] border border-white/[0.08]',
      primary: 'bg-[#0071E3]/15 text-[#0A84FF] border border-[#0071E3]/30',
      success: 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30',
      warning: 'bg-[#FF9F0A]/15 text-[#FF9F0A] border border-[#FF9F0A]/30',
      danger: 'bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30',
      outline: 'bg-transparent text-[#A1A1A6] border border-white/[0.12]',
    };

    const sizes = {
      xs: 'text-[10px] px-2 py-0.5',
      sm: 'text-[11px] px-2.5 py-0.5',
      md: 'text-xs px-3 py-1',
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
  },
);

Badge.displayName = 'Badge';
