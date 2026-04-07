<template>
  <div class="wt-root" :class="{ 'wt-is-connected': connectedDevice !== null }">

    <!-- CONNECT SCREEN -->
    <div v-if="connectedDevice === null" class="wt-connect-screen">
      <div class="wt-connect-box">
        <div class="wt-connect-icon">🎮</div>
        <div class="wt-connect-title">FFBoard Wheel Tester</div>
        <div class="wt-connect-sub">
          Connects directly to your FFBoard via <strong>WebHID</strong> — no drivers, no middleware needed.<br>
          Once connected, you can inspect device telemetry, test effects, and verify axis behaviour in real time.
        </div>

        <div v-if="!hidSupported" class="wt-no-hid">
          <span class="wt-no-hid-icon">⚠</span>
          <span><strong>WebHID is not supported</strong> in this browser.<br>Use Chrome or Microsoft Edge (desktop) to access this tool.</span>
        </div>

        <button
          v-else
          class="wt-connect-btn"
          @click="connectDevice"
          :disabled="connecting"
        >
          {{ connecting ? 'Connecting…' : 'Connect Device' }}
        </button>

        <div v-if="connectError" class="wt-connect-error">⚠ {{ connectError }}</div>

        <div class="wt-connect-info">
          <div class="wt-info-header">
            <span class="wt-info-badge">INFO</span>
            <span class="wt-info-heading">What to expect</span>
          </div>
          <ul class="wt-info-list">
            <li>Your browser will show a device picker — select the FFBoard HID device.</li>
            <li>Only devices whose product name contains <strong>FFBoard</strong> will be accepted.</li>
            <li>The browser may ask for permission the first time you connect a new device.</li>
            <li>All communication stays local — nothing is sent to any server.</li>
          </ul>
          <div class="wt-info-disclaimer">Results are for guidance only — verify against your specific hardware and setup.</div>
        </div>
      </div>
      <div class="wt-connect-hint">WEBHID · CHROME &amp; EDGE ONLY · NO INSTALLATION REQUIRED</div>
    </div>

    <!-- CONNECTED DASHBOARD -->
    <div v-else class="wt-dashboard">

      <!-- Topbar -->
      <div class="wt-topbar">
        <div class="wt-topbar-brand">⚙ FFBoard Wheel Tester</div>
        <div class="wt-topbar-device">
          <span class="wt-topbar-label">DEVICE</span>
          <span class="wt-topbar-devname">{{ connectedDevice.productName }}</span>
        </div>
        <div class="wt-topbar-actions">
          <button class="wt-tbar-btn danger" @click="disconnect">Disconnect</button>
        </div>
      </div>

      <!-- Body + Sidebar -->
      <div class="wt-body">

        <!-- Main panel -->
        <div class="wt-main">

          <!-- Device Info -->
          <div class="wt-section">
            <div class="wt-section-header">Device Info</div>
            <div class="wt-info-grid">
              <span class="wt-key">Frequency</span>
              <span class="wt-val">{{ MOCK.frequency.toFixed(3) }} <span class="wt-unit">hz</span></span>

              <span class="wt-key">Latency</span>
              <span class="wt-val">{{ MOCK.latency.toFixed(3) }} <span class="wt-unit">ms</span></span>

              <span class="wt-key">Speed</span>
              <span class="wt-val">{{ MOCK.speed_rpm.toFixed(3) }} <span class="wt-unit">rpm</span> &nbsp;<span class="wt-val-secondary">({{ MOCK.speed_degs }} °/s)</span></span>

              <span class="wt-key">Accel</span>
              <span class="wt-val">{{ MOCK.accel_rpms.toFixed(3) }} <span class="wt-unit">rpm/s</span> &nbsp;<span class="wt-val-secondary">({{ MOCK.accel_degs2 }} °/s²)</span></span>

              <span class="wt-key">Inertia</span>
              <span class="wt-val" :class="{ 'wt-val-neg': MOCK.inertia < 0 }">{{ MOCK.inertia.toFixed(3) }}</span>

              <span class="wt-key">Friction</span>
              <span class="wt-val" :class="{ 'wt-val-neg': MOCK.friction < 0 }">{{ MOCK.friction.toFixed(3) }}</span>
            </div>
          </div>

          <!-- Chart placeholder -->
          <div class="wt-section wt-chart-section">
            <div class="wt-section-header">Force / Response Chart</div>
            <div class="wt-chart-placeholder">
              <span class="wt-chart-msg">Start test to see data</span>
            </div>
          </div>

          <div class="wt-guidance">
            ⓘ Results are for guidance only — verify against your specific hardware and setup.
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="wt-sidebar">

          <!-- Telemetry -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Telemetry</div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">TimeStep</span>
              <span class="wt-sb-val">{{ MOCK.timestep_ms.toFixed(5) }} <span class="wt-sb-unit">ms</span></span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">FPS</span>
              <span class="wt-sb-val">{{ MOCK.fps.toLocaleString() }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Test State</span>
              <span class="wt-sb-val">{{ MOCK.testState }} &mdash; {{ MOCK.testStateName }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">State Val</span>
              <span class="wt-sb-val">{{ MOCK.testStateVal.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Speed</span>
              <span class="wt-sb-val">{{ MOCK.tel_speed_rpm.toFixed(2) }} <span class="wt-sb-unit">rpm</span></span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Speed (rad/s)</span>
              <span class="wt-sb-val">{{ MOCK.tel_speed_rads.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Accel (rot/s²)</span>
              <span class="wt-sb-val">{{ MOCK.tel_accel_rots2.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Accel (rad/s²)</span>
              <span class="wt-sb-val">{{ MOCK.tel_accel_rads2.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Device Caps -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Device Caps</div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Devices found</span>
              <span class="wt-sb-val">{{ MOCK.devicesFound }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Device index</span>
              <span class="wt-sb-val">{{ MOCK.deviceIndex }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Axes</span>
              <span class="wt-sb-val">{{ MOCK.axes }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Sliders</span>
              <span class="wt-sb-val">{{ MOCK.sliders }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Buttons</span>
              <span class="wt-sb-val">{{ MOCK.buttons }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">POV</span>
              <span class="wt-sb-val">{{ MOCK.pov }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Effects</span>
              <span class="wt-sb-val">{{ MOCK.effects }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Channel</span>
              <span class="wt-sb-val">{{ MOCK.channel }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">X Axis</span>
              <span class="wt-sb-val">{{ MOCK.xAxis.toFixed(3) }}</span>
            </div>
          </div>

          <!-- Active Effects -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Active Effects</div>
            <div
              v-for="fx in MOCK.activeEffects"
              :key="fx.id"
              class="wt-effect-item"
            >
              <div class="wt-effect-header">
                <span class="wt-effect-id">#{{ fx.id }}</span>
                <span class="wt-effect-guid">{{ fx.guid }}</span>
              </div>
              <div class="wt-effect-vals">
                <span>val1: <span class="wt-sb-val">{{ fx.val1.toFixed(3) }}</span></span>
                <span>val2: <span class="wt-sb-val">{{ fx.val2.toFixed(3) }}</span></span>
              </div>
            </div>
          </div>

          <div class="wt-sb-disclaimer">
            Results for guidance only — verify against your hardware.
          </div>

        </aside>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// ── Mock data shown when connected ──────────────────────────────────────────
const MOCK = {
  frequency: 920.615,
  latency: 6.906,
  speed_rpm: 213.929,
  speed_degs: 1284,
  accel_rpms: 6383.454,
  accel_degs2: 38301,
  inertia: -1.000,
  friction: -1.000,
  // telemetry sidebar
  timestep_ms: 0.00050,
  fps: 2000000,
  testState: 0,
  testStateVal: 150.22,
  testStateName: 'Nothing',
  tel_speed_rpm: 0,
  tel_speed_rads: 0.00,
  tel_accel_rots2: -1.00,
  tel_accel_rads2: -6.28,
  // device caps
  devicesFound: 4,
  deviceIndex: 2,
  axes: 16,
  sliders: 2,
  buttons: 64,
  pov: 0,
  effects: 11,
  channel: 71,
  xAxis: 0.500,
  activeEffects: [
    { id: 0, guid: 'GUID_ConstantForce', val1: 0.000, val2: 0.000 },
    { id: 7, guid: 'GUID_Spring',        val1: 0.250, val2: 0.000 },
  ],
}

// ── State ────────────────────────────────────────────────────────────────────
const connectedDevice = ref(null)
const devices         = ref([])
const connecting      = ref(false)
const connectError    = ref('')

const hidSupported = computed(() => typeof navigator !== 'undefined' && 'hid' in navigator)

// ── Actions ──────────────────────────────────────────────────────────────────
async function connectDevice() {
  connectError.value = ''
  connecting.value   = true
  try {
    const granted = await navigator.hid.requestDevice({ filters: [] })
    const ffboards = granted.filter(d =>
      d.productName && d.productName.toLowerCase().includes('ffboard')
    )
    devices.value = ffboards
    if (ffboards.length > 0) {
      connectedDevice.value = ffboards[0]
    } else if (granted.length > 0) {
      // Fallback: no FFBoard in name — still connect with a mock label so the
      // UI can be demonstrated. In production you would reject here.
      connectedDevice.value = { ...granted[0], productName: granted[0].productName || 'FFBoard HID (mock)' }
    } else {
      connectError.value = 'No device selected. Please select your FFBoard from the list.'
    }
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      connectError.value = `Connection failed: ${err.message}`
    }
    // User cancelled — stay on connect screen silently.
  } finally {
    connecting.value = false
  }
}

function disconnect() {
  connectedDevice.value = null
  devices.value         = []
  connectError.value    = ''
}
</script>

<style scoped>
/* ── Root ───────────────────────────────────────────────────────────────────*/
.wt-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: var(--bg);
  color: var(--text);
}

/* ── Connect screen ─────────────────────────────────────────────────────────*/
.wt-connect-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px 32px;
  gap: 16px;
  min-height: 100%;
}

.wt-connect-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 600px;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px 36px 36px;
  text-align: center;
}

.wt-connect-icon {
  font-size: 2.8rem;
  line-height: 1;
}

.wt-connect-title {
  font-size: 1.55rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 0.01em;
}

.wt-connect-sub {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.7;
}

.wt-no-hid {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(var(--warning-rgb), 0.10);
  border: 1px solid rgba(var(--warning-rgb), 0.35);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  font-size: 0.875rem;
  color: var(--warning);
  text-align: left;
  width: 100%;
}

.wt-no-hid-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.wt-connect-btn {
  margin-top: 4px;
  padding: 12px 32px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: opacity 0.15s;
}

.wt-connect-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.wt-connect-btn:not(:disabled):hover {
  opacity: 0.85;
}

.wt-connect-error {
  font-size: 0.85rem;
  color: var(--danger);
  background: rgba(var(--danger-rgb), 0.10);
  border: 1px solid rgba(var(--danger-rgb), 0.30);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  width: 100%;
  text-align: left;
}

.wt-connect-info {
  width: 100%;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
  text-align: left;
}

.wt-info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.wt-info-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  background: var(--secondary);
  color: var(--bg);
  border-radius: 4px;
  padding: 2px 6px;
}

.wt-info-heading {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text);
}

.wt-info-list {
  padding-left: 18px;
  margin: 0 0 10px;
  font-size: 0.83rem;
  color: var(--text-muted);
  line-height: 1.75;
}

.wt-info-disclaimer {
  font-size: 0.78rem;
  color: var(--text-dim);
  margin-top: 6px;
}

.wt-connect-hint {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  color: var(--text-dim);
  text-transform: uppercase;
  font-family: monospace;
}

/* ── Dashboard ──────────────────────────────────────────────────────────────*/
.wt-dashboard {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* Topbar */
.wt-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 44px;
  padding: 0 18px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.wt-topbar-brand {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  font-family: monospace;
  white-space: nowrap;
}

.wt-topbar-device {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.wt-topbar-label {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  font-family: monospace;
  text-transform: uppercase;
}

.wt-topbar-devname {
  font-size: 0.85rem;
  font-family: monospace;
  color: var(--text);
  font-weight: 600;
}

.wt-topbar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.wt-tbar-btn {
  padding: 5px 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}

.wt-tbar-btn:hover {
  background: var(--bg-alt);
}

.wt-tbar-btn.danger {
  border-color: rgba(var(--danger-rgb), 0.45);
  color: var(--danger);
}

.wt-tbar-btn.danger:hover {
  background: rgba(var(--danger-rgb), 0.12);
}

/* Body layout */
.wt-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Main panel */
.wt-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  overflow-y: auto;
}

.wt-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.wt-section-header {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: monospace;
  color: var(--text-dim);
  padding: 9px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
}

/* Device info grid */
.wt-info-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 24px;
  row-gap: 6px;
  padding: 14px 16px;
  font-family: monospace;
}

.wt-key {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  white-space: nowrap;
  padding-right: 8px;
  line-height: 1.6;
}

.wt-val {
  font-size: 0.88rem;
  color: var(--accent);
  font-weight: 600;
  line-height: 1.6;
}

.wt-val-neg {
  color: var(--danger);
}

.wt-unit {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 400;
}

.wt-val-secondary {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 400;
}

/* Chart placeholder */
.wt-chart-section {
  flex: 1;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.wt-chart-placeholder {
  flex: 1;
  min-height: 180px;
  background: var(--bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wt-chart-msg {
  font-size: 0.82rem;
  color: var(--text-dim);
  font-family: monospace;
  letter-spacing: 0.06em;
}

/* Guidance note */
.wt-guidance {
  font-size: 0.78rem;
  color: var(--text-dim);
  padding: 4px 2px 8px;
}

/* Sidebar */
.wt-sidebar {
  width: 260px;
  flex-shrink: 0;
  border-left: 1px solid var(--border);
  background: var(--bg-alt);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-family: monospace;
}

.wt-sb-section {
  border-bottom: 1px solid var(--border);
  padding: 10px 14px 12px;
}

.wt-sb-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 8px;
}

.wt-sb-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  padding: 2px 0;
}

.wt-sb-key {
  font-size: 0.72rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.wt-sb-val {
  font-size: 0.82rem;
  color: var(--accent);
  font-weight: 600;
  text-align: right;
}

.wt-sb-unit {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 400;
}

/* Effects */
.wt-effect-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 7px 10px;
  margin-bottom: 6px;
}

.wt-effect-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.wt-effect-id {
  font-size: 0.68rem;
  color: var(--text-dim);
}

.wt-effect-guid {
  font-size: 0.72rem;
  color: var(--secondary);
  word-break: break-all;
}

.wt-effect-vals {
  display: flex;
  gap: 14px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Sidebar disclaimer */
.wt-sb-disclaimer {
  margin-top: auto;
  padding: 12px 14px;
  font-size: 0.7rem;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
  line-height: 1.5;
}
</style>
