<template>
  <div class="wcp-root">

    <!-- DROP SCREEN -->
    <div
      v-if="files.length === 0"
      class="wcp-drop-screen"
      :class="{ 'drag-over': isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div class="wcp-drop-box">
        <div class="wcp-drop-icon">📂</div>
        <div class="wcp-drop-title">Drop WheelCheck CSVs</div>
        <div class="wcp-drop-sub">
          Drop <strong>one or multiple</strong> <strong>log2_*.csv</strong> files<br>
          to plot and compare their linearity curves side by side.<br><br>
          Columns: <strong>Force</strong> &amp; <strong>DeltaXdeg</strong> · processed locally, nothing uploaded.
        </div>
        <button class="wcp-browse-btn" @click="browseFiles">Browse files…</button>
        <input ref="fileInputRef" type="file" accept=".csv" multiple style="display:none" @change="onFileInputChange" />
      </div>
      <div class="wcp-drop-hint">DRAG &amp; DROP MULTIPLE FILES AT ONCE · OR BROWSE</div>
      <div v-if="error" class="wcp-error-bar">⚠ {{ error }}</div>
    </div>

    <!-- APP -->
    <div
      v-else
      class="wcp-app"
      @dragover.prevent
      @drop.prevent="e => loadFileList(e.dataTransfer.files)"
    >
      <!-- Topbar -->
      <div class="wcp-topbar">
        <div class="wcp-topbar-brand">⚙ WheelCheck</div>
        <div class="wcp-topbar-info">
          Files loaded: <b>{{ files.length }}</b>
          &nbsp;&nbsp;Total points: <b>{{ totalPoints.toLocaleString() }}</b>
        </div>
        <div class="wcp-topbar-actions">
          <button class="wcp-tbar-btn add" @click="browseMore">+ Add more files</button>
          <input ref="addFileInputRef" type="file" accept=".csv" multiple style="display:none" @change="onAddFileInputChange" />
          <button class="wcp-tbar-btn" @click="clearAll">✕ Clear all</button>
        </div>
      </div>

      <!-- Body -->
      <div class="wcp-body">

        <!-- Chart panel -->
        <div class="wcp-chart-panel">
          <div class="wcp-chart-toolbar">
            <div class="wcp-chart-tabs">
              <button
                v-for="t in TABS" :key="t.key"
                class="wcp-tab"
                :class="{ active: activeTab === t.key }"
                @click="setTab(t.key)"
              >{{ t.label }}</button>
            </div>
            <div class="wcp-spacer"></div>
            <div class="wcp-smooth-inline">
              Smooth
              <input type="range" min="1" max="25" step="1" v-model.number="smoothWindow" @input="rebuildChart" />
              <span>{{ smoothWindow }}</span>
            </div>
          </div>
          <div class="wcp-chart-wrap">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="wcp-sidebar">

          <div class="wcp-sb-section">
            <div class="wcp-sb-label">Files</div>
            <div
              v-for="f in files" :key="f.id"
              class="wcp-file-item"
              :class="{ muted: !f.visible }"
            >
              <div class="wcp-file-swatch" :style="{ background: f.color.solid }"></div>
              <div class="wcp-file-name" :title="f.name">{{ f.name }}</div>
              <div class="wcp-file-pts">{{ f.rows.length }}</div>
              <button class="wcp-file-vis-btn" @click="toggleVisible(f)">{{ f.visible ? '👁' : '🚫' }}</button>
              <button class="wcp-file-remove" @click="removeFile(f)">×</button>
            </div>
          </div>

          <div class="wcp-sb-section">
            <div class="wcp-sb-label">Display</div>
            <div class="wcp-toggle-row">
              <span>Identity line</span>
              <button class="wcp-toggle" :class="{ on: showIdentity }" @click="showIdentity = !showIdentity; rebuildChart()"></button>
            </div>
            <div class="wcp-toggle-row">
              <span>Fill area</span>
              <button class="wcp-toggle" :class="{ on: showFill }" @click="showFill = !showFill; rebuildChart()"></button>
            </div>
          </div>

          <div class="wcp-sb-section">
            <div class="wcp-sb-label">Comparison</div>
            <div style="overflow-x:auto">
              <table class="wcp-compare-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>File</th>
                    <th>Deadzone</th>
                    <th>Dev%</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in files" :key="f.id">
                    <td><span class="wcp-td-dot" :style="{ background: f.color.solid }"></span></td>
                    <td class="wcp-td-name" :title="f.name">{{ f.name.replace('.csv', '') }}</td>
                    <td :style="{ color: f.color.solid }">{{ metrics(f).deadzone }}</td>
                    <td :style="{ color: f.color.solid }">{{ metrics(f).avgDev }}%</td>
                    <td style="color:var(--text-muted)">{{ f.rows.length }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="wcp-sb-section" style="flex:1"></div>

        </aside>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { Chart, LinearScale, LineElement, PointElement, LineController, Tooltip } from 'chart.js'

Chart.register(LinearScale, LineElement, PointElement, LineController, Tooltip)

const TABS = [
  { key: 'smooth', label: 'Smoothed' },
  { key: 'raw',    label: 'Raw' },
  { key: 'diff',   label: 'Deviation' },
]

const PALETTE = [
  { solid: '#00d4ff', fill: 'rgba(0,212,255,0.08)' },
  { solid: '#39ff8f', fill: 'rgba(57,255,143,0.08)' },
  { solid: '#ff4d6d', fill: 'rgba(255,77,109,0.08)' },
  { solid: '#ffd166', fill: 'rgba(255,209,102,0.08)' },
  { solid: '#c77dff', fill: 'rgba(199,125,255,0.08)' },
  { solid: '#ff9f1c', fill: 'rgba(255,159,28,0.08)' },
  { solid: '#06d6a0', fill: 'rgba(6,214,160,0.08)' },
  { solid: '#ef476f', fill: 'rgba(239,71,111,0.08)' },
]

// ── State ────────────────────────────────────────────────────────
const files        = ref([])
const activeTab    = ref('smooth')
const smoothWindow = ref(5)
const showIdentity = ref(true)
const showFill     = ref(false)
const isDragging   = ref(false)
const error        = ref('')

const fileInputRef    = ref(null)
const addFileInputRef = ref(null)
const chartCanvas     = ref(null)

let chart     = null
let colorIdx  = 0

const totalPoints = computed(() => files.value.reduce((s, f) => s + f.rows.length, 0))

// ── CSV Parser ────────────────────────────────────────────────────
function parseCSV(text, filename) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) throw new Error(filename + ': fewer than 2 lines')
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))

  const findCol = (...names) => {
    for (const n of names) {
      const idx = headers.findIndex(h => h.toLowerCase().includes(n.toLowerCase()))
      if (idx !== -1) return idx
    }
    return -1
  }

  let forceIdx = findCol('Force', 'force', 'FFB', 'input')
  let deltaIdx = findCol('DeltaXdeg', 'delta', 'output', 'response', 'deg')
  if (forceIdx === -1 || deltaIdx === -1) { forceIdx = 0; deltaIdx = 1 }

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
    const f = parseFloat(cols[forceIdx])
    const d = parseFloat(cols[deltaIdx])
    if (!isNaN(f) && !isNaN(d)) rows.push({ force: f, delta: d })
  }
  if (rows.length < 5) throw new Error(filename + ': too few data rows')
  return rows
}

