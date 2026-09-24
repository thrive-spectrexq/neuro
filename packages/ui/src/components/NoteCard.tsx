import React from 'react';
import { Note, truncate, formatDate } from '@neuro/shared';
import { TagBadge } from './TagBadge';

export interface NoteCardProps {
  note: Note;
  onClick?: (note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, onClick }) => {
  return (
    <div
      onClick={() => onClick?.(note)}
      className="p-4 rounded-2xl bg-[#16161A]/80 hover:bg-[#1C1C22]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.16] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.65)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer text-[#F5F5F7]"
    >
      <h3 className="font-semibold text-sm tracking-tight mb-1.5 truncate text-[#F5F5F7]">
        {note.title || 'Untitled Note'}
      </h3>
      <p className="text-[#A1A1A6] text-xs leading-relaxed mb-3.5 h-10 overflow-hidden line-clamp-2">
        {truncate(note.content, 110)}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <div className="flex gap-1.5 flex-wrap overflow-hidden h-6 items-center">
          {note.tags?.slice(0, 3).map((tag: string) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {note.tags && note.tags.length > 3 && (
            <span className="text-[10px] text-[#86868B] font-mono">+{note.tags.length - 3}</span>
          )}
        </div>
        <span className="text-[10px] text-[#86868B] font-mono whitespace-nowrap">
          {formatDate(note.updatedAt)}
        </span>
      </div>
    </div>
  );
};
