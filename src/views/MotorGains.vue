<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/vesc-setup" class="back-link">&#8592; VESC Setup</RouterLink>
        <h1 class="tool-page-title">Motor Gains <span class="accent">Calculator</span></h1>
        <p class="tool-page-desc">
          Calculate the FOC current controller Kp and Ki gains for VESC from your motor's
          inductance, resistance, and desired torque slew rate.
        </p>
      </div>

      <div class="tool-layout">

        <!-- Inputs -->
        <div class="panel">
          <div class="panel-title">Motor Parameters</div>

          <div class="info-box" style="margin-bottom:20px;">
            <strong>Use VESC-detected values.</strong> Run the RL detection in VESC Tool first (Motor Settings → FOC → General → Measure R and L), then copy the R and L values it reports here. Do not use datasheet values — VESC measures your specific motor and wiring.
          </div>

          <div class="field">
            <label>Inductance L (mH)</label>
            <input type="number" v-model.number="L_mH" min="0.01" step="0.01" />
            <p class="hint">Reported by VESC Tool after RL detection</p>
          </div>

          <div class="field">
            <label>Resistance R (Ω)</label>
            <input type="number" v-model.number="R" min="0.01" step="0.01" />
            <p class="hint">Reported by VESC Tool after RL detection</p>
          </div>

          <div class="divider"></div>
          <div class="panel-title">Desired Response</div>

          <div class="field">
            <label>Max torque (Nm)</label>
            <input type="number" v-model.number="maxTorque" min="0.1" step="0.5" />
            <p class="hint">Peak torque your motor is rated or configured for</p>
          </div>

          <div class="field">
            <label>Slew rate (Nm/ms)</label>
            <input type="number" v-model.number="slewRate" min="0.1" step="0.1" />
            <p class="hint">How fast you want torque to ramp — higher = more responsive but noisier. Start at 10 Nm/ms.</p>
          </div>
        </div>

        <!-- Results -->
        <div class="panel">
          <div class="panel-title">Results — Enter in VESC Tool</div>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
            Motor Settings → FOC → General → Current Controller Gains
          </p>

          <div class="result-grid">
            <div class="result-card highlight">
              <div class="result-label">Kp (proportional)</div>
              <div class="result-value">{{ fmt(Kp) }}</div>
              <div class="result-note">= L / τ</div>
            </div>
            <div class="result-card highlight">
              <div class="result-label">Ki (integral)</div>
              <div class="result-value">{{ fmt(Ki) }}</div>
              <div class="result-note">= R / τ</div>
            </div>
            <div class="result-card">
              <div class="result-label">PI loop bandwidth</div>
              <div class="result-value">{{ Math.round(bandwidth_hz) }} <span class="result-unit">Hz</span></div>
              <div class="result-note">ωn / 2π</div>
            </div>
            <div class="result-card">
              <div class="result-label">Motor time constant</div>
              <div class="result-value">{{ (motor_tau * 1000).toFixed(2) }} <span class="result-unit">ms</span></div>
              <div class="result-note">L / R — natural motor pole</div>
            </div>
          </div>

          <div class="info-box">
            <strong>Guidance only.</strong> These values are calculated from idealized formulas and should be treated as a starting point. Verify behaviour on your specific hardware — reduce gains if the motor oscillates or makes noise.
          </div>
        </div>

        <!-- Step-by-step breakdown -->
        <div class="panel breakdown-panel">
          <CalcBreakdown :steps="breakdown" />
        </div>

      </div>
    </div>
  </main>
</template>

<style scoped>
.breakdown-panel :deep(.breakdown) {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}
</style>

<script setup>
import { ref, computed } from 'vue'
import CalcBreakdown from '../components/CalcBreakdown.vue'

const L_mH      = ref(2.45)
const R         = ref(0.73)
const maxTorque = ref(25)
const slewRate  = ref(10)

// ── Core calculations (matches motor-calculator.html reference) ────────────
const L = computed(() => L_mH.value * 1e-3)                              // H

const motor_tau = computed(() => L.value / R.value)                      // s

const riseTime  = computed(() =>                                          // ms
  (maxTorque.value * 0.63) / slewRate.value
)

const tau       = computed(() =>                                          // s
  riseTime.value / (2 * Math.PI) / 1000
)

const Kp        = computed(() => L.value / tau.value)
const Ki        = computed(() => R.value / tau.value)

const omega_n     = computed(() => 1 / tau.value)
const bandwidth_hz = computed(() => omega_n.value / (2 * Math.PI))

function fmt(v) {
  if (v >= 1000) return Math.round(v).toString()
  if (v >= 100)  return v.toFixed(1)
  if (v >= 10)   return v.toFixed(2)
  return v.toFixed(4)
}

// ── Breakdown steps ────────────────────────────────────────────────────────
const breakdown = computed(() => [
  {
    formula:      'L (H) = L_mH × 10⁻³',
    substitution: `${L_mH.value} mH × 10⁻³`,
    result:       `${L.value.toExponential(4)} H`,
  },
  {
    formula:      'τ_motor = L / R',
    substitution: `${L.value.toExponential(3)} H / ${R.value} Ω`,
    result:       `${(motor_tau.value * 1000).toFixed(2)} ms`,
  },
  {
    formula:      'riseTime = (maxTorque × 0.63) / slewRate',
    substitution: `(${maxTorque.value} Nm × 0.63) / ${slewRate.value} Nm/ms`,
    result:       `${riseTime.value.toFixed(3)} ms`,
  },
  {
    formula:      'τ = riseTime / (2π × 1000)',
    substitution: `${riseTime.value.toFixed(3)} ms / (2π × 1000)`,
    result:       `${(tau.value * 1000).toFixed(4)} ms`,
  },
  {
    formula:      'Kp = L / τ',
    substitution: `${L.value.toExponential(3)} H / ${tau.value.toExponential(4)} s`,
    result:       fmt(Kp.value),
  },
  {
    formula:      'Ki = R / τ',
    substitution: `${R.value} Ω / ${tau.value.toExponential(4)} s`,
    result:       fmt(Ki.value),
  },
  {
    formula:      'bandwidth = (1 / τ) / (2π)',
    substitution: `(1 / ${tau.value.toExponential(4)}) / 2π`,
    result:       `${Math.round(bandwidth_hz.value)} Hz`,
  },
])
</script>