// ── Math ──────────────────────────────────────────────────────────
function movingAvg(data, w) {
  if (w <= 1) return [...data]
  return data.map((_, i) => {
    const h = Math.floor(w / 2)
    const sl = data.slice(Math.max(0, i - h), Math.min(data.length, i + h + 1))
    return sl.reduce((a, b) => a + b, 0) / sl.length
  })
}

function normalize(arr) {
  const mx = Math.max(...arr)
  return mx === 0 ? arr.map(() => 0) : arr.map(v => v / mx)
}


function getProcessed(file) {
  const forces = file.rows.map(r => r.force)
  const deltas = file.rows.map(r => r.delta)
  const sDeltas = movingAvg(deltas, smoothWindow.value)
  return { normF: normalize(forces), normD: normalize(sDeltas), normDRaw: normalize(deltas), forces, sDeltas }
}

function metrics(file) {
  const normF = normalize(file.rows.map(r => r.force))
  const normD = normalize(file.rows.map(r => r.delta))
  const dzIdx = normD.findIndex(v => v > 0.02)
  const deadzone = dzIdx >= 0 ? (normF[dzIdx] * 100).toFixed(1) + '%' : 'n/a'
  const avgDev = (normF.map((f, i) => Math.abs(normD[i] - f)).reduce((a, b) => a + b, 0) / normF.length * 100).toFixed(1)
  return { deadzone, avgDev }
}

