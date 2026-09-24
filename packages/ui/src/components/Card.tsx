import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'bordered' | 'subtle' | 'glass';
  density?: 'compact' | 'normal' | 'relaxed';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = '',
      variant = 'bordered',
      density = 'normal',
      interactive = false,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles = 'rounded-2xl transition-all duration-200 ease-out';

    const variants = {
      flat: 'bg-white/[0.03] border border-transparent text-[#F5F5F7]',
      bordered:
        'bg-[#16161A]/80 backdrop-blur-xl border border-white/[0.08] text-[#F5F5F7] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)]',
      subtle: 'bg-white/[0.05] backdrop-blur-2xl border border-white/[0.1] text-[#F5F5F7]',
      glass: 'bg-black/40 backdrop-blur-3xl border border-white/[0.12] text-[#F5F5F7] shadow-xl',
    };

    const densities = {
      compact: 'p-3',
      normal: 'p-4.5',
      relaxed: 'p-6',
    };

    const interactiveStyles = interactive
      ? 'hover:bg-white/[0.08] hover:border-white/[0.16] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)] hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]'
      : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${densities[density]} ${interactiveStyles} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
