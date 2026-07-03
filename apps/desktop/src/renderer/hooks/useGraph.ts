import { useQuery } from '@tanstack/react-query';

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
  const response = await fetch('/api/v1/graph');
  if (!response.ok) {
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
