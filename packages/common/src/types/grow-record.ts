export interface GrowRecord {
  id: string;
  year: number;
  beanId: string;
  preplantDate?: number | null;
  plantDate?: number | null;
  sproutDate?: number | null;
  flowerDate?: number | null;
  harvestStartDate?: number | null;
  harvestEndDate?: number | null;
  location?: string | null;
  note?: string | null;
  numPlanted?: number | null;
  yield?: number | null;
  deletedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
