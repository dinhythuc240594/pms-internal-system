export const mockStats = {
  todayRevenue: 28650000,
  occupancyRate: 68.5,
  adr: 1420000, // Average Daily Rate
  revpar: 972700, // Revenue Per Available Room
  totalRooms: 17,
  occupiedRooms: 8,
  availableRooms: 5,
  dirtyRooms: 2,
  maintenanceRooms: 1,
  reservedRooms: 2,
  checkInsToday: 4,
  checkOutsToday: 3,
  
  revenueWeekly: [
    { day: 'T2', amount: 18500000 },
    { day: 'T3', amount: 22000000 },
    { day: 'T4', amount: 19800000 },
    { day: 'T5', amount: 25400000 },
    { day: 'T6', amount: 31200000 },
    { day: 'T7', amount: 38900000 },
    { day: 'CN', amount: 28650000 }
  ],
  
  channelShare: [
    { channel: 'Direct Walk-in', share: 35, color: '#1b49a6' },
    { channel: 'Booking.com', share: 28, color: '#0284c7' },
    { channel: 'Agoda', share: 20, color: '#f59e0b' },
    { channel: 'Traveloka', share: 12, color: '#10b981' },
    { channel: 'Khác', share: 5, color: '#8b5cf6' }
  ]
};
