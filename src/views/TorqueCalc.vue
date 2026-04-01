<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; All Tools</RouterLink>
        <h1 class="tool-page-title">&#9889; FFB Torque &amp; Force Calculator</h1>
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
            <label>Motor Peak Torque (Nm)</label>
            <input type="number" v-model.number="inputs.peakTorque" min="0.1" step="0.1" />
            <p class="hint">Use the motor's continuous stall torque for a safe estimate; peak for worst-case.</p>
          </div>

          <div class="field">
            <label>Drive Efficiency (%)</label>
            <input type="number" v-model.number="inputs.efficiency" min="1" max="100" step="1" />
            <p class="hint">Direct-drive ≈ 95–98 %. Belt / gear drive ≈ 85–92 %.</p>
          </div>

          <div class="field">
            <label>Wheel Diameter (mm)</label>
            <input type="number" v-model.number="inputs.wheelDiameter" min="10" step="1" />
            <p class="hint">Measure rim OD or check your wheel spec (common: 280–350 mm).</p>
          </div>

          <div class="divider"></div>
          <p class="panel-title">Electrical</p>

          <div class="field-row">
            <div class="field">
              <label>Supply Voltage (V)</label>
              <input type="number" v-model.number="inputs.supplyVoltage" min="1" step="1" />
            </div>
            <div class="field">
              <label>Motor Kv (rpm/V)</label>
              <input type="number" v-model.number="inputs.motorKv" min="0" step="1" />
              <p class="hint">Leave 0 to skip back-EMF estimate.</p>
            </div>
          </div>

          <div class="field">
            <label>Phase Resistance R<sub>ph</sub> (Ω) — optional</label>
            <input type="number" v-model.number="inputs.motorResistance" min="0" step="0.01" />
            <p class="hint">Used to estimate copper losses. Leave 0 to skip.</p>
          </div>

          <div class="field">
            <label>Motor Kt — Torque Constant (Nm/A)</label>
            <input type="number" v-model.number="inputs.motorKt" min="0" step="0.001" />
            <p class="hint">
              From datasheet. If unknown, enter 0 — current will be estimated from
              voltage and resistance only.
            </p>
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
              <p class="result-value">{{ r.noLoadRpm.toLocaleString() }}<span class="result-unit">RPM</span></p>
              <p class="result-note">back-EMF = supply voltage at this speed</p>
            </div>
            <div v-if="r.torqueAtRefSpeed !== null" class="result-card">
              <p class="result-label">Torque at {{ REF_RPM }} RPM (est.)</p>
              <p class="result-value">{{ r.torqueAtRefSpeed.toFixed(2) }}<span class="result-unit">Nm</span></p>
              <p class="result-note">after back-EMF derating</p>
            </div>
          </div>

          <StatusBadge :type="badge.type" :text="badge.text" />

          <!-- Calculation breakdown -->
          <CalcBreakdown :steps="steps" />

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
import { reactive, computed } from 'vue'
import StatusBadge from '../components/StatusBadge.vue'
import CalcBreakdown from '../components/CalcBreakdown.vue'

const MOTORS = [
  { name: 'Mige 130ST-M15015 ★', type: 'AC Servo', torque: 30,  voltage: 48, notes: 'Recommended — 15 Nm rated, 30 Nm peak; agility and quick responses' },
  { name: 'Mige 130ST-M10010',   type: 'AC Servo', torque: 20,  voltage: 48, notes: 'Recommended — 10 Nm rated, 20 Nm peak; great overall performance' },
  { name: 'Lenze MCS 14F',       type: 'Servo',    torque: 12,  voltage: 48,  notes: 'Industrial servo, popular DIY' },
]

const REF_RPM = 90 // reference steering speed for back-EMF derating (approx. fast steering input)

const inputs = reactive({
  peakTorque: 5,
  efficiency: 90,
  wheelDiameter: 320,
  supplyVoltage: 48,
  motorKv: 0,
  motorResistance: 0,
  motorKt: 0,
})

