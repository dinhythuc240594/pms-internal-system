export function syncBlockReason(connection, mappings, kind) {
  if (!connection) return 'Thiết lập kết nối Channex để bắt đầu đồng bộ.';
  if (!connection.active) return 'Kết nối đang tạm dừng. Bật kết nối trong phần cấu hình để tiếp tục.';
  if (!connection.credentialsConfigured) return 'Khóa API chưa được cấu hình. Liên hệ quản trị viên máy chủ để hoàn tất.';
  if (kind === 'push_ari' && !mappings.some(row => row.active)) return 'Ghép ít nhất một loại phòng đang bật trước khi gửi giá và phòng trống.';
  return '';
}

export function connectionStatus(connection) {
  if (!connection) return { label: 'Chưa thiết lập', tone: 'neutral' };
  if (!connection.active) return { label: 'Tạm dừng', tone: 'neutral' };
  if (!connection.credentialsConfigured) return { label: 'Thiếu khóa API', tone: 'warning' };
  if (!connection.webhookConfigured) return { label: 'Thiếu webhook', tone: 'warning' };
  return { label: 'Đang bật', tone: 'succeeded' };
}
