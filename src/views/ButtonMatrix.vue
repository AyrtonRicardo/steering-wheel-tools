<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; All Tools</RouterLink>
        <h1 class="tool-page-title">Button Matrix Calculator</h1>
        <p class="tool-page-desc">
          Design a row × column button matrix for your wheel or button box.
          Find the optimal matrix dimensions, pin requirements, and diode count
          for any number of buttons.
        </p>
      </div>

      <div class="tool-layout">

        <!-- Inputs -->
        <div class="panel">
          <p class="panel-title">Configuration</p>

          <div class="field">
            <label>Number of Buttons</label>
            <input type="number" v-model.number="inputs.numButtons" min="1" max="128" step="1" />
            <p class="hint">How many physical buttons / switches you need to scan.</p>
          </div>

          <div class="field">
            <label>Matrix Sizing Mode</label>
            <select v-model="inputs.mode">
              <option value="auto">Auto — minimise total pins</option>
              <option value="square">Square-ish — rows ≈ columns</option>
              <option value="manual">Manual — set rows &amp; columns</option>
            </select>
          </div>

          <div v-if="inputs.mode === 'manual'" class="field-row">
            <div class="field">
              <label>Rows</label>
              <input type="number" v-model.number="inputs.manualRows" min="1" max="32" step="1" />
            </div>
            <div class="field">
              <label>Columns</label>
              <input type="number" v-model.number="inputs.manualCols" min="1" max="32" step="1" />
            </div>
          </div>

          <div class="field">
            <label>Anti-Ghosting Diodes</label>
            <select v-model="inputs.diodes">
              <option value="yes">Yes — recommended (1N4148 or similar)</option>
              <option value="no">No — simple matrix (ghosting possible)</option>
            </select>
            <p class="hint">
              Diodes prevent "ghost" keypresses when multiple buttons are pressed simultaneously.
              Essential for a steering wheel.
            </p>
          </div>

          <div class="field">
            <label>Available MCU GPIO Pins</label>
            <input type="number" v-model.number="inputs.mcuPins" min="1" step="1" />
            <p class="hint">
              E.g. Arduino Pro Micro has 18 usable GPIO, STM32F4 has 50+.
              Used to warn if your matrix exceeds available pins.
            </p>
          </div>
        </div>

        <!-- Results -->
        <div class="panel">
          <p class="panel-title">Results</p>

          <div class="result-grid">
            <div class="result-card highlight">
              <p class="result-label">Matrix Size</p>
              <p class="result-value">
                {{ r.rows }}<span class="result-unit">R</span>
                × {{ r.cols }}<span class="result-unit">C</span>
              </p>
            </div>
            <div class="result-card">
              <p class="result-label">Total Cells</p>
              <p class="result-value">{{ r.totalCells }}</p>
              <p class="result-note">{{ r.unused >= 0 ? r.unused + ' unused slot' + (r.unused !== 1 ? 's' : '') : 'INSUFFICIENT!' }}</p>
            </div>
          </div>

          <div class="result-grid">
            <div class="result-card">
              <p class="result-label">GPIO Pins Required</p>
              <p class="result-value">{{ r.pinsNeeded }}</p>
            </div>
            <div class="result-card">
              <p class="result-label">Diodes Required</p>
              <p class="result-value">{{ r.diodeCount > 0 ? r.diodeCount : '0' }}</p>
              <p v-if="r.diodeCount === 0" class="result-note">not recommended</p>
            </div>
          </div>

          <StatusBadge :type="pinBadge.type" :text="pinBadge.text" />

          <div class="divider"></div>

          <p class="panel-title" style="margin-bottom:8px;">Pin Assignment</p>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Row pins (drive low, scan):</p>
          <div class="pin-list">
            <span v-for="i in r.rows" :key="'r'+i" class="pin-chip pin-row-chip">
              R{{ i }} → D{{ 1 + i }}
            </span>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin:10px 0 8px;">Column pins (read):</p>
          <div class="pin-list">
            <span v-for="i in r.cols" :key="'c'+i" class="pin-chip pin-col-chip">
              C{{ i }} → D{{ 1 + r.rows + i }}
            </span>
          </div>
        </div>

        <!-- Calculation breakdown -->
        <div class="panel breakdown-panel">
          <CalcBreakdown :steps="steps" />
        </div>

      </div>

      <!-- Visual matrix -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">Matrix Layout Visualisation</p>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
          Orange cells = active button slots. Grey cells = unused matrix positions.
        </p>
        <div style="overflow-x:auto;">
          <div class="matrix-vis" :style="{ gridTemplateColumns: `repeat(${r.cols + 1}, auto)` }">
            <!-- Column headers -->
            <div class="matrix-row">
              <div class="matrix-cell header-row"></div>
              <div v-for="c in r.cols" :key="'ch'+c" class="matrix-cell header-row">C{{ c }}</div>
            </div>
            <!-- Data rows -->
            <div v-for="rowIdx in r.rows" :key="'row'+rowIdx" class="matrix-row">
              <div class="matrix-cell header-row">R{{ rowIdx }}</div>
              <div
                v-for="colIdx in r.cols"
                :key="'cell'+rowIdx+'-'+colIdx"
                class="matrix-cell"
                :class="{ used: cellBtn(rowIdx, colIdx) > 0 && cellBtn(rowIdx, colIdx) <= inputs.numButtons }"
              >
                <template v-if="cellBtn(rowIdx, colIdx) > 0 && cellBtn(rowIdx, colIdx) <= inputs.numButtons">
                  B{{ cellBtn(rowIdx, colIdx) }}
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Wiring notes -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">Wiring Notes</p>
        <ul style="font-size:13.5px;color:var(--text-muted);line-height:2;padding-left:18px;">
          <li>Connect each button between a <strong style="color:#60a5fa;">row line</strong> and a <strong style="color:#4ade80;">column line</strong>.</li>
          <li>Place a diode <strong>in series</strong> with each button, anode toward the column, cathode toward the button (or vice-versa — be consistent).</li>
          <li>Pull column lines <strong>HIGH</strong> via MCU internal pull-ups. Drive one row LOW at a time, then read columns.</li>
          <li>Scan all rows in sequence; debounce in firmware (≥ 5 ms, or use a proper debounce library).</li>
          <li>On OpenFFBoard, connect the matrix to the <strong>SPI/I²C button expander</strong> header or directly to spare GPIO via the generic HID interface.</li>
        </ul>
        <div class="info-box" style="margin-top:16px;">
          <strong>OpenFFBoard tip:</strong> The firmware supports up to
          <strong>128 buttons</strong> over I²C GPIO expanders (MCP23017 etc.).
          A 4×4 matrix directly on MCU GPIO or an expander covers most steering wheel needs.
        </div>
      </div>

      <!-- Optimal matrix sizes reference -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">Optimal Matrix Sizes Quick Reference</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Buttons Needed</th>
              <th>Best Matrix</th>
              <th>GPIO Pins</th>
              <th>Diodes</th>
              <th>Unused Slots</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in REF_TARGETS" :key="n">
              <td>{{ n }}</td>
              <td class="highlight-cell">{{ autoMatrix(n).r }} × {{ autoMatrix(n).c }}</td>
              <td>{{ autoMatrix(n).r + autoMatrix(n).c }}</td>
              <td>{{ n }}</td>
              <td>{{ autoMatrix(n).r * autoMatrix(n).c - n }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </main>
</template>

<script setup>
import { reactive, computed } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import CalcBreakdown from '../components/CalcBreakdown.vue'

const REF_TARGETS = [4, 8, 12, 16, 20, 24, 32, 48, 64]

const inputs = reactive({
  numButtons: 20,
  mode: 'auto',
  manualRows: 4,
  manualCols: 5,
  diodes: 'yes',
  mcuPins: 20,
})

function autoMatrix(n) {
  let best = null
  for (let r = 1; r <= n; r++) {
    for (let c = r; c <= n; c++) {
      if (r * c >= n) {
        const pins = r + c
        if (!best || pins < best.pins || (pins === best.pins && Math.abs(r - c) < Math.abs(best.r - best.c))) {
          best = { r, c, pins }
        }
        break
      }
    }
  }
  return best
}

function squareMatrix(n) {
  const r = Math.ceil(Math.sqrt(n))
  const c = Math.ceil(n / r)
  return { r, c, pins: r + c }
}

const r = computed(() => {
  const n = Math.max(1, inputs.numButtons)
  let rows, cols
  if (inputs.mode === 'manual') {
    rows = Math.max(1, inputs.manualRows)
    cols = Math.max(1, inputs.manualCols)
  } else if (inputs.mode === 'square') {
    const m = squareMatrix(n)
    rows = m.r; cols = m.c
  } else {
    const m = autoMatrix(n)
    rows = m.r; cols = m.c
  }
  const totalCells = rows * cols
  const pinsNeeded = rows + cols
  const diodeCount = inputs.diodes === 'yes' ? n : 0
  const unused = totalCells - n
  return { rows, cols, totalCells, pinsNeeded, diodeCount, unused }
})

const pinBadge = computed(() => {
  const { unused, pinsNeeded } = r.value
  const { mcuPins } = inputs
  if (unused < 0) return { type: 'bad', text: `Matrix too small — needs ${-unused} more cell(s)` }
  if (pinsNeeded > mcuPins) return { type: 'bad', text: `Needs ${pinsNeeded} pins — exceeds MCU limit (${mcuPins})` }
  if (pinsNeeded > mcuPins * 0.75) return { type: 'warn', text: `${pinsNeeded} of ${mcuPins} GPIO pins used` }
  return { type: 'ok', text: `${pinsNeeded} of ${mcuPins} GPIO pins used — fits` }
})

const steps = computed(() => {
  const { numButtons, mode, diodes } = inputs
  const { rows, cols, totalCells, pinsNeeded, diodeCount, unused } = r.value
  const modeLabel = mode === 'auto' ? 'Auto (minimum pins)' : mode === 'square' ? 'Square-ish' : 'Manual'
  return [
    {
      formula: `Target button count`,
      substitution: `${numButtons} buttons needed`,
      result: `${numButtons} buttons`,
    },
    {
      formula: `Matrix selection mode: ${modeLabel}`,
      substitution: `Find rows × cols ≥ ${numButtons} with minimum rows + cols`,
      result: `${rows} × ${cols} = ${totalCells} cells`,
    },
    {
      formula: 'GPIO pins = Rows + Columns',
      substitution: `${rows} + ${cols}`,
      result: `${pinsNeeded} pins required`,
    },
    {
      formula: diodes === 'yes' ? 'Diodes = 1 per button (anti-ghosting)' : 'Diodes = 0 (anti-ghosting disabled)',
      substitution: diodes === 'yes' ? `1 × ${numButtons}` : 'N/A',
      result: `${diodeCount} diodes`,
    },
    {
      formula: 'Unused matrix slots = Total Cells − Button Count',
      substitution: `${totalCells} − ${numButtons}`,
      result: `${unused >= 0 ? unused : 'INSUFFICIENT — matrix too small'} unused`,
    },
  ]
})

// Returns the button number (1-indexed) for a given row/col, or 0 if unused
function cellBtn(rowIdx, colIdx) {
  return (rowIdx - 1) * r.value.cols + colIdx
}
</script>

<style scoped>
.breakdown-panel :deep(.breakdown) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>
