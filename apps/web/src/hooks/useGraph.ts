import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';

export interface GraphNode {
  id: string;
  name: string;
  type: 'note' | 'tag';
  val?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const fetchGraphData = async (): Promise<GraphData> => {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/v1/graph', {
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    throw new Error('Failed to fetch graph data');
  }
  return response.json();
};

export function useGraph() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: fetchGraphData,
  });
}
