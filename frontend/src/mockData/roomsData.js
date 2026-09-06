export const mockFloors = ['Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4'];

export const mockRoomTypes = [
  { id: 'std', name: 'Standard (STD)', price: 850000 },
  { id: 'sup', name: 'Superior (SUP)', price: 1200000 },
  { id: 'dlx', name: 'Deluxe Ocean View (DLX)', price: 1750000 },
  { id: 'sut', name: 'President Suite (SUT)', price: 3500000 }
];

export const mockRooms = [
  // Tầng 1
  { id: '101', number: '101', floor: 'Tầng 1', type: 'Standard (STD)', price: 850000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
  { id: '102', number: '102', floor: 'Tầng 1', type: 'Standard (STD)', price: 850000, status: 'occupied', cleanStatus: 'clean', guest: 'Nguyễn Văn An', checkIn: '2026-09-05', checkOut: '2026-09-08' },
  { id: '103', number: '103', floor: 'Tầng 1', type: 'Superior (SUP)', price: 1200000, status: 'dirty', cleanStatus: 'dirty', guest: null, checkIn: null, checkOut: null },
  { id: '104', number: '104', floor: 'Tầng 1', type: 'Superior (SUP)', price: 1200000, status: 'occupied', cleanStatus: 'clean', guest: 'Trần Thị Mai', checkIn: '2026-09-06', checkOut: '2026-09-07' },
  { id: '105', number: '105', floor: 'Tầng 1', type: 'Deluxe (DLX)', price: 1750000, status: 'maintenance', cleanStatus: 'dirty', guest: null, checkIn: null, checkOut: null },

  // Tầng 2
  { id: '201', number: '201', floor: 'Tầng 2', type: 'Standard (STD)', price: 850000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
  { id: '202', number: '202', floor: 'Tầng 2', type: 'Standard (STD)', price: 850000, status: 'reserved', cleanStatus: 'clean', guest: 'Lê Hoàng Nam (Agoda)', checkIn: '2026-09-06', checkOut: '2026-09-09' },
  { id: '203', number: '203', floor: 'Tầng 2', type: 'Superior (SUP)', price: 1200000, status: 'occupied', cleanStatus: 'clean', guest: 'Phạm Minh Tuấn', checkIn: '2026-09-04', checkOut: '2026-09-06' },
  { id: '204', number: '204', floor: 'Tầng 2', type: 'Deluxe (DLX)', price: 1750000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
  { id: '205', number: '205', floor: 'Tầng 2', type: 'Deluxe (DLX)', price: 1750000, status: 'occupied', cleanStatus: 'clean', guest: 'David Miller', checkIn: '2026-09-03', checkOut: '2026-09-10' },

  // Tầng 3
  { id: '301', number: '301', floor: 'Tầng 3', type: 'Deluxe (DLX)', price: 1750000, status: 'occupied', cleanStatus: 'clean', guest: 'Vũ Thị Hồng', checkIn: '2026-09-05', checkOut: '2026-09-07' },
  { id: '302', number: '302', floor: 'Tầng 3', type: 'Deluxe (DLX)', price: 1750000, status: 'dirty', cleanStatus: 'dirty', guest: null, checkIn: null, checkOut: null },
  { id: '303', number: '303', floor: 'Tầng 3', type: 'Superior (SUP)', price: 1200000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
  { id: '304', number: '304', floor: 'Tầng 3', type: 'Suite (SUT)', price: 3500000, status: 'occupied', cleanStatus: 'clean', guest: 'Hoàng Gia Bảo (Booking.com)', checkIn: '2026-09-06', checkOut: '2026-09-11' },

  // Tầng 4
  { id: '401', number: '401', floor: 'Tầng 4', type: 'Suite (SUT)', price: 3500000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
  { id: '402', number: '402', floor: 'Tầng 4', type: 'Suite (SUT)', price: 3500000, status: 'reserved', cleanStatus: 'clean', guest: 'Đặng Thu Thảo', checkIn: '2026-09-07', checkOut: '2026-09-09' },
  { id: '403', number: '403', floor: 'Tầng 4', type: 'Deluxe (DLX)', price: 1750000, status: 'available', cleanStatus: 'clean', guest: null, checkIn: null, checkOut: null },
];
