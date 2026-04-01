<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; Home</RouterLink>
        <h1 class="tool-page-title">TMC Setup <span class="accent">Wizard</span></h1>
        <p class="tool-page-desc">
          Step-by-step configuration guide for TMC4671 + TMC6100-based direct-drive force feedback.
          Check off each step as you complete it — progress is saved in your browser.
        </p>
      </div>

      <!-- Progress bar -->
      <div class="tmc-progress-wrap">
        <div class="tmc-progress-top">
          <span class="tmc-progress-label">Overall progress</span>
          <span class="tmc-progress-count">{{ completedCount }} / {{ totalSteps }} steps</span>
        </div>
        <div class="tmc-progress-track">
          <div class="tmc-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <Transition name="tmc-fade">
          <div v-if="allDone" class="tmc-all-done">
            <span class="status-badge status-ok">All steps complete — motor ready to drive!</span>
          </div>
        </Transition>
      </div>

      <!-- Sections -->
      <div class="tmc-sections">
        <div
          v-for="section in sections"
          :key="section.id"
          class="tmc-section"
          :class="{ 'tmc-section--done': isSectionDone(section) }"
        >
          <button class="tmc-section-header" @click="toggleSection(section.id)">
            <div class="tmc-section-left">
              <span class="tmc-section-icon">{{ section.icon }}</span>
              <span class="tmc-section-title">{{ section.title }}</span>
              <span v-if="isSectionDone(section)" class="status-badge status-ok" style="margin:0;padding:2px 10px;font-size:11px;">Done</span>
            </div>
            <div class="tmc-section-right">
              <span class="tmc-section-count">{{ sectionDoneCount(section) }}/{{ section.steps.length }}</span>
              <span class="tmc-chevron" :class="{ 'tmc-chevron--open': openSections.has(section.id) }">&#9660;</span>
            </div>
          </button>

          <Transition name="tmc-slide">
            <div v-if="openSections.has(section.id)" class="tmc-section-body">
              <div
                v-for="step in section.steps"
                :key="step.id"
                class="tmc-step"
                :class="{ 'tmc-step--done': completedSteps.has(step.id) }"
              >
                <label class="tmc-step-inner">
                  <input
                    type="checkbox"
                    class="tmc-hidden-check"
                    :checked="completedSteps.has(step.id)"
                    @change="toggleStep(step.id)"
                  />
                  <span class="tmc-check-box">
                    <span v-if="completedSteps.has(step.id)" class="tmc-check-mark">&#10003;</span>
                  </span>
                  <div class="tmc-step-content">
                    <div class="tmc-step-header">
                      <span class="tmc-step-num">{{ step.id }}</span>
                      <span class="tmc-step-title">{{ step.title }}</span>
                    </div>
                    <p class="tmc-step-desc">{{ step.desc }}</p>
                    <div v-if="step.warning" class="tmc-alert tmc-alert--warn">
                      <span class="tmc-alert-icon">&#9888;</span>
                      {{ step.warning }}
                    </div>
                    <div v-if="step.tip" class="tmc-alert tmc-alert--tip">
                      <span class="tmc-alert-icon">&#128161;</span>
                      {{ step.tip }}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="info-box" style="margin-top:32px;">
        <strong>Guidance only:</strong> These steps are a general reference for TMC4671 + TMC6100 based systems.
        Always verify register values, current limits, and encoder settings against your specific hardware datasheets and firmware documentation.
      </div>

      <div class="tmc-footer">
        <button class="btn btn-outline" @click="resetAll">Reset Progress</button>
      </div>

    </div>
  </main>
</template>

<script setup>
import { reactive, computed } from 'vue'

const STORAGE_KEY = 'tmc-setup-v1'

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
const completedSteps = reactive(new Set(saved))
const openSections   = reactive(new Set())

function toggleStep(id) {
  if (completedSteps.has(id)) completedSteps.delete(id)
  else completedSteps.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedSteps]))
}

