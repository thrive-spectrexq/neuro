import React from 'react';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'code' | 'label';
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'mono' | 'muted';
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as = 'p', variant = 'body', className = '', children, ...props }, ref) => {
    const Component = as as any;

    const variants = {
      h1: 'text-2xl font-bold tracking-tight text-[#F5F5F7]',
      h2: 'text-xl font-semibold tracking-tight text-[#F5F5F7]',
      h3: 'text-base font-semibold tracking-tight text-[#F5F5F7]',
      h4: 'text-sm font-medium tracking-tight text-[#F5F5F7]',
      body: 'text-sm text-[#A1A1A6] leading-relaxed',
      caption: 'text-xs text-[#86868B] tracking-tight',
      mono: 'font-mono text-xs text-[#F5F5F7]',
      muted: 'text-xs text-[#6E6E73]',
    };

    return (
      <Component ref={ref} className={`${variants[variant]} ${className}`.trim()} {...props}>
        {children}
      </Component>
    );
  },
);

Typography.displayName = 'Typography';
