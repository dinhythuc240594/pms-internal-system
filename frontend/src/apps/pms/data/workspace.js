import { INITIAL_TENANTS } from '../../manager/mockData.js';
import { seedState, roomTypes, initialRooms, validateBooking, nights, today, availableRooms } from './model.js';
import { FEATURES, DEMO_USERS, accessDecision, bookingQuota, isGlobalUser, sessionUser, normalizePlan } from './access.js';
export const WORKSPACE_KEY = 'bluejay-pms-workspace-v2';
export const SESSION_KEY = 'bluejay-pms-session-v1';
const copy = value => structuredClone(value);
export function seedMasters() {
  return {
    roomTypes: copy(roomTypes).map(t => ({ ...t, capacity: 2, active: true })),
    bookingSources: ['Direct', 'Điện thoại', 'Website', 'Booking.com', 'Agoda', 'Traveloka', 'Đại lý', 'Corporate'].map((name, i) => ({ id: `source-${i}`, name, type: i >= 3 && i <= 5 ? 'OTA' : i === 7 ? 'Corporate' : i === 6 ? 'Travel Agency' : 'Direct', commission: 0, active: true })),
    serviceCategories: [{ id: 'minibar', name: 'Minibar', tax: 8, active: true }, { id: 'extra', name: 'Extra', tax: 10, active: true }, { id: 'damage', name: 'Hư hỏng, đền bù', tax: 0, active: true }],
    services: [['water', 'Nước suối Dasani', 15000, 'Minibar', '💧'], ['beer', 'Bia Heineken', 35000, 'Minibar', '🍺'], ['laundry', 'Giặt ủi (Kg)', 30000, 'Extra', '👕']].map(([id, name, price, category, image]) => ({ id, name, price, category, image, unit: 'Cái', active: true })),
    warehouses: [{ id: 'main', name: 'Kho Tổng', minibar: false, active: true }, { id: 'minibar', name: 'Kho Minibar', minibar: true, active: true }],
    itemCategories: [{ id: 'minibar', name: 'Minibar', active: true }, { id: 'amenities', name: 'Amenities', active: true }],
    items: [{ id: 'water', name: 'Nước suối Dasani 500ml', category: 'Minibar', unit: 'Chai', price: 5000, sellingPrice: 15000, minStock: 20, active: true }, { id: 'brush', name: 'Bàn chải đánh răng', category: 'Amenities', unit: 'Cái', price: 2000, sellingPrice: 5000, minStock: 10, active: true }],
    suppliers: [{ id: 'supplier-1', name: 'Nhà cung cấp Tổng', phone: '', email: '', active: true }],
    units: [{ id: 'bottle', name: 'Chai', active: true }, { id: 'piece', name: 'Cái', active: true }, { id: 'can', name: 'Lon', active: true }],
    paymentMethods: [{ id: 'cash', name: 'Tiền mặt', active: true }, { id: 'bank', name: 'Chuyển khoản ngân hàng', active: true }, { id: 'card', name: 'Thẻ tín dụng', active: false }],
  };
}
export function seedTenant(tenant, legacy) {
  const state = legacy || seedState();
  return { ...copy(state), bookingCount: state.bookings.length, masters: seedMasters(), settings: { name: tenant.name, currency: 'VND', address: '', timezone: 'Asia/Ho_Chi_Minh', checkInTime: '14:00', checkOutTime: '12:00' } };
}
function emptyTenant(tenant) {
  const data = seedTenant(tenant);
  const count = Number(tenant.rooms || initialRooms.length);
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new Error('Số phòng demo phải là số nguyên từ 1 đến 500.');
  return { ...data, rooms: Array.from({ length: count }, (_, i) => ({ id: String(101 + i), typeId: roomTypes[0].id, condition: 'clean' })), bookings: [], bookingCount: 0, receipts: [], housekeepingLog: [] };
}
export function seedWorkspace(legacy, now = Date.now()) {
  const tenants = copy(INITIAL_TENANTS).map((t, i) => ({ ...t, rooms: i === 0 && legacy ? legacy.rooms.length : initialRooms.length, mrr: i === 1 || normalizePlan(t.plan) === 'Trial' ? '0 đ' : t.mrr, name: i === 0 ? 'HUB HOTEL Quận 1' : i === 1 ? 'HUB HOTEL Quận 7' : t.name, plan: i === 1 ? 'Dùng thử (Trial)' : t.plan, subscriptionStatus: i === 1 || normalizePlan(t.plan) === 'Trial' ? 'TRIAL' : 'ACTIVE', trialExpiresAt: new Date(now + 14 * 86400000).toISOString() }));
  return { version: 2, tenants, users: copy(DEMO_USERS), byTenant: Object.fromEntries(tenants.map((t, i) => [t.id, seedTenant(t, i === 0 ? legacy : null)])), features: copy(FEATURES), tenantFeatureOverrides: {}, auditLogs: [] };
}
export function loadWorkspace(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(WORKSPACE_KEY));
    if (saved?.version === 2 && saved.tenants?.length && saved.byTenant && Array.isArray(saved.features) && saved.tenantFeatureOverrides && Array.isArray(saved.auditLogs) && saved.tenants.every(t => saved.byTenant[t.id]?.masters && Array.isArray(saved.byTenant[t.id].bookings))) return { ...saved, users: Array.isArray(saved.users) ? saved.users : copy(DEMO_USERS), tenants: saved.tenants.map(t => ({ ...t, rooms: saved.byTenant[t.id].rooms.length, mrr: normalizePlan(t.plan) === 'Trial' ? '0 đ' : t.mrr })) };
  } catch { /* Fall back to the legacy demo or seed. */ }
  let legacy;
  try { const s = JSON.parse(storage.getItem('bluejay-pms-demo-v1')); if (Array.isArray(s?.rooms) && Array.isArray(s?.bookings) && Array.isArray(s?.receipts) && Array.isArray(s?.housekeepingLog)) legacy = s; } catch { /* No valid legacy data. */ }
  return seedWorkspace(legacy, now);
}
function requireAccess(ws, session, tenantId, action, feature, now) {
  const result = accessDecision(ws, session, tenantId, action, feature, now);
  if (!result.allowed) throw new Error(result.message);
}
export function applyCommand(ws, command, { session, tenantId, now = Date.now() }) {
  const user = sessionUser(session, now, ws.users);
  if (!user) throw new Error('Phiên đăng nhập đã hết hạn.');
  let next = copy(ws);
  const tenant = next.tenants.find(t => t.id === tenantId);
  const data = next.byTenant[tenantId];
  const c = command;
  if (c.type.startsWith('admin.')) {
    if (!isGlobalUser(user)) throw new Error('Bạn không có quyền quản trị hệ thống.');
    if (c.type === 'admin.tenants') {
      next.tenants = c.update(copy(next.tenants)).map(t => {
        const previous = ws.tenants.find(p => p.id === t.id);
        const changed = !previous || t.status !== previous.status || normalizePlan(t.plan) !== normalizePlan(previous.plan);
        const subscriptionStatus = t.status === 'Suspended' ? 'SUSPENDED' : changed ? normalizePlan(t.plan) === 'Trial' ? 'TRIAL' : 'ACTIVE' : t.subscriptionStatus;
        return { ...t, subscriptionStatus, trialExpiresAt: t.trialExpiresAt || new Date(now + 14 * 86400000).toISOString() };
      });
      for (const t of next.tenants) if (!next.byTenant[t.id]) {
        next.byTenant[t.id] = emptyTenant(t);
        const email = t.contactEmail?.trim().toLowerCase();
        if (email) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email quản trị khách sạn không hợp lệ.');
          let owner = next.users.find(u => u.email === email);
          if (owner && owner.globalRole !== 'USER') throw new Error('Dùng tài khoản khách hàng cho chủ khách sạn, không dùng tài khoản Admin nội bộ.');
          if (!owner) { owner = { id: `user-${t.id}`, name: t.contactName || t.name, email, globalRole: 'USER', memberships: {} }; next.users.push(owner); }
          owner.memberships[t.id] = 'HOTEL_OWNER';
        }
      }
      for (const id of Object.keys(next.byTenant)) if (!next.tenants.some(t => t.id === id)) delete next.byTenant[id];
    } else if (c.type === 'admin.features') {
      if (user.globalRole !== 'SUPER_ADMIN') throw new Error('Chỉ Super Admin được thay đổi feature toàn hệ thống.');
      next.features = c.update(copy(next.features));
    }
    else if (c.type === 'admin.overrides') next.tenantFeatureOverrides = c.update(copy(next.tenantFeatureOverrides));
    else throw new Error('Thao tác quản trị không hợp lệ.');
  } else {
    const policy = {
      'booking.create': ['reservations.write', 'RESERVATION_CREATE'], 'booking.update': ['reservations.write', 'RESERVATION_VIEW'], 'booking.status': ['reservations.write', 'RESERVATION_VIEW'],
      'room.condition': ['housekeeping.write', 'HOUSEKEEPING'], 'receipt.create': ['inventory.write', 'INVENTORY_WAREHOUSE'],
      'master.save': ['settings.write'], 'master.disable': ['settings.write'], 'settings.save': ['settings.write'],
      'membership.save': ['users.write'],
    }[c.type];
    if (!policy) throw new Error('Thao tác không hợp lệ.');
    requireAccess(ws, session, tenantId, policy[0], policy[1], now);
    if (c.type === 'membership.save') {
      const email = c.input.email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !c.input.name?.trim() || !['HOTEL_OWNER', 'FRONT_DESK', 'HOUSEKEEPING', 'ACCOUNTANT'].includes(c.input.role)) throw new Error('Nhập tên, email và vai trò hợp lệ.');
      const byEmail = next.users.find(u => u.email === email);
      const existing = c.input.id ? next.users.find(u => u.id === c.input.id) : byEmail;
      if (c.input.id && (!existing || !Object.hasOwn(existing.memberships, tenantId))) throw new Error('Không tìm thấy người dùng trong khách sạn này.');
      if (byEmail && existing && byEmail.id !== existing.id) throw new Error('Email đã được sử dụng.');
      if (existing && existing.globalRole !== 'USER') throw new Error('Không được thay đổi tài khoản quản trị hệ thống từ khách sạn.');
      if (existing && (email !== existing.email || c.input.name.trim() !== existing.name)) throw new Error('Danh tính tài khoản đã có được dùng chung. Chỉ sửa vai trò và trạng thái tại khách sạn này.');
      if (existing?.memberships[tenantId] === 'HOTEL_OWNER' && (c.input.active === false || c.input.role !== 'HOTEL_OWNER') && next.users.filter(u => u.active !== false && u.memberships[tenantId] === 'HOTEL_OWNER').length <= 1) throw new Error('Khách sạn phải còn ít nhất một chủ khách sạn.');
      const target = existing || { id: c.id, globalRole: 'USER', memberships: {} };
      target.email = email; target.name = c.input.name.trim();
      target.disabledMemberships = { ...target.disabledMemberships, [tenantId]: c.input.role };
      target.memberships[tenantId] = c.input.active === false ? null : c.input.role;
      if (!existing) next.users.push(target);
    } else if (c.type === 'booking.create') {
      const quota = bookingQuota(tenant, data);
      if (quota.limit !== null && quota.used >= quota.limit) throw new Error('Đã đạt giới hạn 10 booking dùng thử. Vui lòng liên hệ nâng cấp.');
      validateBooking(c.input, data.rooms, data.bookings);
      const room = data.rooms.find(r => r.id === c.input.room);
      const rate = data.masters.roomTypes.find(t => t.id === room.typeId && t.active !== false);
      if (!rate) throw new Error('Loại phòng đã ngừng sử dụng.');
      if (!data.masters.bookingSources.some(s => s.name === c.input.source && s.active !== false)) throw new Error('Nguồn đặt phòng không hợp lệ.');
      data.bookings.unshift({ ...c.input, tenantId, guest: c.input.guest.trim(), id: c.id, status: 'CONFIRMED', total: rate.price * nights(c.input.checkIn, c.input.checkOut), createdAt: new Date(now).toISOString(), createdBy: user.id });
      data.bookingCount += 1;
    } else if (c.type === 'booking.update') {
      const b = data.bookings.find(b => b.id === c.id);
      if (!b) throw new Error('Không tìm thấy booking trong khách sạn hiện tại.');
      if (!c.input.guest?.trim()) throw new Error('Vui lòng nhập tên khách.');
      const fields = ['guest', 'phone', 'email', 'identity', 'nationality', 'adults', 'children', 'infants', 'checkInTime', 'checkOutTime', 'source'];
      const updated = { ...b, ...Object.fromEntries(fields.filter(k => k in c.input).map(k => [k, c.input[k]])), guest: c.input.guest.trim() };
      if (updated.source !== b.source && !data.masters.bookingSources.some(s => s.name === updated.source && s.active !== false)) throw new Error('Nguồn đặt phòng không hợp lệ.');
      if (b.status === 'CONFIRMED') {
        Object.assign(updated, { room: c.input.room, checkIn: c.input.checkIn, checkOut: c.input.checkOut });
        validateBooking(updated, data.rooms, data.bookings.filter(other => other.id !== b.id));
        const rate = data.masters.roomTypes.find(t => t.id === data.rooms.find(r => r.id === updated.room).typeId);
        if (!rate || rate.active === false) throw new Error('Loại phòng đã ngừng sử dụng.');
        if (updated.room !== b.room || updated.checkIn !== b.checkIn || updated.checkOut !== b.checkOut) updated.total = rate.price * nights(updated.checkIn, updated.checkOut);
      }
      data.bookings = data.bookings.map(other => other.id === b.id ? updated : other);
    } else if (c.type === 'booking.status') {
      const b = data.bookings.find(b => b.id === c.id);
      const allowed = { CONFIRMED: ['IN_HOUSE', 'CANCELLED'], IN_HOUSE: ['CHECKED_OUT'] };
      if (!b || !allowed[b.status]?.includes(c.status)) throw new Error('Không thể đổi trạng thái đặt phòng này.');
      const room = data.rooms.find(r => r.id === b.room);
      if (c.status === 'IN_HOUSE') {
        const date = today(tenant.timezone || data.settings.timezone);
        if (b.checkIn > date || b.checkOut <= date) throw new Error('Booking chưa đến ngày nhận phòng hoặc đã quá ngày trả phòng.');
        if (room.condition !== 'clean') throw new Error('Phòng cần được dọn sạch trước khi nhận khách.');
        if (data.bookings.some(other => other.id !== b.id && other.room === b.room && other.status === 'IN_HOUSE') || !availableRooms(data.rooms, data.bookings, b.checkIn, b.checkOut, '', b.id).some(r => r.id === b.room)) throw new Error('Phòng đang có khách hoặc trùng lịch.');
      }
      b.status = c.status;
      if (c.status === 'CHECKED_OUT') { room.condition = 'dirty'; data.housekeepingLog.unshift({ id: c.logId, room: room.id, action: 'Phòng bẩn sau check-out', at: new Date(now).toISOString(), user: user.name }); }
    } else if (c.type === 'room.condition') {
      const room = data.rooms.find(r => r.id === c.id);
      if (!room || !['clean', 'dirty'].includes(c.condition)) throw new Error('Phòng hoặc trạng thái không hợp lệ.');
      room.condition = c.condition;
      data.housekeepingLog.unshift({ id: c.logId, room: room.id, action: c.condition === 'clean' ? 'Đã dọn sạch' : 'Đánh dấu phòng bẩn', at: new Date(now).toISOString(), user: user.name });
    } else if (c.type === 'receipt.create') {
      const input = c.input;
      if (!input.supplier?.trim() || !input.warehouse || !input.date || !input.items?.length || input.items.some(i => !i.name?.trim() || !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.price) || i.price < 0)) throw new Error('Nhập nhà cung cấp, kho, ngày và mặt hàng có số lượng dương, đơn giá không âm.');
      if (!data.masters.warehouses.some(w => w.name === input.warehouse && w.active !== false) || input.items.some(i => !data.masters.items.some(m => m.id === i.itemId && m.active !== false))) throw new Error('Kho hoặc mặt hàng đã ngừng sử dụng.');
      data.receipts.unshift({ ...input, tenantId, id: c.id, createdBy: user.id, total: input.items.reduce((sum, i) => sum + i.quantity * i.price, 0) });
    } else if (c.type === 'settings.save') {
      if (!c.input.name?.trim()) throw new Error('Vui lòng nhập tên khách sạn.');
      if (!['VND', 'USD'].includes(c.input.currency)) throw new Error('Tiền tệ không hợp lệ.');
      if (c.input.currency !== 'VND') requireAccess(ws, session, tenantId, 'settings.write', 'MULTI_CURRENCY', now);
      if (![c.input.checkInTime, c.input.checkOutTime].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Giờ nhận/trả phòng phải có định dạng HH:mm hợp lệ.');
      try { new Intl.DateTimeFormat('vi', { timeZone: c.input.timezone }); } catch { throw new Error('Múi giờ không hợp lệ.'); }
      data.settings = { ...data.settings, ...c.input, name: c.input.name.trim() };
      tenant.name = data.settings.name;
      tenant.timezone = data.settings.timezone;
    } else if (c.type === 'master.save' || c.type === 'master.disable') {
      const list = data.masters[c.catalog];
      if (!Array.isArray(list)) throw new Error('Danh mục không hợp lệ.');
      if (c.type === 'master.disable') {
        const item = list.find(i => i.id === c.id);
        if (!item) throw new Error('Không tìm thấy bản ghi.');
        if (c.catalog === 'paymentMethods' && c.id === 'cash') throw new Error('Tiền mặt luôn được bật.');
        item.active = !item.active;
      } else {
        const item = { ...c.input, id: String(c.input.id || c.id), name: c.input.name?.trim(), active: c.input.active !== false };
        if (!item.name || list.some(i => i.id !== item.id && i.name.toLowerCase() === item.name.toLowerCase())) throw new Error('Tên không được trống hoặc trùng.');
        for (const field of ['price', 'sellingPrice', 'minStock', 'commission', 'tax', 'capacity']) if (field in item) {
          if (!Number.isFinite(Number(item[field])) || Number(item[field]) < 0) throw new Error('Giá và các giá trị số phải không âm.');
          item[field] = Number(item[field]);
        }
        if (c.catalog === 'roomTypes' && (!Number.isInteger(item.capacity) || item.capacity < 1)) throw new Error('Sức chứa phải là số nguyên, ít nhất là 1.');
        if (c.catalog === 'paymentMethods' && item.id === 'cash') item.active = true;
        const previous = list.find(i => i.id === item.id);
        const references = { serviceCategories: [['services', 'category']], itemCategories: [['items', 'category']], units: [['items', 'unit'], ['services', 'unit']] };
        if (previous && previous.name !== item.name) for (const [catalog, field] of references[c.catalog] || []) for (const referenced of data.masters[catalog]) if (referenced[field] === previous.name) referenced[field] = item.name;
        if (previous) data.masters[c.catalog] = list.map(i => i.id === item.id ? { ...i, ...item } : i);
        else list.push(item);
        if (c.catalog === 'roomTypes' && Array.isArray(c.input.roomNumbers)) {
          const numbers = c.input.roomNumbers;
          if (!numbers.length || new Set(numbers).size !== numbers.length || numbers.some(n => !/^[\w-]+$/.test(n))) throw new Error('Nhập danh sách số phòng duy nhất, phân cách bằng dấu phẩy.');
          if (data.rooms.some(r => numbers.includes(r.id) && r.typeId !== item.id)) throw new Error('Số phòng đã thuộc một loại phòng khác.');
          const removed = data.rooms.filter(r => r.typeId === item.id && !numbers.includes(r.id));
          if (removed.some(r => data.bookings.some(b => b.room === r.id))) throw new Error('Không được xóa phòng đã có lịch sử booking.');
          data.rooms = data.rooms.filter(r => r.typeId !== item.id || numbers.includes(r.id));
          for (const number of numbers) if (!data.rooms.some(r => r.id === number)) data.rooms.push({ id: number, typeId: item.id, condition: 'clean' });
          tenant.rooms = data.rooms.length;
        }
      }
    }
  }
  const before = c.type === 'admin.overrides' ? ws.tenantFeatureOverrides : c.type === 'admin.features' ? ws.features : c.type === 'admin.tenants' ? ws.tenants : null;
  const after = c.type === 'admin.overrides' ? next.tenantFeatureOverrides : c.type === 'admin.features' ? next.features : c.type === 'admin.tenants' ? next.tenants : null;
  next.auditLogs.unshift({ id: c.auditId || `${now}-${next.auditLogs.length}`, tenantId: c.type.startsWith('admin.') ? null : tenantId, user: user.name, role: user.globalRole, action: c.type, at: new Date(now).toISOString(), entityId: c.input?.id || c.id || '', details: before ? JSON.stringify({ before, after }) : c.type });
  return next;
}