function toggleSection(id) {
  if (openSections.has(id)) openSections.delete(id)
  else openSections.add(id)
}

function isSectionDone(section) {
  return section.steps.every(s => completedSteps.has(s.id))
}

function sectionDoneCount(section) {
  return section.steps.filter(s => completedSteps.has(s.id)).length
}

function resetAll() {
  completedSteps.clear()
  localStorage.removeItem(STORAGE_KEY)
}

const totalSteps     = computed(() => sections.reduce((n, s) => n + s.steps.length, 0))
const completedCount = computed(() => completedSteps.size)
const progressPct    = computed(() => totalSteps.value ? (completedCount.value / totalSteps.value) * 100 : 0)
const allDone        = computed(() => completedCount.value === totalSteps.value && totalSteps.value > 0)

// ── Step data ──────────────────────────────────────────
const sections = [
  {
    id: 'hardware',
    icon: '🔌',
    title: 'Hardware & Wiring',
    steps: [
      {
        id: 1,
        title: 'Verify power supply voltage and current rating',
        desc: 'The TMC6100 gate driver supports up to 60 V. Confirm your PSU voltage is within the rated range for both the TMC6100 VM rail and the 5 V / 3.3 V logic supply. Ensure adequate current capacity for motor peak draw.',
        warning: 'Exceeding the VM voltage rating will permanently damage the TMC6100. Check your specific board\'s rated maximum.',
      },
      {
        id: 2,
        title: 'Connect motor phases (U, V, W)',
        desc: 'Wire the three motor phases to the high-side / low-side FET outputs of the TMC6100. Secure all connections and check for shorts between phases and to ground before applying power.',
        warning: 'Never power the board with motor phases unconnected or shorted — this can destroy the gate driver FETs.',
      },
      {
        id: 3,
        title: 'Connect encoder or Hall sensors',
        desc: 'For FOC operation, the TMC4671 requires position feedback. Wire your ABN incremental encoder (A, B, N) or digital Hall sensors to the corresponding TMC4671 input pins. Confirm signal voltage levels match (3.3 V logic).',
        tip: 'For best FOC performance use an ABN encoder with at least 1000 CPR. Hall-sensor mode is available but gives coarser commutation.',
      },
      {
        id: 4,
        title: 'Connect SPI / UART interface to host MCU',
        desc: 'The TMC4671 and TMC6100 are configured over SPI. Connect MOSI, MISO, SCK, and separate CS lines for each chip to your host microcontroller (e.g. Teensy, STM32). Verify logic level compatibility.',
      },
    ],
  },
  {
    id: 'firmware',
    icon: '💾',
    title: 'Firmware & SPI Communication',
    steps: [
      {
        id: 5,
        title: 'Flash and boot host firmware',
        desc: 'Compile and flash the firmware for your host MCU (e.g. the open-source FFB firmware that targets TMC4671). Confirm the device enumerates over USB and the SPI bus is initialised without errors in the serial log.',
      },
      {
        id: 6,
        title: 'Verify SPI communication with TMC4671',
        desc: 'Read back the CHIPINFO register (address 0x00). The TMC4671 should return 0x34363731 ("4671"). A mismatch indicates wiring, level-shifting, or clock-polarity issues.',
        tip: 'Set SPI mode 3 (CPOL=1, CPHA=1) and keep SCK below 8 MHz during initial bring-up.',
      },
      {
        id: 7,
        title: 'Verify SPI communication with TMC6100',
        desc: 'Read back the TMC6100 IOIN register to confirm the gate driver is responding. Check FAULT and OTPW bits are clear before enabling the power stage.',
        warning: 'Do not enable the power stage (TMC6100 EN pin) until motor phases and encoder are fully wired and verified.',
      },
    ],
  },
  {
    id: 'encoder',
    icon: '📡',
    title: 'Encoder Calibration',
    steps: [
      {
        id: 8,
        title: 'Set encoder resolution (ABN_DECODER_MODE)',
        desc: 'Write the ABN encoder CPR (counts per revolution) value to the ABN_DECODER_PPR register. For example, for a 4096-CPR encoder write 4096. The TMC4671 uses this to correctly scale position and velocity.',
      },
      {
        id: 9,
        title: 'Run open-loop encoder alignment',
        desc: 'Perform the automatic encoder alignment routine provided by your firmware. The motor will rotate slowly in open-loop to determine the electrical offset between encoder zero and motor flux angle. Record the resulting PHI_E_OFFSET value.',
        warning: 'Ensure the motor shaft is free to rotate during alignment. The routine uses reduced current — do not touch the wheel.',
        tip: 'Run alignment multiple times and verify the offset is consistent (within ±5 counts) before proceeding.',
      },
      {
        id: 10,
        title: 'Verify commutation in open-loop',
        desc: 'Switch to open-loop FOC mode and command a low-speed rotation. Confirm the motor spins smoothly without stalling or reversing. Check that encoder count increments in the correct direction; swap any two motor phases to reverse if needed.',
      },
    ],
  },
  {
    id: 'foc',
    icon: '⚙️',
    title: 'FOC Current Loop Tuning',
    steps: [
      {
        id: 11,
        title: 'Measure motor resistance and inductance',
        desc: 'Use an LCR meter or the TMC4671\'s built-in resistance/inductance measurement routine to obtain the motor\'s per-phase resistance (R) and d/q-axis inductance (L). You will need these values to calculate current PI gains.',
      },
      {
        id: 12,
        title: 'Calculate and set current PI gains (Kp, Ki)',
        desc: 'Use your measured R and L values with the bandwidth formula: Kp = L × BW, Ki = R × BW, where BW is your target current-loop bandwidth in rad/s (typically 2000–5000 rad/s for FFB). Write the results to CURRENT_PI_TORQUE and CURRENT_PI_FLUX registers.',
        tip: 'Start with a conservative BW of 2000 rad/s. Increase if the torque response feels sluggish, watching for oscillation.',
      },
      {
        id: 13,
        title: 'Set motor current limits',
        desc: 'Write the peak torque-generating current (Iq_max) to the TMC4671 PID_TORQUE_FLUX_LIMITS register. Begin with 50 % of the motor\'s rated continuous current and increase only after verifying stable closed-loop operation.',
        warning: 'Exceeding the motor\'s rated current will cause overheating. Always verify thermal performance before raising limits.',
      },
      {
        id: 14,
        title: 'Enable closed-loop FOC and verify',
        desc: 'Switch to closed-loop torque mode (MODE_MOTION = TORQUE). Command a small torque setpoint and confirm the motor responds with smooth, quiet operation. Monitor actual vs. commanded current in your tuning tool.',
      },
    ],
  },
  {
    id: 'ffb',
    icon: '🎮',
    title: 'Force Feedback Integration',
    steps: [
      {
        id: 15,
        title: 'Configure USB HID / DirectInput interface',
        desc: 'Ensure the host firmware correctly exposes the steering wheel as a USB HID game controller with a force-feedback interface. Verify the device appears in your OS\'s game controller list with FFB capability.',
      },
      {
        id: 16,
        title: 'Test basic FFB effects in a sim',
        desc: 'Open a simulator (e.g. Assetto Corsa, iRacing) and run the in-game FFB test or drive a slow lap. Verify that spring, damper, and friction effects produce the expected torque response without oscillation or clipping.',
        tip: 'Start with overall FFB strength at 30–40 % and the sim\'s force at 50 % to avoid clipping before you have calibrated limits.',
      },
      {
        id: 17,
        title: 'Set software steering lock and end-stops',
        desc: 'Configure the maximum steering angle (e.g. 900°) in the firmware and enable soft end-stop force effects. Test that approaching the limit produces a firm but smooth resistance rather than a hard bang.',
        warning: 'Without properly tuned end-stops, the wheel can slam into the hard stop at full current — this is dangerous and can damage hardware.',
      },
      {
        id: 18,
        title: 'Fine-tune and stress test',
        desc: 'Drive for at least 30 minutes while monitoring motor and board temperatures. Confirm there is no thermal throttling or unexpected faults. Adjust FFB gains for your preferred feel and verify performance remains stable.',
      },
    ],
  },
]
</script>