// ── Chart ─────────────────────────────────────────────────────────
function rebuildChart() {
  if (chart) { chart.destroy(); chart = null }
  if (!chartCanvas.value) return
  const visible = files.value.filter(f => f.visible)
  if (visible.length === 0) return

  const datasets = []
  const tab = activeTab.value
  const fill = showFill.value

  if (showIdentity.value) {
    datasets.push({
      label: '__id',
      data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      borderColor: 'rgba(74,85,112,0.4)', borderWidth: 1,
      borderDash: [5, 5], pointRadius: 0, fill: false, tension: 0, order: 999,
    })
  }

  visible.forEach((file, idx) => {
    const { normF, normD, normDRaw, forces, sDeltas } = getProcessed(file)
    const col = file.color

    if (tab === 'smooth') {
      datasets.push({
        label: file.name,
        data: normF.map((f, i) => ({ x: f, y: normD[i] })),
        borderColor: col.solid, backgroundColor: fill ? col.fill : 'transparent',
        borderWidth: 2, pointRadius: 0, fill, tension: 0.4, order: idx,
      })
    } else if (tab === 'raw') {
      datasets.push({
        label: file.name,
        data: normalize(file.rows.map(r => r.force)).map((f, i) => ({ x: f, y: normDRaw[i] })),
        borderColor: col.solid, backgroundColor: fill ? col.fill : 'transparent',
        borderWidth: 1.5, pointRadius: 0, fill, tension: 0.2, order: idx,
      })
    } else if (tab === 'diff') {
      datasets.push({
        label: file.name,
        data: normF.map((f, i) => ({ x: f, y: normD[i] - f })),
        borderColor: col.solid, backgroundColor: fill ? col.fill : 'transparent',
        borderWidth: 2, pointRadius: 0, fill, tension: 0.4, order: idx,
      })
    }
  })

  const isDiff = tab === 'diff'
  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 220 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'linear', min: 0, max: 1,
          title: { display: true, text: 'Force Input (normalized)', color: '#4a5570', font: { family: 'monospace', size: 10 } },
          grid: { color: '#1f2433' },
          ticks: { color: '#4a5570', font: { family: 'monospace', size: 9 }, maxTicksLimit: 6 },
        },
        y: {
          type: 'linear',
          min: isDiff ? undefined : 0,
          max: isDiff ? undefined : 1,
          title: { display: true, text: isDiff ? 'Δ (Response − Force)' : 'Wheel Response (normalized)', color: '#4a5570', font: { family: 'monospace', size: 10 } },
          grid: { color: '#1f2433' },
          ticks: { color: '#4a5570', font: { family: 'monospace', size: 9 }, maxTicksLimit: 6 },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#13161e', borderColor: '#2a3048', borderWidth: 1,
          titleColor: '#4a5570', titleFont: { family: 'monospace', size: 9 },
          bodyFont: { family: 'monospace', size: 10 },
          callbacks: {
            title: items => 'FORCE  ' + items[0].parsed.x.toFixed(4),
            label: item => {
              if (item.dataset.label === '__id') return null
              const name = item.dataset.label.replace('.csv', '').slice(0, 16)
              return name + '  ' + (isDiff ? 'DEV ' : 'OUT ') + item.parsed.y.toFixed(4)
            },
            labelColor: item => ({ borderColor: item.dataset.borderColor, backgroundColor: item.dataset.borderColor }),
          },
        },
      },
    },
  })
}

watch(files, () => nextTick(rebuildChart), { deep: true })

// ── File loading ──────────────────────────────────────────────────
function loadFileList(fileList) {
  Array.from(fileList).forEach(file => {
    if (!file.name.endsWith('.csv')) { showError('Skipped non-CSV: ' + file.name); return }
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const rows = parseCSV(e.target.result, file.name)
        files.value.push({
          id: Date.now() + Math.random(),
          name: file.name,
          rows,
          color: PALETTE[colorIdx % PALETTE.length],
          visible: true,
        })
        colorIdx++
      } catch (err) { showError(err.message) }
    }
    reader.readAsText(file)
  })
}

function showError(msg) {
  error.value = msg
  setTimeout(() => error.value = '', 5000)
}

