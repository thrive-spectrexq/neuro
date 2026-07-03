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
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 ${onClick ? 'cursor-pointer hover:bg-blue-200' : ''}`}
    >
      {tag}
    </span>
  );
};
