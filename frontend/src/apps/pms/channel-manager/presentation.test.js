import test from 'node:test';
import assert from 'node:assert/strict';
import { channelJobLabel, channelJobSuccessMessage, connectionFormState, connectionStatus, mappingStatus, syncBlockReason, webhookStatus } from './presentation.js';

test('booking feed completion is distinct from processing and acknowledging each revision', () => {
  const feed = { kind: 'pull_bookings' };
  const revision = { ...feed, revisionId: 'revision-a' };
  const ack = { kind: 'ack_revision', revisionId: revision.revisionId };
  assert.equal(channelJobLabel(feed), 'Kiểm tra cập nhật đặt phòng');
  assert.equal(channelJobLabel(revision), 'Xử lý cập nhật đặt phòng');
  assert.equal(channelJobLabel(ack), 'Xác nhận đã nhận đặt phòng');
  assert.equal(channelJobSuccessMessage(feed), 'Đã lấy danh sách cập nhật. Việc xử lý và xác nhận đặt phòng có tác vụ riêng.');
  assert.equal(channelJobSuccessMessage(revision), 'Đã xử lý cập nhật đặt phòng. Xem tác vụ xác nhận riêng.');
  assert.equal(channelJobSuccessMessage(ack), 'Đã xác nhận cập nhật với Channex.');
  assert.equal(channelJobLabel({ kind: 'push_ari' }), 'Cập nhật giá & phòng trống');
  assert.equal(channelJobSuccessMessage({ kind: 'push_ari' }), 'Đồng bộ hoàn tất');
  assert.equal(channelJobLabel({ kind: 'unknown' }), 'Đồng bộ kênh phân phối');
});

test('OTA actions explain missing configuration without claiming a live connection', () => {
  const ready = { active: true, credentialsConfigured: true, webhookConfigured: true, verifiedAt: '2026-10-10T08:00:00Z' };
  assert.match(syncBlockReason(null, [], 'pull_bookings'), /Thiết lập/);
  assert.match(syncBlockReason({ ...ready, active: false }, [], 'pull_bookings'), /tạm dừng/);
  assert.match(syncBlockReason({ ...ready, credentialsConfigured: false }, [], 'pull_bookings'), /khóa API/i);
  assert.match(syncBlockReason(ready, [{ active: false }], 'push_ari'), /Ghép/);
  assert.match(syncBlockReason(ready, [{ active: true, pauseRequested: true }], 'push_ari'), /Ghép/);
  assert.equal(syncBlockReason(ready, [{ active: true }], 'push_ari'), '');
  assert.equal(syncBlockReason({ ...ready, webhookConfigured: false }, [], 'pull_bookings'), '');
  assert.equal(syncBlockReason({ ...ready, webhookConfigured: false }, [{ active: true }], 'push_ari'), '');
  assert.deepEqual(connectionStatus(null), { label: 'Chưa thiết lập', tone: 'neutral' });
  assert.equal(connectionStatus({ ...ready, active: false }).label, 'Tạm dừng');
  assert.equal(connectionStatus({ ...ready, credentialsConfigured: false }).tone, 'warning');
  assert.equal(connectionStatus({ ...ready, webhookConfigured: false }).label, 'Đang bật');
  assert.equal(connectionStatus(ready).label, 'Đang bật');
});

test('a mapping awaiting close confirmation remains closing until the worker completes', () => {
  assert.deepEqual(mappingStatus({ active: true, pauseRequested: true }), { label: 'Đang đóng bán', tone: 'processing' });
  assert.deepEqual(mappingStatus({ active: false, pauseRequested: false }), { label: 'Đã tạm dừng', tone: 'neutral' });
  assert.deepEqual(mappingStatus({ active: true, pauseRequested: false }), { label: 'Đang bật', tone: 'succeeded' });
});