const r = computed(() => {
  const { peakTorque, efficiency, wheelDiameter, supplyVoltage, motorResistance, motorKt, motorKv } = inputs
  const effTorque = peakTorque * (efficiency / 100)
  const radius = (wheelDiameter / 1000) / 2
  const rimForce = radius > 0 ? effTorque / radius : 0
  const rimForceKgf = rimForce / 9.81

  let peakCurrent = 0
  let currentMethod = 'fallback'
  if (motorKt > 0) {
    peakCurrent = peakTorque / motorKt
    currentMethod = 'kt'
  } else if (motorResistance > 0 && supplyVoltage > 0) {
    peakCurrent = supplyVoltage / motorResistance
    currentMethod = 'resistance'
  } else if (supplyVoltage > 0) {
    peakCurrent = (peakTorque * 10) / supplyVoltage
    currentMethod = 'fallback'
  }

  const peakPower = peakCurrent > 0 ? peakCurrent * supplyVoltage : peakTorque * 15
  const psuRating = peakPower * 1.3
  const psuAmps = supplyVoltage > 0 ? Math.ceil(psuRating / supplyVoltage) : 0

  // Back-EMF
  const noLoadRpm = motorKv > 0 ? Math.round(motorKv * supplyVoltage) : 0
  const bemfAtRefSpeed = motorKv > 0 ? REF_RPM / motorKv : 0
  const netVoltageAtRefSpeed = motorKv > 0 ? Math.max(0, supplyVoltage - bemfAtRefSpeed) : 0
  const torqueAtRefSpeed = (motorKv > 0 && motorKt > 0 && motorResistance > 0)
    ? (netVoltageAtRefSpeed / motorResistance) * motorKt
    : null

  return { effTorque, radius, rimForce, rimForceKgf, peakCurrent, peakPower, psuRating, psuAmps, currentMethod, noLoadRpm, bemfAtRefSpeed, netVoltageAtRefSpeed, torqueAtRefSpeed }
})

const badge = computed(() => {
  const f = r.value.rimForce
  if (f < 5)   return { type: 'warn', text: 'Very light — game-pad level feel' }
  if (f < 20)  return { type: 'warn', text: 'Light — entry-level direct drive' }
  if (f < 60)  return { type: 'ok',   text: 'Strong — competitive sim racing' }
  if (f < 120) return { type: 'ok',   text: 'Very strong — high-end DD class' }
  return             { type: 'warn', text: 'Extreme — ensure safe operation!' }
})

const steps = computed(() => {
  const { peakTorque, efficiency, wheelDiameter, supplyVoltage, motorKt, motorResistance, motorKv } = inputs
  const { effTorque, radius, rimForce, rimForceKgf, peakCurrent, peakPower, psuRating, currentMethod, noLoadRpm, bemfAtRefSpeed, netVoltageAtRefSpeed, torqueAtRefSpeed } = r.value

  const currentStep = currentMethod === 'kt'
    ? {
        formula: 'Peak Current = Peak Torque ÷ Torque Constant (Kt)',
        substitution: `${peakTorque} ÷ ${motorKt}`,
        result: `${peakCurrent.toFixed(1)} A  [via Kt]`,
      }
    : currentMethod === 'resistance'
    ? {
        formula: 'Peak Current = Supply Voltage ÷ Phase Resistance',
        substitution: `${supplyVoltage} V ÷ ${motorResistance} Ω`,
        result: `${peakCurrent.toFixed(1)} A  [via R_ph]`,
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
    currentStep,
    {
      formula: 'Peak Power = Peak Current × Supply Voltage',
      substitution: `${peakCurrent.toFixed(1)} A × ${supplyVoltage} V`,
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
        substitution: `${motorKv} rpm/V × ${supplyVoltage} V`,
        result: `${noLoadRpm.toLocaleString()} RPM — torque drops to zero at this speed`,
      },
      {
        formula: `Back-EMF at ${REF_RPM} RPM = RPM ÷ Kv`,
        substitution: `${REF_RPM} ÷ ${motorKv}`,
        result: `${bemfAtRefSpeed.toFixed(2)} V`,
      },
      {
        formula: `Net Voltage at ${REF_RPM} RPM = Supply Voltage − Back-EMF`,
        substitution: `${supplyVoltage} V − ${bemfAtRefSpeed.toFixed(2)} V`,
        result: `${netVoltageAtRefSpeed.toFixed(2)} V`,
      },
      ...(torqueAtRefSpeed !== null ? [{
        formula: `Torque at ${REF_RPM} RPM = (Net Voltage ÷ R_ph) × Kt`,
        substitution: `(${netVoltageAtRefSpeed.toFixed(2)} V ÷ ${motorResistance} Ω) × ${motorKt} Nm/A`,
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