// ── Actions ────────────────────────────────────────────────────────
function onDrop(e) {
  isDragging.value = false
  loadFileList(e.dataTransfer.files)
}
function browseFiles()    { fileInputRef.value?.click() }
function browseMore()     { addFileInputRef.value?.click() }
function onFileInputChange(e)    { loadFileList(e.target.files) }
function onAddFileInputChange(e) { loadFileList(e.target.files) }

function toggleVisible(file) { file.visible = !file.visible; rebuildChart() }

function removeFile(file) {
  files.value = files.value.filter(f => f.id !== file.id)
  if (files.value.length === 0 && chart) { chart.destroy(); chart = null }
  else rebuildChart()
}

function clearAll() {
  files.value = []
  colorIdx = 0
  if (chart) { chart.destroy(); chart = null }
}

function setTab(key) { activeTab.value = key; rebuildChart() }


onUnmounted(() => { if (chart) { chart.destroy(); chart = null } })
</script>

<style scoped>
/* Root takes remaining viewport height after app header/footer */
.wcp-root {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height, 56px) - var(--footer-height, 48px));
  background: #0d0f14;
  color: #b8c4d8;
  font-family: var(--font-sans, sans-serif);
  overflow: hidden;
}

/* ── Drop screen ───────────────────────────────────────────────── */
.wcp-drop-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  transition: background 0.2s;
}
.wcp-drop-screen.drag-over { background: rgba(0,212,255,0.03); }

