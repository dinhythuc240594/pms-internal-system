const channelJobLabels = { push_ari: 'Cập nhật giá & phòng trống', ack_revision: 'Xác nhận đã nhận đặt phòng', setup_webhook: 'Thiết lập webhook', pause_mapping: 'Đóng bán & tạm dừng ghép nối' };

export function channelJobLabel(job) {
  if (job.kind === 'pull_bookings') return job.revisionId ? 'Xử lý cập nhật đặt phòng' : 'Kiểm tra cập nhật đặt phòng';
  return channelJobLabels[job.kind] || 'Đồng bộ kênh phân phối';
}

export function channelJobSuccessMessage(job) {
  if (job.kind === 'pull_bookings') return job.revisionId
    ? 'Đã xử lý cập nhật đặt phòng. Xem tác vụ xác nhận riêng.'
    : 'Đã lấy danh sách cập nhật. Việc xử lý và xác nhận đặt phòng có tác vụ riêng.';
  if (job.kind === 'ack_revision') return 'Đã xác nhận cập nhật với Channex.';
  return 'Đồng bộ hoàn tất';
}

export function syncBlockReason(connection, mappings, kind) {
  if (!connection) return 'Thiết lập kết nối Channex để bắt đầu đồng bộ.';
  if (!connection.active) return 'Kết nối đang tạm dừng. Bật kết nối trong phần cấu hình để tiếp tục.';
  if (!connection.credentialsConfigured) return 'Chưa có khóa API. Mở Chỉnh sửa kết nối để nhập và kiểm tra khóa.';
  if (kind === 'push_ari' && !mappings.some(row => row.active && !row.pauseRequested)) return 'Ghép ít nhất một loại phòng đang bật trước khi gửi giá và phòng trống.';
  return '';
}

export function connectionStatus(connection) {
  if (!connection) return { label: 'Chưa thiết lập', tone: 'neutral' };
  if (!connection.active) return { label: 'Tạm dừng', tone: 'neutral' };
  if (!connection.credentialsConfigured) return { label: 'Thiếu khóa API', tone: 'warning' };
  if (!connection.verifiedAt) return { label: 'Chưa kiểm tra', tone: 'warning' };
  return { label: 'Đang bật', tone: 'succeeded' };
}

export function mappingStatus(mapping) {
  if (mapping.pauseRequested) return { label: 'Đang đóng bán', tone: 'processing' };
  return mapping.active
    ? { label: 'Đang bật', tone: 'succeeded' }
    : { label: 'Đã tạm dừng', tone: 'neutral' };
}

export function connectionFormState(config, connection, storageAvailable) {
  if (!config) return { keyRequired: false, canSave: false };
  const targetChanged = connection && (config.environment !== connection.environment || config.propertyId !== connection.propertyId);
  const keyRequired = !connection || Boolean(targetChanged) || (!connection.credentialsConfigured && config.active);
  const hasKey = Boolean(config.apiKey.trim());
  return { keyRequired, canSave: hasKey ? storageAvailable : !keyRequired };
}

export function webhookStatus(connection, registrationAvailable, jobs = []) {
  if (connection && !connection.active) return { label: 'Tạm dừng', tone: 'neutral', hint: 'Bật kết nối để nhận và xử lý cập nhật đặt phòng.' };
  if (connection?.webhookRegistered) return { label: 'Đã đăng ký', tone: 'succeeded', hint: 'Channex gửi cập nhật đặt phòng qua webhook.' };
  if (!registrationAvailable) return { label: 'Chưa bật webhook', tone: 'neutral', hint: 'Hệ thống vẫn nhận đặt phòng theo lịch. Quản trị viên có thể bật webhook để nhận cập nhật sớm hơn.' };
  if (connection?.credentialSource === 'environment') return { label: 'Cấu hình cũ', tone: 'neutral', hint: 'Kết nối vẫn nhận đặt phòng theo lịch. Nhập và lưu khóa API trong LOHA để tự động thiết lập webhook.' };
  if (!connection?.webhookConfigured) return { label: 'Chưa sẵn sàng', tone: 'warning', hint: 'Nhập và lưu khóa API để LOHA tạo xác thực webhook.' };
  const latest = jobs.find(row => row.kind === 'setup_webhook');
  if (latest?.status === 'failed') return { label: 'Cần kiểm tra', tone: 'warning', hint: 'Mở Lịch sử đồng bộ để xem và thử lại yêu cầu thiết lập webhook.' };
  if (latest?.status === 'processing') return { label: 'Đang đăng ký', tone: 'processing', hint: 'Đang thiết lập thông báo đặt phòng từ Channex.' };
  return { label: 'Chờ đăng ký', tone: 'queued', hint: 'Yêu cầu thiết lập webhook sẽ được xử lý trong hàng đợi.' };
}
