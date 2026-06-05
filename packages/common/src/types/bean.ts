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
  beansPerPod?: number;
  beanSize?: number;
  beanWeight?: number;
  beanColor1?: BeanColor;
  beanColor2?: BeanColor;
  beanColor3?: BeanColor;
  sourceId: string;
  description?: string;
  sourceDescription?: string;
  yearsGrown: number[];
  deletedInSource?: boolean;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}