.wcp-drop-box {
  width: 460px;
  padding: 48px 40px;
  border: 1px solid #2a3048;
  border-radius: 4px;
  text-align: center;
  background: linear-gradient(135deg, rgba(0,212,255,0.03) 0%, transparent 60%);
  transition: border-color 0.2s;
}
.wcp-drop-screen.drag-over .wcp-drop-box { border-color: #00d4ff; }

.wcp-drop-icon  { font-size: 44px; margin-bottom: 14px; opacity: 0.5; }
.wcp-drop-title { font-weight: 800; font-size: 20px; color: #fff; margin-bottom: 8px; }
.wcp-drop-sub   { font-size: 12px; color: #4a5570; line-height: 1.7; }
.wcp-drop-sub strong { color: #00d4ff; }

.wcp-browse-btn {
  margin-top: 22px;
  padding: 10px 28px;
  background: transparent;
  border: 1px solid #2a3048;
  color: #b8c4d8;
  font-family: monospace;
  font-size: 11px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.15s;
}
.wcp-browse-btn:hover { border-color: #00d4ff; color: #00d4ff; }

.wcp-drop-hint { font-size: 10px; color: #4a5570; font-family: monospace; letter-spacing: 1px; }
.wcp-error-bar {
  background: rgba(255,77,109,0.1);
  border: 1px solid rgba(255,77,109,0.3);
  border-radius: 2px;
  padding: 10px 16px;
  font-size: 11px;
  color: #ff4d6d;
  font-family: monospace;
  max-width: 460px;
  text-align: center;
}

/* ── App ─────────────────────────────────────────────────────── */
.wcp-app { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

.wcp-topbar {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #1f2433;
  flex-shrink: 0;
  height: 44px;
}
.wcp-topbar-brand {
  padding: 0 20px;
  border-right: 1px solid #1f2433;
  font-weight: 800;
  font-size: 13px;
  color: #00d4ff;
  letter-spacing: 1px;
  text-transform: uppercase;
  white-space: nowrap;
  height: 100%;
  display: flex;
  align-items: center;
}
.wcp-topbar-info {
  padding: 0 16px;
  font-family: monospace;
  font-size: 10px;
  color: #4a5570;
  flex: 1;
  border-right: 1px solid #1f2433;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 20px;
}
.wcp-topbar-info b { color: #b8c4d8; font-weight: 400; }
.wcp-topbar-actions { display: flex; height: 100%; }
.wcp-tbar-btn {
  padding: 0 16px;
  background: none;
  border: none;
  border-left: 1px solid #1f2433;
  color: #4a5570;
  font-family: monospace;
  font-size: 10px;
  cursor: pointer;
  transition: color 0.15s;
  white-space: nowrap;
}
.wcp-tbar-btn:hover { color: #00d4ff; }
.wcp-tbar-btn.add   { color: rgba(57,255,143,0.7); }
.wcp-tbar-btn.add:hover { color: #39ff8f; }

/* ── Body ────────────────────────────────────────────────────── */
.wcp-body {
  display: grid;
  grid-template-columns: 1fr 250px;
  flex: 1;
  overflow: hidden;
}

.wcp-chart-panel {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 12px;
  overflow: hidden;
}
.wcp-chart-toolbar { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.wcp-chart-tabs {
  display: flex;
  gap: 1px;
  background: #1f2433;
  border-radius: 2px;
  overflow: hidden;
}
.wcp-tab {
  padding: 6px 14px;
  font-family: monospace;
  font-size: 10px;
  background: #13161e;
  color: #4a5570;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.5px;
}
.wcp-tab.active { background: #2a3048; color: #00d4ff; }
.wcp-tab:hover:not(.active) { color: #b8c4d8; }

.wcp-spacer { flex: 1; }
.wcp-smooth-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: monospace;
  font-size: 10px;
  color: #4a5570;
}
.wcp-smooth-inline input[type=range] {
  width: 80px;
  height: 2px;
  -webkit-appearance: none;
  background: #2a3048;
  outline: none;
}
.wcp-smooth-inline input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00d4ff;
  cursor: pointer;
}
.wcp-smooth-inline span { color: #00d4ff; min-width: 18px; }

.wcp-chart-wrap {
  flex: 1;
  background: #13161e;
  border: 1px solid #1f2433;
  border-radius: 2px;
  padding: 16px;
  position: relative;
  min-height: 0;
}

/* ── Sidebar ──────────────────────────────────────────────────── */
.wcp-sidebar {
  border-left: 1px solid #1f2433;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #1f2433 transparent;
}
.wcp-sb-section { padding: 14px 16px; border-bottom: 1px solid #1f2433; }
.wcp-sb-label {
  font-size: 9px;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: #4a5570;
  margin-bottom: 10px;
}

.wcp-file-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border-radius: 2px;
  margin-bottom: 6px;
  background: #0d0f14;
  border: 1px solid #1f2433;
  transition: border-color 0.15s;
}
.wcp-file-item.muted { opacity: 0.35; }
.wcp-file-swatch { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.wcp-file-name  { font-family: monospace; font-size: 9px; color: #b8c4d8; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wcp-file-pts   { font-family: monospace; font-size: 9px; color: #4a5570; flex-shrink: 0; }
.wcp-file-vis-btn {
  background: none; border: none; cursor: pointer;
  padding: 1px 3px; font-size: 10px; color: #4a5570;
  flex-shrink: 0; transition: color 0.15s;
}
.wcp-file-vis-btn:hover { color: #b8c4d8; }
.wcp-file-remove {
  background: none; border: none; cursor: pointer;
  padding: 1px 3px; font-size: 13px; color: #4a5570;
  flex-shrink: 0; transition: color 0.15s; line-height: 1;
}
.wcp-file-remove:hover { color: #ff4d6d; }

.wcp-compare-table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 9px; }
.wcp-compare-table th {
  text-align: left; color: #4a5570; padding: 3px 5px;
  font-weight: 400; border-bottom: 1px solid #1f2433; letter-spacing: 0.5px;
}
.wcp-compare-table td { padding: 5px 5px; border-bottom: 1px solid rgba(31,36,51,0.5); }
.wcp-compare-table tr:hover td { background: rgba(255,255,255,0.02); }
.wcp-td-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70px; }
.wcp-td-dot  { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

.wcp-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; font-size: 10px; color: #4a5570;
}
.wcp-toggle {
  width: 28px; height: 14px; background: #2a3048; border-radius: 7px;
  position: relative; cursor: pointer; transition: background 0.2s; border: none; flex-shrink: 0;
}
.wcp-toggle::after {
  content: ''; position: absolute; width: 10px; height: 10px;
  border-radius: 50%; background: #4a5570; top: 2px; left: 2px; transition: all 0.2s;
}
.wcp-toggle.on { background: rgba(0,212,255,0.25); }
.wcp-toggle.on::after { background: #00d4ff; transform: translateX(14px); }

.wcp-export-btn {
  width: 100%; padding: 9px;
  background: rgba(57,255,143,0.07);
  border: 1px solid rgba(57,255,143,0.25);
  color: #39ff8f;
  font-family: monospace; font-size: 10px;
  cursor: pointer; border-radius: 2px;
  letter-spacing: 1px; text-transform: uppercase;
  transition: all 0.15s; margin-bottom: 7px;
}
.wcp-export-btn:hover { background: rgba(57,255,143,0.14); }
.wcp-export-btn:last-child { margin-bottom: 0; }
</style>
