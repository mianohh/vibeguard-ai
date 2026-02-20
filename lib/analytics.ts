// In-memory analytics store (production would use a database)
interface AnalyticsData {
  totalScans: number;
  totalValueProtected: number; // in SUI
  scamsBlocked: number;
  lastUpdated: Date;
}

class AnalyticsStore {
  private data: AnalyticsData = {
    totalScans: 147,
    totalValueProtected: 2847.5,
    scamsBlocked: 23,
    lastUpdated: new Date()
  };

  increment(field: 'totalScans' | 'scamsBlocked', value: number = 1) {
    this.data[field] += value;
    this.data.lastUpdated = new Date();
  }

  addValueProtected(suiAmount: number) {
    this.data.totalValueProtected += suiAmount;
    this.data.lastUpdated = new Date();
  }

  getData(): AnalyticsData {
    return { ...this.data };
  }
}

export const analytics = new AnalyticsStore();
