import React from 'react';

export interface TagBadgeProps {
  tag: string;
  onClick?: (tag: string) => void;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onClick }) => {
  return (
    <span
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(tag);
        }
      }}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-tight bg-white/[0.08] hover:bg-white/[0.14] text-[#A1A1A6] hover:text-[#F5F5F7] border border-white/[0.08] transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      #{tag}
    </span>
  );
};
