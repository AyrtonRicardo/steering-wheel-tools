<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; All Tools</RouterLink>
        <h1 class="tool-page-title">FFB Torque &amp; Force Calculator</h1>
        <p class="tool-page-desc">
          Convert motor peak torque into the force you'll feel at the wheel rim, estimate
          peak power draw, and calculate minimum power supply requirements for your OpenFFBoard build.
        </p>
      </div>

      <div class="tool-layout">

        <!-- Inputs -->
        <div class="panel">
          <p class="panel-title">Motor &amp; Wheel Setup</p>

          <div class="field">
            <label for="peak-torque">Motor Peak Torque (Nm)</label>
            <input id="peak-torque" name="peak-torque" type="number" v-model.number="inputs.peakTorque" min="0.1" step="0.1" />
            <p class="hint">Use the motor's continuous stall torque for a safe estimate; peak for worst-case.</p>
          </div>

          <div class="field">
            <label for="efficiency">Drive Efficiency (%)</label>
            <input id="efficiency" name="efficiency" type="number" v-model.number="inputs.efficiency" min="1" max="100" step="1" />
            <p class="hint">Direct-drive ≈ 95–98 %. Belt / gear drive ≈ 85–92 %.</p>
          </div>

          <div class="field">
            <label for="wheel-diameter">Wheel Diameter (mm)</label>
            <input id="wheel-diameter" name="wheel-diameter" type="number" v-model.number="inputs.wheelDiameter" min="10" step="1" />
            <p class="hint">Measure rim OD or check your wheel spec (common: 280–350 mm).</p>
          </div>

          <div class="divider"></div>
          <p class="panel-title">Electrical</p>

          <div class="field-row">
            <div class="field">
              <label for="supply-voltage">Supply Voltage (V)</label>
              <input id="supply-voltage" name="supply-voltage" type="number" v-model.number="inputs.supplyVoltage" min="1" step="1" />
            </div>
            <div class="field">
              <label for="motor-kv">
                Motor Kv (rpm/V)
                <span class="field-help">
                  ?
                  <span class="field-help-tooltip">
                    <strong>Kv (rpm/V)</strong> on datasheet → enter directly.<br>
                    <strong>Voltage constant (V/krpm)</strong> on datasheet → enter <code>1000 / value</code>
                    <template v-if="inputs.motorKv > 0"> (your Kv = {{ (1000 / inputs.motorKv).toFixed(1) }} V/krpm)</template>.<br>
                    Leave 0 to skip back-EMF estimate.
                  </span>
                </span>
              </label>
              <input id="motor-kv" name="motor-kv" type="number" v-model.number="inputs.motorKv" min="0" step="1" />
              <label for="motor-kv-per-phase" class="checkbox-label" :class="{ disabled: inputs.motorKv === 0 }">
                <input id="motor-kv-per-phase" name="motor-kv-per-phase" type="checkbox" v-model="inputs.motorKvPerPhase" :disabled="inputs.motorKv === 0" />
                Kv is per-phase (divide by √3)
                <span class="field-help">
                  ?
                  <span class="field-help-tooltip">
                    <strong>Leave unchecked</strong> for most motors — hobby BLDC, RC motors, and motors with Kv tested via a DC bus or battery. This is the default convention.<br><br>
                    <strong>Check this</strong> if your datasheet explicitly states the Kv or back-EMF constant is measured <em>per phase</em> (phase-to-neutral). Rare — mainly found in academic or some industrial servo specs.<br><br>
                    Not sure? If the calculated no-load RPM looks ~1.73× too high compared to the motor's spec sheet, check this box.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div class="field">
            <label for="motor-resistance">Phase Resistance R<sub>ph</sub> (Ω) — optional</label>
            <input id="motor-resistance" name="motor-resistance" type="number" v-model.number="inputs.motorResistance" min="0" step="0.01" />
            <p class="hint">Used to estimate copper losses. Leave 0 to skip.</p>
          </div>

          <div class="field">
            <label for="motor-kt">Motor Kt — Torque Constant (Nm/A)</label>
            <input id="motor-kt" name="motor-kt" type="number" v-model.number="inputs.motorKt" min="0" step="0.001" />
            <p v-if="inputs.motorKt === 0 && derivedKt > 0" class="hint hint-derived">
              Derived from Kv: Kt = 60 / (2π × {{ inputs.motorKv }}) = <strong>{{ derivedKt.toFixed(4) }} Nm/A</strong>
            </p>
            <p v-else class="hint">
              From datasheet. If unknown, enter 0 — Kt will be derived from Kv if provided,
              otherwise current is estimated from voltage and resistance.
            </p>
          </div>

          <div class="divider"></div>

          <div class="field">
            <label for="ref-rpm">
              Reference Speed — <strong>{{ inputs.refRpm }} RPM</strong>
            </label>
            <input id="ref-rpm" name="ref-rpm" type="range" v-model.number="inputs.refRpm" min="10" :max="sliderMax" step="10" class="slider" :style="sliderFillStyle" />
            <div class="slider-ticks">
              <span>10</span>
              <span>{{ Math.round(sliderMax / 2) }}</span>
              <span>{{ sliderMax }} RPM</span>
            </div>
            <p class="hint">Speed at which back-EMF derating is evaluated. ~200 RPM ≈ fast lock-to-lock steering input.<span v-if="r.noLoadRpm > 0"> Max set to no-load speed ({{ r.noLoadRpm.toLocaleString() }} RPM).</span></p>
          </div>
        </div>

        <!-- Results -->
        <div class="panel">
          <p class="panel-title">Results</p>

          <div class="result-grid">
            <div class="result-card highlight">
              <p class="result-label">Force at Rim</p>
              <p class="result-value">{{ r.rimForce.toFixed(1) }}<span class="result-unit">N</span></p>
              <p class="result-note">≈ {{ r.rimForceKgf.toFixed(2) }} kgf</p>
            </div>
            <div class="result-card">
              <p class="result-label">Effective Torque</p>
              <p class="result-value">{{ r.effTorque.toFixed(2) }}<span class="result-unit">Nm</span></p>
              <p class="result-note">after drive losses</p>
            </div>
          </div>

          <div class="result-grid">
            <div class="result-card">
              <p class="result-label">Peak Current (est.)</p>
              <p class="result-value">
                {{ r.peakCurrent > 0 ? r.peakCurrent.toFixed(1) : '—' }}<span class="result-unit">A</span>
              </p>
            </div>
            <div class="result-card">
              <p class="result-label">Peak Power Draw</p>
              <p class="result-value">{{ r.peakPower.toFixed(0) }}<span class="result-unit">W</span></p>
            </div>
          </div>

          <div class="result-grid single">
            <div class="result-card">
              <p class="result-label">Min. PSU Rating (×1.3 headroom)</p>
              <p class="result-value">{{ r.psuRating.toFixed(0) }}<span class="result-unit">W</span></p>
              <p class="result-note">{{ inputs.supplyVoltage }}V {{ r.psuAmps }}A</p>
            </div>
          </div>

          <div v-if="r.noLoadRpm > 0" class="result-grid">
            <div class="result-card">
              <p class="result-label">No-load Speed</p>
              <p class="result-sub">Theoretical maximum RPM — zero torque</p>
              <p class="result-value">{{ r.noLoadRpm.toLocaleString() }}<span class="result-unit">RPM</span></p>
              <p class="result-note">back-EMF = supply voltage at this speed</p>
            </div>
            <div v-if="r.torqueAtRefSpeed !== null" class="result-card">
              <p class="result-label">Torque at {{ inputs.refRpm }} RPM (est.)</p>
              <p class="result-value">{{ r.torqueAtRefSpeed.toFixed(2) }}<span class="result-unit">Nm</span></p>
              <p class="result-note">after back-EMF derating</p>
            </div>
          </div>

          <StatusBadge :type="badge.type" :text="badge.text" />

          <div class="divider"></div>

          <p class="panel-title">Feel Guide</p>
          <table class="data-table">
            <thead>
              <tr><th>Force at Rim</th><th>Feel</th></tr>
            </thead>
            <tbody>
              <tr><td>&lt; 5 N (&lt; 0.5 kgf)</td><td>Very light — game-pad level feel</td></tr>
              <tr><td>5 – 20 N (0.5 – 2 kgf)</td><td>Light — entry-level direct drive</td></tr>
              <tr><td>20 – 60 N (2 – 6 kgf)</td><td>Strong — competitive sim racing</td></tr>
              <tr><td>60 – 120 N (6 – 12 kgf)</td><td>Very strong — high-end DD class</td></tr>
              <tr><td>&gt; 120 N (&gt; 12 kgf)</td><td>Extreme — ensure safe operation!</td></tr>
            </tbody>
          </table>

          <div class="info-box">
            <strong>Safety note:</strong> Peak values occur only during sharp FFB events.
            Size your PSU for <strong>continuous</strong> draw (≈ 30–40 % of peak) but
            ensure it can handle the instantaneous peak without voltage sag.
          </div>
        </div>

        <!-- Calculation breakdown -->
        <div class="panel breakdown-panel">
          <CalcBreakdown :steps="steps" />
        </div>

      </div>

      <!-- Motor comparison -->
      <div class="panel" style="margin-top:24px;">
        <p class="panel-title">Common Motor Reference</p>
        <table class="data-table">
          <thead>
            <tr>
              <th>Motor</th>
              <th>Type</th>
              <th>Peak Torque</th>
              <th>Typical Voltage</th>
              <th>Force @ {{ inputs.wheelDiameter }} mm rim</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in MOTORS" :key="m.name">
              <td>{{ m.name }}</td>
              <td>{{ m.type }}</td>
              <td>{{ m.torque }} Nm</td>
              <td>{{ m.voltage }} V</td>
              <td class="highlight-cell">{{ motorRimForce(m) }} N ({{ motorRimForceKgf(m) }} kgf)</td>
              <td>{{ m.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </main>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import CalcBreakdown from '../components/CalcBreakdown.vue'

const MOTORS = [
  // OpenFFBoard / 48 V builds
  { name: 'Mige 130ST-M15015 ★', type: 'AC Servo', torque: 30, voltage: 48,  notes: 'Recommended — 15 Nm rated, 30 Nm peak; agile and responsive' },
  { name: 'Mige 130ST-M10010',   type: 'AC Servo', torque: 20, voltage: 48,  notes: 'Recommended — 10 Nm rated, 20 Nm peak; great overall balance' },
  { name: 'Mige 80ST-M04025',    type: 'AC Servo', torque: 12, voltage: 48,  notes: 'Entry-level Mige — 4 Nm rated, ~12 Nm peak; low inertia, lively feel; budget-friendly starting point' },
  { name: 'Lenze MCS 14F',       type: 'AC Servo', torque: 12, voltage: 48,  notes: 'Industrial servo.' },
  // SimuCUBE / OSW / high-voltage builds (~320 V DC bus)
  { name: 'Kollmorgen AKM52G',   type: 'AC Servo', torque: 22, voltage: 48, notes: 'OSW / SimuCUBE standard — very low cogging, high encoder resolution; typically sourced used/surplus' },
  { name: 'Kollmorgen AKM53G',   type: 'AC Servo', torque: 30, voltage: 48, notes: 'OSW / SimuCUBE high-torque variant — same refinement as AKM52G with ~30 Nm peak; harder to source' },
  { name: 'Lenze MCS12H15L',     type: 'AC Servo', torque: 29, voltage: 48, notes: 'High-end OSW build — 29 Nm peak, EnDat absolute encoder; use "L" winding variant with SimuCUBE/Argon' },
]

const inputs = reactive({
  peakTorque: 20, // Default from Mige 130ST-M10010 datasheet
  efficiency: 95, // Direct drive.
  wheelDiameter: 320, // My sim racing wheel size.
  supplyVoltage: 48, // Common for FFB motors, and matches Mige 130ST series.
  motorKv: 7.1, // Based on Mige catalogue Kv for Mige 130ST-M10010
  motorKvPerPhase: false,
  motorResistance: 2.7,
  motorKt: 2.2,
  refRpm: 200,
})

// When Kv is given per-phase, divide by √3 to get the DC-bus-referenced value
const effectiveKv = computed(() => {
  if (inputs.motorKv <= 0) return 0
  return inputs.motorKvPerPhase ? inputs.motorKv / Math.sqrt(3) : inputs.motorKv
})

// K_T = 60 / (2π × Kv(rpm/V))  — Wikipedia: Motor Constants
const derivedKt = computed(() =>
  effectiveKv.value > 0 ? 60 / (2 * Math.PI * effectiveKv.value) : 0
)

const r = computed(() => {
  const { peakTorque, efficiency, wheelDiameter, supplyVoltage, motorResistance, motorKt } = inputs
  const kv = effectiveKv.value
  const effectiveKt = motorKt > 0 ? motorKt : derivedKt.value
  const ktWasDerived = motorKt === 0 && derivedKt.value > 0

  const effTorque = peakTorque * (efficiency / 100)
  const radius = (wheelDiameter / 1000) / 2
  const rimForce = radius > 0 ? effTorque / radius : 0
  const rimForceKgf = rimForce / 9.81

  let peakCurrent = 0
  let currentMethod = 'fallback'
  if (effectiveKt > 0) {
    peakCurrent = peakTorque / effectiveKt
    currentMethod = ktWasDerived ? 'kt-derived' : 'kt'
  } else if (motorResistance > 0 && supplyVoltage > 0) {
    peakCurrent = supplyVoltage / motorResistance
    currentMethod = 'resistance'
  } else if (supplyVoltage > 0) {
    peakCurrent = (peakTorque * 10) / supplyVoltage
    currentMethod = 'fallback'
  }

  const peakPower = (peakCurrent > 0 && motorResistance > 0)
    ? peakCurrent ** 2 * motorResistance
    : peakCurrent > 0 ? peakCurrent * supplyVoltage : peakTorque * 15
  const psuRating = peakPower * 1.3
  const psuAmps = supplyVoltage > 0 ? Math.ceil(psuRating / supplyVoltage / 5) * 5 : 0

  // Back-EMF
  const noLoadRpm = kv > 0 ? Math.round(kv * supplyVoltage) : 0
  const bemfAtRefSpeed = kv > 0 ? inputs.refRpm / kv : 0
  const netVoltageAtRefSpeed = kv > 0 ? Math.max(0, supplyVoltage - bemfAtRefSpeed) : 0
  const torqueAtRefSpeed = (kv > 0 && effectiveKt > 0 && motorResistance > 0)
    ? (netVoltageAtRefSpeed / motorResistance) * effectiveKt
    : null

  return { effTorque, radius, rimForce, rimForceKgf, peakCurrent, peakPower, psuRating, psuAmps, currentMethod, effectiveKt, ktWasDerived, kv, noLoadRpm, bemfAtRefSpeed, netVoltageAtRefSpeed, torqueAtRefSpeed }
})

const badge = computed(() => {
  const f = r.value.rimForce
  if (f < 5)   return { type: 'warn', text: 'Very light — game-pad level feel' }
  if (f < 20)  return { type: 'warn', text: 'Light — entry-level direct drive' }
  if (f < 60)  return { type: 'ok',   text: 'Strong — competitive sim racing' }
  if (f < 120) return { type: 'ok',   text: 'Very strong — high-end DD class' }
  return             { type: 'warn', text: 'Extreme — ensure safe operation!' }
})

const sliderMax = computed(() => r.value.noLoadRpm > 0 ? r.value.noLoadRpm : 600)

const sliderFillStyle = computed(() => {
  const pct = ((inputs.refRpm - 10) / (sliderMax.value - 10)) * 100
  return { background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)` }
})

watch(sliderMax, (max) => {
  if (inputs.refRpm > max) inputs.refRpm = max
})

const steps = computed(() => {
  const { peakTorque, efficiency, wheelDiameter, supplyVoltage, motorResistance, motorKv, motorKvPerPhase } = inputs
  const { effTorque, radius, rimForce, rimForceKgf, peakCurrent, peakPower, psuRating, currentMethod, effectiveKt, ktWasDerived, kv, noLoadRpm, bemfAtRefSpeed, netVoltageAtRefSpeed, torqueAtRefSpeed } = r.value

  const kvConversionStep = (motorKvPerPhase && motorKv > 0) ? [{
    formula: 'Effective Kv = Kv_phase / √3  [per-phase → DC bus]',
    substitution: `${motorKv} / √3`,
    result: `${kv.toFixed(3)} rpm/V`,
  }] : []

  const derivedKtStep = ktWasDerived ? [{
    formula: 'Kt derived from Kv: Kt = 60 / (2π × Kv)',
    substitution: `60 / (2π × ${kv.toFixed(3)})`,
    result: `${effectiveKt.toFixed(4)} Nm/A`,
  }] : []

  const currentStep = (currentMethod === 'kt' || currentMethod === 'kt-derived')
    ? {
        formula: 'Peak Current = Peak Torque ÷ Kt',
        substitution: `${peakTorque} ÷ ${effectiveKt.toFixed(4)}`,
        result: `${peakCurrent.toFixed(1)} A  [via Kt${ktWasDerived ? ', derived' : ''}]`,
      }
    : currentMethod === 'resistance'
    ? {
        formula: 'Peak Current = Supply Voltage ÷ Phase Resistance  [stall / locked-rotor condition]',
        substitution: `${supplyVoltage} V ÷ ${motorResistance} Ω`,
        result: `${peakCurrent.toFixed(1)} A  [worst-case stall current]`,
      }
    : {
        formula: 'Peak Current ≈ (Peak Torque × 10) ÷ Supply Voltage  [rough estimate]',
        substitution: `(${peakTorque} × 10) ÷ ${supplyVoltage}`,
        result: `${peakCurrent.toFixed(1)} A  [estimated]`,
      }

  return [
    {
      formula: 'Effective Torque = Peak Torque × (Efficiency ÷ 100)',
      substitution: `${peakTorque} × (${efficiency} ÷ 100)`,
      result: `${effTorque.toFixed(2)} Nm`,
    },
    {
      formula: 'Wheel Radius = Diameter ÷ 2 ÷ 1000',
      substitution: `${wheelDiameter} ÷ 2 ÷ 1000`,
      result: `${radius.toFixed(3)} m`,
    },
    {
      formula: 'Rim Force = Effective Torque ÷ Wheel Radius',
      substitution: `${effTorque.toFixed(2)} Nm ÷ ${radius.toFixed(3)} m`,
      result: `${rimForce.toFixed(1)} N  (${rimForceKgf.toFixed(2)} kgf)`,
    },
    ...kvConversionStep,
    ...derivedKtStep,
    currentStep,
    {
      formula: motorResistance > 0
        ? 'Peak Power (copper losses) = I² × R_ph'
        : 'Peak Power = Peak Current × Supply Voltage  [R_ph not set]',
      substitution: motorResistance > 0
        ? `${peakCurrent.toFixed(1)}² × ${motorResistance} Ω`
        : `${peakCurrent.toFixed(1)} A × ${supplyVoltage} V`,
      result: `${peakPower.toFixed(0)} W`,
    },
    {
      formula: 'Min PSU Rating = Peak Power × 1.3  (30% headroom)',
      substitution: `${peakPower.toFixed(0)} W × 1.3`,
      result: `${psuRating.toFixed(0)} W`,
    },
    ...(motorKv > 0 ? [
      {
        formula: 'No-load Speed = Kv × Supply Voltage',
        substitution: `${kv.toFixed(3)} rpm/V × ${supplyVoltage} V`,
        result: `${noLoadRpm.toLocaleString()} RPM — torque drops to zero at this speed`,
      },
      {
        formula: `Back-EMF at ${inputs.refRpm} RPM = RPM ÷ Kv`,
        substitution: `${inputs.refRpm} ÷ ${kv.toFixed(3)}`,
        result: `${bemfAtRefSpeed.toFixed(2)} V`,
      },
      {
        formula: `Net Voltage at ${inputs.refRpm} RPM = Supply Voltage − Back-EMF`,
        substitution: `${supplyVoltage} V − ${bemfAtRefSpeed.toFixed(2)} V`,
        result: `${netVoltageAtRefSpeed.toFixed(2)} V`,
      },
      ...(torqueAtRefSpeed !== null ? [{
        formula: `Torque at ${inputs.refRpm} RPM = (Net Voltage ÷ R_ph) × Kt`,
        substitution: `(${netVoltageAtRefSpeed.toFixed(2)} V ÷ ${motorResistance} Ω) × ${effectiveKt.toFixed(4)} Nm/A`,
        result: `${torqueAtRefSpeed.toFixed(2)} Nm`,
      }] : []),
    ] : []),
  ]
})

function motorRimForce(m) {
  const radius = (inputs.wheelDiameter / 1000) / 2
  return (m.torque * 0.95 / radius).toFixed(1)
}
function motorRimForceKgf(m) {
  return (parseFloat(motorRimForce(m)) / 9.81).toFixed(1)
}
</script>

<style scoped>
.field-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 15px;
  height: 15px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--border);
  color: var(--text-dim);
  font-size: 10px;
  font-weight: 700;
  cursor: default;
  vertical-align: middle;
  user-select: none;
}

.field-help:hover {
  background: var(--accent);
  color: var(--bg-primary);
}

.field-help-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 10;
  width: 260px;
  padding: 10px 12px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--text-secondary);
  line-height: 1.6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}

.field-help:hover .field-help-tooltip {
  display: block;
}

.field-help-tooltip code {
  background: var(--bg-primary);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.checkbox-label.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.checkbox-label input[type="checkbox"] {
  accent-color: var(--accent);
  cursor: pointer;
  width: 13px;
  height: 13px;
}

/* Reference speed slider */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  outline: none;
  margin-top: 10px;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  cursor: pointer;
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--text-dim);
}

/* Strip the internal top separator — the panel border replaces it */
.breakdown-panel :deep(.breakdown) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>
