<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; All Tools</RouterLink>
        <h1 class="tool-page-title">&#128260; Encoder Resolution Calculator</h1>
        <p class="tool-page-desc">
          Determine how many encoder counts fall within each degree of rotation — and verify
          your setup meets OpenFFBoard's recommended minimums for smooth force feedback.
        </p>
      </div>

      <div class="tool-layout">

        <!-- Inputs -->
        <div class="panel">
          <p class="panel-title">Configuration</p>

          <div class="field">
            <label>Encoder PPR (Pulses Per Revolution)</label>
            <input type="number" v-model.number="inputs.ppr" min="1" step="1" />
            <p class="hint">
              Check your encoder datasheet. Most quadrature encoders multiply this ×4
              — enter the base PPR, not the quadrature count.
            </p>
          </div>

          <div class="field">
            <label>Quadrature Multiplier</label>
            <select v-model.number="inputs.quadrature">
              <option :value="4">×4 — Quadrature (most encoders)</option>
              <option :value="2">×2 — Half quadrature</option>
              <option :value="1">×1 — No multiplier (single-ended)</option>
            </select>
            <p class="hint">OpenFFBoard uses full ×4 quadrature decoding by default.</p>
          </div>

          <div class="field">
            <label>Gear / Belt Ratio</label>
            <input type="number" v-model.number="inputs.gearRatio" min="0.01" step="0.01" />
            <p class="hint">
              Set to <code>1</code> for direct-drive. For a 3:1 reduction pulley
              enter <code>3</code>; the encoder sees 3 turns per wheel turn.
            </p>
          </div>

          <div class="field">
            <label>Steering Lock-to-Lock (degrees)</label>
            <input type="number" v-model.number="inputs.steeringRange" min="1" step="1" />
            <p class="hint">Typical sim range: 540° – 1080°. Used to show total count range.</p>
          </div>
        </div>

        <!-- Results -->
        <div class="panel">
          <p class="panel-title">Results</p>

          <div class="result-grid">
            <div class="result-card highlight">
              <p class="result-label">Counts per Degree</p>
              <p class="result-value">
                {{ r.cpd > 0 ? r.cpd.toFixed(2) : '—' }}<span class="result-unit">cnt/°</span>
              </p>
            </div>
            <div class="result-card">
              <p class="result-label">Degrees per Count</p>
              <p class="result-value">
                {{ r.dpc > 0 ? r.dpc.toFixed(4) : '—' }}<span class="result-unit">°/cnt</span>
              </p>
            </div>
          </div>

          <div class="result-grid">
            <div class="result-card">
              <p class="result-label">Total CPR (after ×ratio)</p>
              <p class="result-value">{{ r.totalCpr > 0 ? Math.round(r.totalCpr).toLocaleString() : '—' }}</p>
            </div>
            <div class="result-card">
              <p class="result-label">Counts over Lock-to-Lock</p>
              <p class="result-value">{{ r.rangeCnt > 0 ? Math.round(r.rangeCnt).toLocaleString() : '—' }}</p>
            </div>
          </div>

          <StatusBadge :type="badge.type" :text="badge.text" />

          <!-- Calculation breakdown -->
          <CalcBreakdown v-if="r.totalCpr > 0" :steps="steps" />

          <div class="divider"></div>

          <p class="panel-title">Resolution Benchmark</p>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rating</th>
                <th>Counts / °</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="color:var(--danger)">&#9679; Marginal</td>
                <td>&lt; 5</td>
                <td>FFB may feel stepped / coarse</td>
              </tr>
              <tr>
                <td style="color:var(--warning)">&#9679; Acceptable</td>
                <td>5 – 20</td>
                <td>Smooth enough for most games</td>
              </tr>
              <tr>
                <td style="color:var(--success)">&#9679; Good</td>
                <td>20 – 100</td>
                <td>OpenFFBoard recommended range</td>
              </tr>
              <tr>
                <td style="color:var(--accent)">&#9679; Excellent</td>
                <td>&gt; 100</td>
                <td>High-res servo encoders / geared setups</td>
              </tr>
            </tbody>
          </table>

          <div class="info-box">
            <strong>OpenFFBoard tip:</strong> The firmware default is up to
            <strong>32 000</strong> counts/rev. If your CPR exceeds that, configure the
            encoder divider in the OpenFFBoard web UI to stay within range.
          </div>
        </div>

      </div>

      <!-- Common encoder reference table -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">Common Encoder Reference — Incremental (Quadrature)</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Encoder</th>
              <th>Base PPR</th>
              <th>×4 CPR</th>
              <th>Cnt/° (direct-drive, 900°)</th>
              <th>Typical Use</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enc in ENCODERS" :key="enc.name">
              <td>{{ enc.name }}</td>
              <td>{{ enc.ppr.toLocaleString() }}</td>
              <td>{{ (enc.ppr * 4).toLocaleString() }}</td>
              <td class="highlight-cell">{{ (enc.ppr * 4 / 360).toFixed(1) }}</td>
              <td>{{ enc.use }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Absolute encoder reference table -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">OpenFFBoard Supported Absolute Encoders</p>
        <div class="info-box" style="margin-bottom:16px;">
          For absolute encoders, enter the <em>Positions/Rev</em> as the PPR and set the
          Quadrature Multiplier to <strong>×1 — No multiplier</strong>. Absolute encoders
          report position directly — there is no quadrature decoding step.
          For the full up-to-date list, see the
          <a href="https://github.com/Ultrawipf/OpenFFBoard/wiki" target="_blank" rel="noopener">OpenFFBoard wiki</a>.
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Encoder</th>
              <th>Interface</th>
              <th>Bits</th>
              <th>Positions / Rev</th>
              <th>Cnt/° (direct-drive)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="enc in ABS_ENCODERS" :key="enc.name">
              <td>{{ enc.name }}</td>
              <td><code>{{ enc.iface }}</code></td>
              <td>{{ enc.bits ? enc.bits + '-bit' : '—' }}</td>
              <td>{{ enc.positions ? enc.positions.toLocaleString() : '—' }}</td>
              <td class="highlight-cell">{{ enc.positions ? (enc.positions / 360).toFixed(1) : '—' }}</td>
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

// Source: https://github.com/Ultrawipf/OpenFFBoard/wiki (Supported encoders section)
const ABS_ENCODERS = [
  { name: 'BISS-C (any compatible)',  iface: 'SPI + adapter', bits: null,  positions: null  },
  { name: 'MagnTek MT6825',           iface: 'SPI + ABZ',     bits: null,  positions: null  },
  { name: 'MagnTek MT6835',           iface: 'SPI + ABZ',     bits: null,  positions: null  },
  { name: 'SSI (any compatible)',     iface: 'SPI',           bits: null,  positions: null  },
]

const ENCODERS = [
  { name: 'CUI AMT102-V (cheap, popular)',   ppr:  2048, use: 'Hobby / entry-level DD' },
  { name: 'Bourns EMS22A (absolute)',         ppr:  1024, use: 'Compact / single-turn abs' },
  { name: 'US Digital E6 (optical)',          ppr:  2500, use: 'Mid-range incremental' },
  { name: 'Renishaw RM44 (magnetic)',         ppr:  5000, use: 'Mid-high resolution' },
  { name: 'Heidenhain ERN 1020 (optical)',    ppr: 10000, use: 'High-end DD base' },
  { name: 'Generic 600-ppr disc',             ppr:   600, use: 'Low-cost prototype' },
  { name: 'OMRON E6B2-CWZ1X 10000P',         ppr: 10000, use: 'Industrial, high-res' },
]

const inputs = reactive({ ppr: 2000, quadrature: 4, gearRatio: 1, steeringRange: 900 })

const r = computed(() => {
  const { ppr, quadrature, gearRatio, steeringRange } = inputs
  const totalCpr = ppr * quadrature * gearRatio
  const cpd = totalCpr / 360
  const dpc = cpd > 0 ? 360 / totalCpr : 0
  const rangeCnt = cpd * steeringRange
  return { totalCpr, cpd, dpc, rangeCnt }
})

const badge = computed(() => {
  const cpd = r.value.cpd
  if (cpd <= 0)  return { type: 'warn', text: 'Enter valid inputs' }
  if (cpd < 5)   return { type: 'bad',  text: 'Marginal — may feel stepped' }
  if (cpd < 20)  return { type: 'warn', text: 'Acceptable resolution' }
  if (cpd < 100) return { type: 'ok',   text: 'Good resolution' }
  return               { type: 'ok',   text: 'Excellent resolution' }
})

const steps = computed(() => {
  const { ppr, quadrature, gearRatio, steeringRange } = inputs
  const { totalCpr, cpd, dpc, rangeCnt } = r.value
  return [
    {
      formula: 'Total CPR = PPR × Quadrature × Gear Ratio',
      substitution: `${ppr.toLocaleString()} × ${quadrature} × ${gearRatio}`,
      result: `${Math.round(totalCpr).toLocaleString()} counts/revolution`,
    },
    {
      formula: 'Counts per Degree = Total CPR ÷ 360°',
      substitution: `${Math.round(totalCpr).toLocaleString()} ÷ 360`,
      result: `${cpd.toFixed(2)} cnt/°`,
    },
    {
      formula: 'Degrees per Count = 360° ÷ Total CPR',
      substitution: `360 ÷ ${Math.round(totalCpr).toLocaleString()}`,
      result: `${dpc.toFixed(4)} °/cnt`,
    },
    {
      formula: 'Total Range Counts = Counts per Degree × Steering Range',
      substitution: `${cpd.toFixed(2)} × ${steeringRange}°`,
      result: `${Math.round(rangeCnt).toLocaleString()} counts`,
    },
  ]
})
</script>
