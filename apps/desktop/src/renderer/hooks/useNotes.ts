import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Note } from '../store/noteStore';

// Mock API
const fetchNotes = async (): Promise<Note[]> => {
  return [];
};

export function useNotes() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notes'],
    queryFn: fetchNotes,
  });

  return query;
}