<style scoped>
/* Progress */
.tmc-progress-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 28px;
}
.tmc-progress-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 10px;
}
.tmc-progress-label { color: var(--text-muted); font-weight: 600; }
.tmc-progress-count { color: var(--accent); font-weight: 700; }

.tmc-progress-track {
  height: 8px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
}
.tmc-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
  transition: width 0.4s ease;
}
.tmc-all-done { margin-top: 14px; }

/* Section cards */
.tmc-sections { display: flex; flex-direction: column; gap: 12px; }

.tmc-section {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.2s;
}
.tmc-section--done { border-color: rgba(var(--success-rgb), 0.4); }

.tmc-section-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--surface);
  border: none;
  cursor: pointer;
  color: var(--text);
  gap: 12px;
  text-align: left;
  transition: background 0.15s;
}
.tmc-section-header:hover { background: var(--surface-2); }

.tmc-section-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.tmc-section-icon { font-size: 18px; flex-shrink: 0; }
.tmc-section-title { font-size: 14px; font-weight: 700; }

.tmc-section-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.tmc-section-count { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.tmc-chevron { font-size: 11px; color: var(--text-muted); transition: transform 0.2s; }
.tmc-chevron--open { transform: rotate(180deg); }

/* Section body */
.tmc-section-body { background: var(--bg-alt); }

/* Slide transition */
.tmc-slide-enter-active,
.tmc-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 2000px;
}
.tmc-slide-enter-from,
.tmc-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Steps */
.tmc-step {
  border-top: 1px solid var(--border);
  transition: background 0.15s;
}
.tmc-step:first-child { border-top: none; }
.tmc-step--done { background: rgba(var(--success-rgb), 0.04); }

