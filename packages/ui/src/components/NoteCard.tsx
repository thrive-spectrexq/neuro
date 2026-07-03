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
      className="p-4 rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <h3 className="font-semibold text-lg mb-1 truncate">{note.title || 'Untitled'}</h3>
      <p className="text-gray-600 text-sm mb-3 h-10 overflow-hidden">
        {truncate(note.content, 100)}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap overflow-hidden h-6">
          {note.tags?.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {note.tags && note.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {formatDate(note.updatedAt)}
        </span>
      </div>
    </div>
  );
};
