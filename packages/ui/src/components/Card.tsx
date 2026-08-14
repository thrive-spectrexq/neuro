import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'flat' | 'bordered' | 'subtle';
  density?: 'compact' | 'normal' | 'relaxed';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'bordered', density = 'normal', interactive = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-lg transition-colors duration-150';

    const variants = {
      flat: 'bg-[#0F1117] border border-transparent',
      bordered: 'bg-[#0F1117] border border-[#1F2433] text-[#F1F5F9]',
      subtle: 'bg-[#151821] border border-[#242A3C] text-[#F1F5F9]',
    };

    const densities = {
      compact: 'p-2.5',
      normal: 'p-4',
      relaxed: 'p-6',
    };

    const interactiveStyles = interactive
      ? 'hover:bg-[#161A24] hover:border-[#2F374E] cursor-pointer'
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
  }
);

Card.displayName = 'Card';