.tmc-step-inner {
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  cursor: pointer;
  align-items: flex-start;
}

.tmc-hidden-check { display: none; }

.tmc-check-box {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 2px solid var(--border);
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
  transition: border-color 0.15s, background 0.15s;
}
.tmc-step--done .tmc-check-box {
  border-color: var(--success);
  background: rgba(var(--success-rgb), 0.15);
}
.tmc-check-mark {
  color: var(--success);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.tmc-step-content { flex: 1; min-width: 0; }
.tmc-step-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.tmc-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.tmc-step--done .tmc-step-num {
  background: rgba(var(--success-rgb), 0.15);
  border-color: var(--success);
  color: var(--success);
}
.tmc-step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.tmc-step--done .tmc-step-title { color: var(--text-muted); text-decoration: line-through; }

.tmc-step-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 8px;
}
.tmc-step--done .tmc-step-desc { color: var(--text-dim); }

/* Alerts */
.tmc-alert {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  margin-top: 8px;
  line-height: 1.5;
}
.tmc-alert-icon { flex-shrink: 0; }
.tmc-alert--warn {
  background: rgba(var(--warning-rgb), 0.1);
  color: var(--warning);
  border: 1px solid rgba(var(--warning-rgb), 0.25);
}
.tmc-alert--tip {
  background: rgba(var(--secondary-rgb), 0.1);
  color: var(--secondary);
  border: 1px solid rgba(var(--secondary-rgb), 0.25);
}

/* Fade transition */
.tmc-fade-enter-active, .tmc-fade-leave-active { transition: opacity 0.3s; }
.tmc-fade-enter-from, .tmc-fade-leave-to { opacity: 0; }

/* Footer */
.tmc-footer { margin-top: 28px; }

@media (max-width: 600px) {
  .tmc-section-title { font-size: 13px; }
}
</style>
