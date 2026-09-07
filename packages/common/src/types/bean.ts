export type BeanSpecies = 'vulgaris' | 'lima' | 'scarlet';
export type PodType = 'snap' | 'dry';
export type PlantType = 'bush' | 'semi' | 'runner';
export type BeanColor = 'white' | 'yellow' | 'brown' | 'pink' | 'red' | 'purple' | 'black' | 'blue' | 'green';

export interface Bean {
  id: string;
  name: string;
  species: BeanSpecies;
  podType: PodType;
  plantType: PlantType;
  beansPerPod?: number | null;
  beanSize?: number | null;
  beanWeight?: number | null;
  beanColor1?: BeanColor | null;
  beanColor2?: BeanColor | null;
  beanColor3?: BeanColor | null;
  sourceId: string;
  description?: string | null;
  sourceDescription?: string | null;
  yearsGrown: number[];
  deletedInSource?: boolean | null;
  deletedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
