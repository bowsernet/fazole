export interface GrowRecord {
  id: string;
  year: number;
  beanId: string;
  preplantDate?: number;
  plantDate?: number;
  sproutDate?: number;
  flowerDate?: number;
  harvestStartDate?: number;
  harvestEndDate?: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
}