test('a webhook secret alone never implies successful callback registration', () => {
  const connection = { active: true, credentialsConfigured: true, webhookConfigured: true, webhookRegistered: false, verifiedAt: '2026-10-10T08:00:00Z' };
  assert.equal(webhookStatus(connection, false).label, 'Chưa bật webhook');
  assert.equal(webhookStatus(connection, true, []).label, 'Chờ đăng ký');
  assert.equal(webhookStatus(connection, true, [{ kind: 'setup_webhook', status: 'processing' }]).label, 'Đang đăng ký');
  assert.equal(webhookStatus(connection, true, [{ kind: 'setup_webhook', status: 'failed' }]).label, 'Cần kiểm tra');
  assert.equal(webhookStatus(connection, true, [{ kind: 'setup_webhook', status: 'queued' }, { kind: 'setup_webhook', status: 'failed' }]).label, 'Chờ đăng ký');
  assert.equal(webhookStatus({ ...connection, webhookRegistered: true }, true, [{ kind: 'setup_webhook', status: 'failed' }]).label, 'Đã đăng ký');
  assert.equal(webhookStatus({ ...connection, webhookConfigured: false }, true).label, 'Chưa sẵn sàng');
  assert.equal(webhookStatus({ ...connection, active: false }, true).label, 'Tạm dừng');
  assert.equal(connectionStatus(connection).label, 'Đang bật');
  assert.equal(syncBlockReason(connection, [], 'pull_bookings'), '');
});

test('a saved credential is not presented as a verified Channex connection', () => {
  for (const credentialSource of ['environment', 'encrypted']) {
    const connection = { active: true, credentialsConfigured: true, webhookConfigured: true, credentialSource, verifiedAt: null };
    assert.deepEqual(connectionStatus(connection), { label: 'Chưa kiểm tra', tone: 'warning' });
    assert.equal(syncBlockReason(connection, [], 'pull_bookings'), '');
  }
});

test('unavailable encrypted credentials still allow pausing the same existing connection', () => {
  const connection = { environment: 'staging', propertyId: 'hotel-a', active: true, credentialsConfigured: false };
  const config = { environment: 'staging', propertyId: 'hotel-a', active: false, apiKey: '' };
  assert.deepEqual(connectionFormState(config, connection, false), { keyRequired: false, canSave: true });
  assert.deepEqual(connectionFormState({ ...config, active: true }, connection, false), { keyRequired: true, canSave: false });
  assert.deepEqual(connectionFormState({ ...config, propertyId: 'hotel-b' }, connection, false), { keyRequired: true, canSave: false });
  assert.deepEqual(connectionFormState({ ...config, apiKey: 'replacement-key' }, connection, false), { keyRequired: false, canSave: false });
});

test('new connections and changed targets require a key while unchanged targets preserve saved credentials', () => {
  const connection = { environment: 'staging', propertyId: 'hotel-a', active: true, credentialsConfigured: true };
  const config = { environment: 'staging', propertyId: 'hotel-a', active: true, apiKey: '' };
  assert.deepEqual(connectionFormState(config, connection, true), { keyRequired: false, canSave: true });
  assert.deepEqual(connectionFormState(config, null, true), { keyRequired: true, canSave: false });
  assert.deepEqual(connectionFormState({ ...config, environment: 'production' }, connection, true), { keyRequired: true, canSave: false });
  assert.deepEqual(connectionFormState({ ...config, propertyId: 'hotel-b', apiKey: 'replacement-key' }, connection, true), { keyRequired: true, canSave: true });
  assert.deepEqual(connectionFormState({ ...config, apiKey: '   ' }, null, true), { keyRequired: true, canSave: false });
});

test('paused registered callbacks and legacy credentials do not claim to be receiving or queued', () => {
  const connection = { active: false, credentialsConfigured: true, credentialSource: 'encrypted', webhookConfigured: true, webhookRegistered: true };
  assert.equal(webhookStatus(connection, true).label, 'Tạm dừng');
  const legacy = { ...connection, active: true, webhookRegistered: false, credentialSource: 'environment' };
  assert.equal(webhookStatus(legacy, true, []).label, 'Cấu hình cũ');
  assert.match(webhookStatus(legacy, true, []).hint, /Nhập và lưu khóa API/);
  assert.equal(syncBlockReason(legacy, [], 'pull_bookings'), '');
});
