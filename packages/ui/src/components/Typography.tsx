import React from 'react';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'code' | 'label';
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'mono' | 'muted';
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ as = 'p', variant = 'body', className = '', children, ...props }, ref) => {
    const Component = as as any;

    const variants = {
      h1: 'text-2xl font-bold tracking-tight text-[#F1F5F9]',
      h2: 'text-xl font-semibold tracking-tight text-[#F1F5F9]',
      h3: 'text-base font-semibold text-[#F1F5F9]',
      h4: 'text-sm font-medium text-[#F1F5F9]',
      body: 'text-sm text-[#CBD5E1] leading-relaxed',
      caption: 'text-xs text-[#94A3B8]',
      mono: 'font-mono text-xs text-[#E2E8F0]',
      muted: 'text-xs text-[#64748B]',
    };

    return (
      <Component
        ref={ref}
        className={`${variants[variant]} ${className}`.trim()}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Typography.displayName = 'Typography';
