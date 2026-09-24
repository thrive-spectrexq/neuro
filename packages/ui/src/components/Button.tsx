import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-full transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-[#0071E3] hover:bg-[#0077ED] text-white border border-white/15 shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]',
      secondary:
        'bg-white/[0.08] hover:bg-white/[0.14] text-[#F5F5F7] hover:text-white border border-white/[0.1] shadow-sm',
      ghost: 'bg-transparent hover:bg-white/[0.06] text-[#A1A1A6] hover:text-[#F5F5F7]',
      danger:
        'bg-[#FF453A]/15 hover:bg-[#FF453A]/25 text-[#FF453A] hover:text-[#FF6961] border border-[#FF453A]/30',
    };

    const sizes = {
      sm: 'h-8 px-3.5 text-xs',
      md: 'h-9 px-4 py-1.5 text-xs tracking-tight',
      lg: 'h-11 px-6 text-sm font-medium',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim();

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
