import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionStatus, syncBlockReason } from './presentation.js';

test('OTA actions explain missing configuration without claiming a live connection', () => {
  const ready = { active: true, credentialsConfigured: true, webhookConfigured: true };
  assert.match(syncBlockReason(null, [], 'pull_bookings'), /Thiết lập/);
  assert.match(syncBlockReason({ ...ready, active: false }, [], 'pull_bookings'), /tạm dừng/);
  assert.match(syncBlockReason({ ...ready, credentialsConfigured: false }, [], 'pull_bookings'), /Khóa API/);
  assert.match(syncBlockReason(ready, [{ active: false }], 'push_ari'), /Ghép/);
  assert.equal(syncBlockReason(ready, [{ active: true }], 'push_ari'), '');
  assert.equal(syncBlockReason({ ...ready, webhookConfigured: false }, [], 'pull_bookings'), '');
  assert.equal(syncBlockReason({ ...ready, webhookConfigured: false }, [{ active: true }], 'push_ari'), '');
  assert.deepEqual(connectionStatus(null), { label: 'Chưa thiết lập', tone: 'neutral' });
  assert.equal(connectionStatus({ ...ready, active: false }).label, 'Tạm dừng');
  assert.equal(connectionStatus({ ...ready, credentialsConfigured: false }).tone, 'warning');
  assert.equal(connectionStatus({ ...ready, webhookConfigured: false }).label, 'Thiếu webhook');
  assert.equal(connectionStatus(ready).label, 'Đang bật');
});
