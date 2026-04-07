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
        <div class="wt-topbar-live">
          <span class="wt-live-dot" :class="{ active: isReceiving }"></span>
          <span class="wt-live-label">{{ isReceiving ? 'LIVE' : 'NO DATA' }}</span>
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
              <span class="wt-val">{{ tel.frequency.toFixed(3) }} <span class="wt-unit">hz</span></span>

              <span class="wt-key">Latency</span>
              <span class="wt-val">{{ tel.latency.toFixed(3) }} <span class="wt-unit">ms</span></span>

              <span class="wt-key">Speed</span>
              <span class="wt-val">{{ tel.speed_rpm.toFixed(3) }} <span class="wt-unit">rpm</span> &nbsp;<span class="wt-val-secondary">({{ Math.round(tel.speed_degs) }} °/s)</span></span>

              <span class="wt-key">Accel</span>
              <span class="wt-val">{{ tel.accel_rpms.toFixed(3) }} <span class="wt-unit">rpm/s</span> &nbsp;<span class="wt-val-secondary">({{ Math.round(tel.accel_degs2) }} °/s²)</span></span>

              <span class="wt-key">Inertia gain</span>
              <span class="wt-val" :class="{ 'wt-val-neg': gains.inertia < 0 }">{{ gains.inertia < 0 ? '—' : gains.inertia }}</span>

              <span class="wt-key">Friction gain</span>
              <span class="wt-val" :class="{ 'wt-val-neg': gains.friction < 0 }">{{ gains.friction < 0 ? '—' : gains.friction }}</span>
            </div>
          </div>

          <!-- Axis visualiser -->
          <div class="wt-section">
            <div class="wt-section-header">Steering Axis</div>
            <div class="wt-axis-wrap">
              <div class="wt-axis-track">
                <div class="wt-axis-center"></div>
                <div
                  class="wt-axis-thumb"
                  :style="{ left: (caps.xAxis * 100).toFixed(2) + '%' }"
                ></div>
              </div>
              <div class="wt-axis-labels">
                <span>–{{ halfRangeDeg.toFixed(0) }}°</span>
                <span>{{ axisPosDeg.toFixed(1) }}°</span>
                <span>+{{ halfRangeDeg.toFixed(0) }}°</span>
              </div>
            </div>
          </div>

          <!-- Step Log 2 -->
          <div class="wt-section">
            <div class="wt-section-header">
              Step Log 2
              <span class="wt-sl-badge">linear force test</span>
            </div>

            <div v-if="!slState.pidReady" class="wt-sl-unavail">
              ⚠ HID PID output reports not found — device may not support direct force output.
            </div>

            <template v-else>
              <div class="wt-sl-config">
                <label class="wt-sl-field">
                  <span>Steps</span>
                  <input type="number" class="wt-sl-input" v-model.number="slState.maxCount" min="10" max="200" :disabled="slState.running" />
                </label>
                <label class="wt-sl-field">
                  <span>Settle ms</span>
                  <input type="number" class="wt-sl-input" v-model.number="slState.settleMs" min="50" max="500" step="50" :disabled="slState.running" />
                </label>
                <button
                  class="wt-sl-btn"
                  :class="{ danger: slState.running }"
                  @click="slState.running ? stopStepLog2() : runStepLog2()"
                >{{ slState.running ? 'Stop' : 'Run Test' }}</button>
              </div>

              <div v-if="slState.running || slState.rows.length > 0" class="wt-sl-progress">
                <div class="wt-sl-bar"><div class="wt-sl-fill" :style="{ width: slState.progressPct + '%' }"></div></div>
                <div class="wt-sl-status">
                  <span v-if="slState.running">
                    Step {{ slState.step }}/{{ slState.total }} · {{ slState.force }} → Δ{{ slState.delta.toFixed(2) }}°
                  </span>
                  <span v-else>
                    {{ slState.rows.length }} points collected ·
                    <button class="wt-sl-export" @click="exportStepLogCSV">Export CSV</button>
                  </span>
                </div>
              </div>

              <div v-if="slState.error" class="wt-sl-error">⚠ {{ slState.error }}</div>
            </template>

            <div class="wt-sl-note">
              Requires centering force (FFBoard idle spring or sim running with FFB).
              Results are for guidance only.
            </div>
          </div>

          <div class="wt-guidance">
            ⓘ Results are for guidance only — verify against your specific hardware and setup.
            Inertia &amp; friction gains are read from the device via the FFBoard command protocol.
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="wt-sidebar">

          <!-- Telemetry -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Telemetry</div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">TimeStep</span>
              <span class="wt-sb-val">{{ tel.timestep_ms.toFixed(4) }} <span class="wt-sb-unit">ms</span></span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">FPS</span>
              <span class="wt-sb-val">{{ tel.fps.toLocaleString() }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Test State</span>
              <span class="wt-sb-val">{{ tel.testState }} &mdash; {{ tel.testStateName }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">State Val</span>
              <span class="wt-sb-val">{{ tel.testStateVal.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Speed</span>
              <span class="wt-sb-val">{{ tel.tel_speed_rpm.toFixed(2) }} <span class="wt-sb-unit">rpm</span></span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Speed (rad/s)</span>
              <span class="wt-sb-val">{{ tel.tel_speed_rads.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Accel (rot/s²)</span>
              <span class="wt-sb-val">{{ tel.tel_accel_rots2.toFixed(2) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Accel (rad/s²)</span>
              <span class="wt-sb-val">{{ tel.tel_accel_rads2.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Device Caps -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Device Caps</div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Devices found</span>
              <span class="wt-sb-val">{{ caps.devicesFound }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Device index</span>
              <span class="wt-sb-val">{{ caps.deviceIndex }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Axes</span>
              <span class="wt-sb-val">{{ caps.axes }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Sliders</span>
              <span class="wt-sb-val">{{ caps.sliders }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Buttons</span>
              <span class="wt-sb-val">{{ caps.buttons }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">POV</span>
              <span class="wt-sb-val">{{ caps.pov }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Effects</span>
              <span class="wt-sb-val">{{ caps.effects > 0 ? caps.effects : '—' }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Collection</span>
              <span class="wt-sb-val">{{ caps.channel }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">X Axis</span>
              <span class="wt-sb-val">{{ caps.xAxis.toFixed(3) }}</span>
            </div>
            <div class="wt-sb-row">
              <span class="wt-sb-key">Steering Range</span>
              <span class="wt-sb-val">{{ caps.steeringDeg }}°</span>
            </div>
          </div>

          <!-- Active Effects -->
          <div class="wt-sb-section">
            <div class="wt-sb-label">Active Effects</div>
            <div v-if="activeEffects.length === 0" class="wt-no-effects">
              No effect data — effects are write-only via HID PID.
            </div>
            <div
              v-for="fx in activeEffects"
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
import { ref, reactive, computed, onUnmounted } from 'vue'
import { FFBoardHID, ClassId, AxisCmd, FxCmd, CmdType } from '../lib/FFBoardHID.js'
import { WheelTelemetry } from '../lib/WheelTelemetry.js'
import { HIDPIDDriver } from '../lib/HIDPIDDriver.js'
import { StepLog2 } from '../lib/StepLog2.js'

// ── State ────────────────────────────────────────────────────────────────────
const connectedDevice = ref(null)
const connecting      = ref(false)
const connectError    = ref('')

const hidSupported = computed(() => typeof navigator !== 'undefined' && 'hid' in navigator)
const isReceiving  = ref(false)

// Live telemetry — populated by WheelTelemetry 'tick' events
const tel = reactive({
  frequency: 0, latency: 0, fps: 0, timestep_ms: 0,
  speed_rpm: 0, speed_degs: 0, accel_rpms: 0, accel_degs2: 0,
  tel_speed_rpm: 0, tel_speed_rads: 0, tel_accel_rots2: 0, tel_accel_rads2: 0,
  testState: 0, testStateName: 'Idle', testStateVal: 0,
})

// FFB effect gains — populated by FFBoardHID vendor commands on connect
const gains = reactive({ inertia: -1, friction: -1 })

// Device capabilities — populated from HID descriptor on connect
const caps = reactive({
  devicesFound: 0, deviceIndex: 0,
  axes: 0, sliders: 0, buttons: 0, pov: 0, effects: 0, channel: 0,
  xAxis: 0.5,
  steeringDeg: 900,
})

const activeEffects = ref([])

// Derived — axis position in degrees and half-range label for the bar
const axisPosDeg   = computed(() => (caps.xAxis - 0.5) * caps.steeringDeg)
const halfRangeDeg = computed(() => caps.steeringDeg / 2)

// Step Log 2 state
const slState = reactive({
  pidReady:    false,
  running:     false,
  maxCount:    50,
  settleMs:    150,
  step:        0,
  total:       0,
  force:       0,
  delta:       0,
  progressPct: 0,
  rows:        [],
  error:       '',
})

// ── Lib instances ─────────────────────────────────────────────────────────────
let telemetry      = null   // WheelTelemetry — created on connect, destroyed on disconnect
let ffboard        = null   // FFBoardHID    — created on connect, destroyed on disconnect
let pidDriver      = null   // HIDPIDDriver  — created on connect, destroyed on disconnect
let stepLog2Runner = null   // StepLog2      — created per run, nulled on stop/complete

// ── Event handlers ────────────────────────────────────────────────────────────
function onTelemetryTick(event) {
  const d = event.detail
  Object.assign(tel, d)
  caps.xAxis = d.xAxis
}

function onTelemetryLive(event) {
  isReceiving.value = event.detail
}

function onFFBoardMessage(event) {
  const { type, classId, cmd, val } = event.detail
  if (type !== CmdType.request) return

  if (classId === ClassId.axis && cmd === AxisCmd.degrees) {
    if (val >= 90 && val <= 3600) {
      caps.steeringDeg    = val
      telemetry.steeringDeg = val   // keep the processor in sync
    }
  }
  if (classId === ClassId.effects) {
    if (cmd === FxCmd.inertia)  gains.inertia  = val
    if (cmd === FxCmd.friction) gains.friction = val
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function connectDevice() {
  connectError.value = ''
  connecting.value   = true
  try {
    const granted  = await navigator.hid.requestDevice({ filters: [] })
    const ffboards = granted.filter(d => d.productName?.toLowerCase().includes('ffboard'))
    const chosen   = ffboards.length > 0 ? ffboards[0] : granted[0] ?? null

    if (!chosen) {
      connectError.value = 'No device selected. Please select your FFBoard from the list.'
      return
    }

    if (!chosen.opened) await chosen.open()

    // Telemetry processor — parses descriptor and handles joystick input reports
    telemetry = new WheelTelemetry()
    const { caps: deviceCaps, steeringDeg } = telemetry.attach(chosen, granted)
    Object.assign(caps, deviceCaps, { xAxis: 0.5, steeringDeg })
    telemetry.addEventListener('tick', onTelemetryTick)
    telemetry.addEventListener('live', onTelemetryLive)

    // FFBoard vendor command channel — queries device settings
    ffboard = new FFBoardHID(chosen)
    ffboard.addEventListener('message', onFFBoardMessage)
    ffboard.request(ClassId.axis,    0, AxisCmd.degrees)
    ffboard.request(ClassId.effects, 0, FxCmd.inertia)
    ffboard.request(ClassId.effects, 0, FxCmd.friction)

    // HID PID driver — needed for Step Log 2 force sweep
    pidDriver = new HIDPIDDriver(chosen)
    slState.pidReady = pidDriver.isReady

    connectedDevice.value = chosen

  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      connectError.value = `Connection failed: ${err.message}`
    }
  } finally {
    connecting.value = false
  }
}

function disconnect() {
  if (telemetry) {
    telemetry.removeEventListener('tick', onTelemetryTick)
    telemetry.removeEventListener('live', onTelemetryLive)
    telemetry.detach()
    telemetry.reset()
    telemetry = null
  }
  if (ffboard) {
    ffboard.removeEventListener('message', onFFBoardMessage)
    ffboard.destroy()
    ffboard = null
  }
  if (stepLog2Runner) {
    stepLog2Runner.stop()
    stepLog2Runner = null
  }
  pidDriver = null
  if (connectedDevice.value) {
    connectedDevice.value.close().catch(() => {})
  }
  connectedDevice.value = null
  connectError.value    = ''
  isReceiving.value     = false
  activeEffects.value   = []

  Object.assign(tel, {
    frequency: 0, latency: 0, fps: 0, timestep_ms: 0,
    speed_rpm: 0, speed_degs: 0, accel_rpms: 0, accel_degs2: 0,
    tel_speed_rpm: 0, tel_speed_rads: 0, tel_accel_rots2: 0, tel_accel_rads2: 0,
    testState: 0, testStateName: 'Idle', testStateVal: 0,
  })
  Object.assign(gains, { inertia: -1, friction: -1 })
  Object.assign(caps, {
    devicesFound: 0, deviceIndex: 0,
    axes: 0, sliders: 0, buttons: 0, pov: 0, effects: 0, channel: 0,
    xAxis: 0.5, steeringDeg: 900,
  })
  Object.assign(slState, {
    pidReady: false, running: false,
    step: 0, total: 0, force: 0, delta: 0, progressPct: 0,
    rows: [], error: '',
  })
}

// ── Step Log 2 ────────────────────────────────────────────────────────────────
function runStepLog2() {
  slState.error       = ''
  slState.rows        = []
  slState.step        = 0
  slState.total       = slState.maxCount
  slState.force       = 0
  slState.delta       = 0
  slState.progressPct = 0
  slState.running     = true

  stepLog2Runner = new StepLog2(pidDriver, telemetry)

  stepLog2Runner.addEventListener('progress', e => {
    const { step, total, force, delta } = e.detail
    slState.step        = step
    slState.total       = total
    slState.force       = force
    slState.delta       = delta
    slState.progressPct = total > 0 ? (step / total) * 100 : 0
  })

  stepLog2Runner.addEventListener('complete', e => {
    slState.rows        = e.detail.rows
    slState.progressPct = 100
    slState.running     = false
    stepLog2Runner      = null
  })

  stepLog2Runner.addEventListener('error', e => {
    slState.error   = e.detail
    slState.running = false
    stepLog2Runner  = null
  })

  stepLog2Runner.run({ maxCount: slState.maxCount, settleMs: slState.settleMs })
}

function stopStepLog2() {
  if (stepLog2Runner) {
    stepLog2Runner.stop()
    stepLog2Runner  = null
  }
  slState.running = false
}

function exportStepLogCSV() {
  if (slState.rows.length === 0) return
  const lines = ['force,delta_deg', ...slState.rows.map(r => `${r.force},${r.delta.toFixed(4)}`)]
  const blob  = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = 'step_log2.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onUnmounted(() => {
  if (connectedDevice.value) disconnect()
})
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

.wt-topbar-live {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.wt-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-dim);
  transition: background 0.2s;
}

.wt-live-dot.active {
  background: var(--success);
  box-shadow: 0 0 6px rgba(var(--success-rgb), 0.6);
}

.wt-live-label {
  font-size: 0.65rem;
  font-family: monospace;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  text-transform: uppercase;
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

/* Axis visualiser */
.wt-axis-wrap {
  padding: 18px 20px 14px;
}

.wt-axis-track {
  position: relative;
  height: 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 5px;
  margin-bottom: 6px;
}

.wt-axis-center {
  position: absolute;
  left: 50%;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--border);
  transform: translateX(-50%);
}

.wt-axis-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.5);
  transform: translate(-50%, -50%);
  transition: left 0.04s linear;
}

.wt-axis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: var(--text-dim);
  font-family: monospace;
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
.wt-no-effects {
  font-size: 0.72rem;
  color: var(--text-dim);
  line-height: 1.5;
}

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

/* ── Step Log 2 ─────────────────────────────────────────────────────────────*/
.wt-sl-badge {
  display: inline-block;
  margin-left: 8px;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--secondary);
  color: var(--bg);
  border-radius: 4px;
  padding: 1px 6px;
  vertical-align: middle;
}

.wt-sl-unavail {
  padding: 12px 16px;
  font-size: 0.82rem;
  color: var(--warning);
  background: rgba(var(--warning-rgb), 0.08);
  border-top: 1px solid rgba(var(--warning-rgb), 0.2);
}

.wt-sl-config {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.wt-sl-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: monospace;
}

.wt-sl-input {
  width: 72px;
  padding: 4px 8px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.82rem;
  font-family: monospace;
}

.wt-sl-input:focus {
  outline: none;
  border-color: var(--accent);
}

.wt-sl-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wt-sl-btn {
  padding: 5px 16px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition: opacity 0.15s;
}

.wt-sl-btn:hover { opacity: 0.85; }

.wt-sl-btn.danger {
  background: transparent;
  border: 1px solid rgba(var(--danger-rgb), 0.5);
  color: var(--danger);
}

.wt-sl-btn.danger:hover {
  background: rgba(var(--danger-rgb), 0.1);
  opacity: 1;
}

.wt-sl-progress {
  padding: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wt-sl-bar {
  height: 6px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.wt-sl-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.2s linear;
}

.wt-sl-status {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 10px;
}

.wt-sl-export {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: 0.75rem;
  font-family: monospace;
  padding: 2px 8px;
  cursor: pointer;
}

.wt-sl-export:hover {
  background: rgba(var(--accent-rgb), 0.1);
}

.wt-sl-error {
  margin: 0 16px 12px;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: var(--danger);
  background: rgba(var(--danger-rgb), 0.08);
  border: 1px solid rgba(var(--danger-rgb), 0.25);
  border-radius: var(--radius-sm);
}

.wt-sl-note {
  padding: 8px 16px 12px;
  font-size: 0.75rem;
  color: var(--text-dim);
  line-height: 1.5;
  border-top: 1px solid var(--border);
  margin-top: auto;
}
</style>
