<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; Home</RouterLink>
        <h1 class="tool-page-title">VESC Setup <span class="accent">Wizard</span></h1>
        <p class="tool-page-desc">
          Interactive step-by-step guide to configure VESC with VESC Tool for direct-drive force feedback.
          Check off each step as you complete it — progress is saved in your browser.
        </p>
      </div>

      <!-- Board variant selector -->
      <div class="board-selector">
        <label class="board-option" :class="{ active: useOfficialBoard }">
          <input type="radio" :value="true" v-model="useOfficialBoard" />
          <span class="board-option-icon">🟢</span>
          <span class="board-option-text">
            <strong>Official OpenFFBoard</strong>
            <span>Recommended — pre-built board from the OpenFFBoard project</span>
          </span>
        </label>
        <label class="board-option" :class="{ active: !useOfficialBoard }">
          <input type="radio" :value="false" v-model="useOfficialBoard" />
          <span class="board-option-icon">🔧</span>
          <span class="board-option-text">
            <strong>Custom / Discovery STM32 Board</strong>
            <span>STM32 + TJA1051 CAN transceiver wired manually</span>
          </span>
        </label>
      </div>

      <!-- Discord support banner -->
      <div class="discord-banner">
        <span class="discord-banner-icon">💬</span>
        <span class="discord-banner-text">
          Stuck or unsure about any step?
          <a href="https://discord.com/servers/openffboard-704355326291607614" target="_blank" rel="noopener">Join the OpenFFBoard Discord</a>
          — the community is active and happy to help.
        </span>
      </div>

      <!-- Progress bar -->
      <div class="vesc-progress-wrap">
        <div class="vesc-progress-top">
          <span class="vesc-progress-label">Overall progress</span>
          <span class="vesc-progress-count">{{ completedCount }} / {{ totalSteps }} steps</span>
        </div>
        <div class="vesc-progress-track">
          <div class="vesc-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <Transition name="fade">
          <div v-if="allDone" class="vesc-all-done">
            <span class="status-badge status-ok">All steps complete — motor ready to drive!</span>
          </div>
        </Transition>
      </div>

      <!-- Sections -->
      <div class="vesc-sections">
        <div
          v-for="section in sections"
          :key="section.id"
          class="vesc-section"
          :class="{ 'vesc-section--done': isSectionDone(section) }"
        >
          <button class="vesc-section-header" @click="toggleSection(section.id)">
            <div class="vesc-section-left">
              <span class="vesc-section-icon">{{ section.icon }}</span>
              <span class="vesc-section-title">{{ section.title }}</span>
              <span v-if="isSectionDone(section)" class="status-badge status-ok" style="margin:0;padding:2px 10px;font-size:11px;">Done</span>
            </div>
            <div class="vesc-section-right">
              <span class="vesc-section-count">{{ sectionDoneCount(section) }}/{{ section.steps.length }}</span>
              <span class="vesc-chevron" :class="{ 'vesc-chevron--open': openSections.has(section.id) }">&#9660;</span>
            </div>
          </button>

          <Transition name="vesc-slide">
            <div v-if="openSections.has(section.id)" class="vesc-section-body">
              <div
                v-for="step in section.steps"
                :key="step.id"
                class="vesc-step"
                :class="{ 'vesc-step--done': completedSteps.has(step.id) }"
              >
                <label class="vesc-step-inner">
                  <input
                    type="checkbox"
                    class="vesc-hidden-check"
                    :checked="completedSteps.has(step.id)"
                    @change="toggleStep(step.id)"
                  />
                  <span class="vesc-check-box">
                    <span v-if="completedSteps.has(step.id)" class="vesc-check-mark">&#10003;</span>
                  </span>
                  <div class="vesc-step-content">
                    <div class="vesc-step-header">
                      <span class="vesc-step-num">{{ step.id }}</span>
                      <span class="vesc-step-title">{{ step.title }}</span>
                    </div>
                    <p class="vesc-step-desc">{{ step.desc }}</p>
                    <div v-if="step.warning" class="vesc-alert vesc-alert--warn">
                      <span class="vesc-alert-icon">&#9888;</span>
                      {{ step.warning }}
                    </div>
                    <div v-if="step.tip" class="vesc-alert vesc-alert--tip">
                      <span class="vesc-alert-icon">&#128161;</span>
                      {{ step.tip }}
                    </div>
                  </div>
                </label>

                <!-- Step image -->
                <div v-if="step.image || step.imageOfficial" class="vesc-step-image" :class="{ 'vesc-step-image--ui': step.imageSize === 'ui' }">
                  <div class="vesc-img-wrapper">
                    <img :src="useOfficialBoard && step.imageOfficial ? step.imageOfficial : step.image" :alt="step.imageCaption || step.title" />
                    <div
                      v-if="activeAnnotations(step).length"
                      class="vesc-blur-overlay"
                      :style="blurOverlayStyle(step)"
                    ></div>
                    <div
                      v-for="(ann, i) in activeAnnotations(step)"
                      :key="i"
                      class="vesc-ann-circle"
                      :class="`vesc-ann-s${step.id}-${i + 1}`"
                      :style="{ left: ann.cx + '%', top: ann.cy + '%', width: (ann.size || 64) + 'px', height: (ann.size || 64) + 'px' }"
                    ></div>
                  </div>
                  <p v-if="step.imageCaption" class="vesc-step-image-caption">
                    <span class="vesc-caption-icon">&#128247;</span> {{ step.imageCaption }}
                  </p>
                </div>

                <!-- Link to Ki/Kp calculator (step 12) -->
                <div v-if="step.id === 12" class="vesc-step-link-row">
                  <RouterLink to="/motor-gains" class="btn btn-primary">
                    Open Motor Gains Calculator &#8594;
                  </RouterLink>
                  <span class="vesc-step-link-note">Calculate Kp &amp; Ki from your motor's R, L and desired slew rate</span>
                </div>

                <!-- Inline current limit calculator (step 8) -->
                <div v-if="step.id === 8" class="vesc-calc-widget">
                  <div class="panel-title">Current Limit Calculator</div>
                  <div class="field-row">
                    <div class="field">
                      <label>Motor peak torque (Nm)</label>
                      <input type="number" v-model.number="calcTorque" min="0.1" step="0.5" />
                    </div>
                    <div class="field">
                      <label>Kt constant (Nm/A)</label>
                      <input type="number" v-model.number="calcKt" min="0.01" step="0.01" />
                      <p class="hint">1.42 Nm/A is the default for most AC servos</p>
                    </div>
                  </div>
                  <div class="result-grid">
                    <div class="result-card highlight">
                      <div class="result-label">Motor current max</div>
                      <div class="result-value">
                        {{ calcCurrentMax.toFixed(1) }}
                        <span class="result-unit">A</span>
                      </div>
                      <div class="result-note">Set to +{{ calcCurrentMax.toFixed(1) }} / -{{ calcCurrentMax.toFixed(1) }} A</div>
                    </div>
                    <div class="result-card">
                      <div class="result-label">Battery current max</div>
                      <div class="result-value">10 <span class="result-unit">A</span></div>
                      <div class="result-note">±10 A for 500W / 48V PSU</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="vesc-footer">
        <button class="btn btn-outline" @click="resetAll">Reset Progress</button>
      </div>

    </div>
  </main>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'

const STORAGE_KEY = 'vesc-setup-v1'
const useOfficialBoard = ref(true)
const BASE = import.meta.env.BASE_URL
const IMG  = `${BASE}images/vescsetup/`

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
const completedSteps = reactive(new Set(saved))
const openSections   = reactive(new Set())

// Current limit calculator (step 8)
const calcTorque = ref(10)
const calcKt     = ref(1.42)

const calcCurrentMax = computed(() =>
  calcKt.value > 0 ? calcTorque.value / calcKt.value : calcTorque.value / 1.42
)



// ── Step data ──────────────────────────────────────────
const sections = [
  {
    id: 'wiring',
    icon: '🔌',
    title: 'Wiring & Connections',
    steps: [
      {
        id: 1,
        title: 'Connect motor phases to VESC',
        desc: 'Wire all three motor phases (U, V, W) to the VESC outputs. Ensure all crimps and terminals are secure before powering on.',
        warning: 'NEVER power on VESC without a motor wired — it will damage the controller.',
        image: `${IMG}vescsetup_1_img1.jpeg`,
        imageCaption: 'Wiring overview — motor phases U, V, W run from the motor (top-left) to the VESC (bottom-left). Power supply connects at the bottom.',
        annotations: [
          { cx: 14, cy: 30, size: 120 },  // motor body
          { cx: 14, cy: 50, size: 120 },  // VESC motor output terminals
        ],
        annotationsOfficial: [
          { cx: 14, cy: 30, size: 120 },  // motor body
          { cx: 14, cy: 50, size: 120 },  // VESC motor output terminals
        ],
      },
      {
        id: 2,
        title: 'Connect encoder to VESC',
        desc: 'Wire your encoder (BiSS-C or similar) to the VESC encoder port. Follow your encoder\'s datasheet for pin assignments (CLK, DATA, GND, VCC).',
        image: `${IMG}vescsetup_1_img1.jpeg`,
        imageCaption: 'Encoder signal wires (5V, GND, SLO+, MA+, MA−) run from the VESC encoder port through the CAN transceiver board to the STM32 on the right.',
        annotations: [
          { cx: 22, cy: 43, size: 64 },  // VESC encoder port
          { cx: 88, cy: 62, size: 64 },  // encoder driver board (far right)
        ],
        annotationsOfficial: [
          { cx: 22, cy: 43, size: 64 },  // VESC encoder port
          { cx: 88, cy: 62, size: 64 },  // encoder driver board (far right)
        ],
      },
      {
        id: 3,
        title: 'Connect brake resistor or power supply',
        desc: 'If not using batteries, connect a brake resistor circuit between PSU and VESC. This dissipates back-EMF safely during deceleration.',
        warning: 'Required when using a PSU (not batteries). Without it, braking energy has nowhere to go and voltage will spike. If unsure, join the discord for guidance on setting up a brake resistor.',
      },
      {
        id: 4,
        title: '(Optional) Connect STM32 + TJA1051',
        desc: 'This is the CANBus interface between the OpenFFBoard and VESC. Not required for motor setup — skip until the OpenFFBoard Integration section.',
        tip: 'You can complete the entire VESC setup and test the motor before connecting the OpenFFBoard.',
        image: `${IMG}vescsetup_1_img1.jpeg`,
        imageCaption: 'Full wiring including the TJA1051 CAN transceiver (centre board) and STM32/OpenFFBoard (top-right). CANH and CANL connect VESC to the transceiver.',
        annotations: [
          { cx: 52, cy: 58, size: 64 },  // TJA1051 CAN transceiver board
          { cx: 77, cy: 18, size: 64 },  // STM32 / OpenFFBoard
        ],
        annotationsOfficial: [
          { cx: 52, cy: 58, size: 64 },  // TJA1051 CAN transceiver board
          { cx: 77, cy: 18, size: 64 },  // STM32 / OpenFFBoard (official board position)
        ],
      },
    ],
  },
  {
    id: 'firmware',
    icon: '💾',
    title: 'Firmware Upload',
    steps: [
      {
        id: 5,
        title: 'Connect to VESC Tool',
        desc: 'Power the VESC and connect via USB. Open VESC Tool → Connection tab → select your VESC COM port → click Connect.',
      },
      {
        id: 6,
        title: 'Upload bootloader',
        desc: 'Firmware tab → Bootloader → select model 412 → click the "Update firmware on the connected VESC" button. Then Terminal → Reboot. Wait a few seconds, then reconnect.',
        tip: 'Uploading the bootloader prevents the VESC from running in limited mode.',
      },
      {
        id: 7,
        title: 'Upload custom firmware',
        desc: 'Firmware tab → Custom file tab → select your firmware file (default, 005, or 0005 if you modified the shunt resistors) → click "Update firmware on the connected VESC". Terminal → Reboot, then reconnect.',
      },
    ],
  },
  {
    id: 'motor-config',
    icon: '⚙️',
    title: 'Motor Configuration',
    steps: [
      {
        id: 8,
        title: 'Set motor type, encoder and current limits',
        desc: 'Motor Settings → General → General: motor type = FOC, select encoder, set resolution (22 for BiSS-C). Then → General → Current: enter motor and battery current limits. Use the calculator below to compute your limits.',
      },
      {
        id: 9,
        title: 'Set voltage limits',
        desc: 'Motor Settings → General → Advanced: minimum input voltage = 43V, maximum = 50V. These protect the system if the brake resistor fails while running a 48V PSU.',
        tip: 'Scale these proportionally if using a different supply voltage.',
      },
      {
        id: 10,
        title: 'Write motor configuration',
        desc: 'Click the "Write motor configuration" button in the right sidebar of VESC Tool. Then Terminal → Reboot and reconnect.',
      },
    ],
  },
  {
    id: 'foc',
    icon: '📡',
    title: 'FOC Calibration',
    steps: [
      {
        id: 11,
        title: 'Configure FOC sensor mode and Alpha',
        desc: 'Motor Settings → FOC → General: set Sensor mode to Encoder. Change the Alpha value to 30 (the default of 2000 ERPM/s is too high for direct-drive).',
        image: `${IMG}vescsetup_2_img2.jpeg`,
        imageSize: 'ui',
        imageCaption: 'Set Alpha to 30 ERPM/s, replacing the default 2000.',
      },
      {
        id: 12,
        title: 'Run RL, then Lambda calibration',
        desc: 'Still in FOC → General: click "Measure R and L (RL)" and wait for it to complete. Then click "Measure Lambda", wait. Finally click Apply.',
        tip: 'Order matters — run RL first, Lambda second.',
        image: `${IMG}vescsetup_2_img3.jpeg`,
        imageSize: 'ui',
        imageCaption: 'Click RL → wait → click λ → wait → click Apply.',
      },
      {
        id: 13,
        title: 'Detect encoder offset',
        desc: 'Motor Settings → FOC → Encoder tab → click "Detect encoder". The motor will rotate briefly to find the electrical angle offset. Once done, click Apply.',
        image: `${IMG}vescsetup_2_img6.jpeg`,
        imageSize: 'ui',
        imageCaption: 'Click the Encoder button to start offset detection.',
      },
      {
        id: 14,
        title: 'Write motor configuration',
        desc: 'Click "Write motor configuration" in the right sidebar. Terminal → Reboot and reconnect.',
      },
    ],
  },
  {
    id: 'fine-tune',
    icon: '🎛️',
    title: 'Fine-Tuning',
    steps: [
      {
        id: 15,
        title: 'Set minimum current to 0A',
        desc: 'Motor Settings → General → Advanced: set Min Current to 0A. This reduces cogging.',
        tip: 'Bug workaround: if VESC refuses to save "0", set it to 0.5A → write config → reboot, then change back to 0A and write again.',
      },
      {
        id: 16,
        title: 'Write motor configuration',
        desc: 'Click "Write motor configuration". Terminal → Reboot and reconnect.',
      },
      {
        id: 17,
        title: 'Update Vesc Tool App Settings',
        desc: 'Set the APP to Use as UART. Kill switch mode to PPM High. Then hit the  |/A button (save application config), not |/M (save motor config).',
        warning: 'Required when using a PSU (not batteries). Without it, braking energy has nowhere to go and voltage will spike. If unsure, join the discord for guidance on setting up a brake resistor.',
      },
    ],
  },
  {
    id: 'verify',
    icon: '✅',
    title: 'Verification & Testing',
    steps: [
      {
        id: 18,
        title: 'Verify encoder signal',
        desc: 'Data Analysis → Realtime Data → Rotor Position tab: select Encoder from the signal dropdown. Slowly rotate the motor shaft by hand — you should see a smooth, continuous line in the graph.',
        warning: 'If the graph shows no movement or a flat line, stop and recheck encoder wiring before continuing.',
      },
      {
        id: 19,
        title: 'Test motor direction (duty cycle mode)',
        desc: 'At the bottom of VESC Tool, click "D 0.20" then press the Play button. The motor should spin clockwise. Press Stop when done.',
        tip: 'If it spins counter-clockwise: swap any two motor phase wires and redo encoder detection (Step 13).',
        image: `${IMG}vescsetup_2_img7.jpeg`,
        imageSize: 'ui',
        imageCaption: 'D 0.20 duty cycle control — hit the play button to spin the motor.',
      },
      {
        id: 20,
        title: 'Test torque feel',
        desc: 'Switch to current control mode. Set I = 1A and run. Grab the shaft and try to stop it — you should feel consistent resistance throughout the full rotation.',
        warning: 'If force feels stronger on one side than the other, FOC calibration has an issue. Redo Steps 11–14.',
        image: `${IMG}vescsetup_2_img9.jpeg`,
        imageSize: 'ui',
        imageCaption: 'I 1.00 A current mode — feel the torque while holding the shaft.',
      },
    ],
  },
  {
    id: 'openffboard',
    icon: '🎮',
    title: 'OpenFFBoard Integration',
    steps: [
      {
        id: 21,
        title: 'Select VESC as the driver',
        desc: 'Open the OpenFFBoard Configurator. In the driver selection drop-down, choose VESC. The default CANBus speed already matches the VESC default — no change required.',
      },
      {
        id: 22,
        title: 'Check VESC status and encoder rate',
        desc: 'In the Configurator, verify VESC status shows OK and the encoder rate is around 1000. If the encoder rate is too low, increase the CANBus speed in both VESC Tool and the Configurator.',
      },
      {
        id: 23,
        title: 'Test wheel input',
        desc: 'Move the steering wheel — the axis bargraph in the Configurator should respond. If it does not move, recheck CANBus wiring and speed settings.',
      },
      {
        id: 24,
        title: 'Center the wheel axis',
        desc: 'If the center position is off, go to the Axis tab in the Configurator and use the center function. The VescDriver stores the center position persistently. A Reset button is available to clear the stored position.',
      },
    ],
  },
]

// ── Annotation helpers ────────────────────────────────
function activeAnnotations(step) {
  return (useOfficialBoard.value && step.annotationsOfficial)
    ? step.annotationsOfficial
    : (step.annotations || [])
}

function blurOverlayStyle(step) {
  const anns = activeAnnotations(step)
  if (!anns.length) return {}
  const gradients = anns.map(ann => {
    const r = (ann.size || 64) / 2
    return `radial-gradient(circle ${r}px at ${ann.cx}% ${ann.cy}%, transparent ${r}px, black ${r}px)`
  }).join(', ')
  const composite = anns.map(() => 'intersect').join(', ')
  return {
    maskImage: gradients,
    WebkitMaskImage: gradients,
    maskComposite: composite,
    WebkitMaskComposite: anns.map(() => 'source-in').join(', '),
  }
}

// ── Computed ───────────────────────────────────────────
const totalSteps     = computed(() => sections.reduce((n, s) => n + s.steps.length, 0))
const completedCount = computed(() => completedSteps.size)
const progressPct    = computed(() => (completedCount.value / totalSteps.value) * 100)
const allDone        = computed(() => completedCount.value === totalSteps.value)

function isSectionDone(section) {
  return section.steps.every(s => completedSteps.has(s.id))
}
function sectionDoneCount(section) {
  return section.steps.filter(s => completedSteps.has(s.id)).length
}

// ── Actions ────────────────────────────────────────────
function toggleStep(id) {
  completedSteps.has(id) ? completedSteps.delete(id) : completedSteps.add(id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedSteps]))
}
function toggleSection(id) {
  openSections.has(id) ? openSections.delete(id) : openSections.add(id)
}
function resetAll() {
  completedSteps.clear()
  localStorage.removeItem(STORAGE_KEY)
}

// Open first incomplete section on load
function init() {
  for (const s of sections) {
    if (!isSectionDone(s)) { openSections.add(s.id); return }
  }
  openSections.add(sections[0].id)
}
init()
</script>

<style scoped>
/* Board selector */
.board-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.board-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.board-option input[type="radio"] {
  display: none;
}

.board-option.active {
  border-color: var(--accent);
  background: var(--accent-subtle);
}

.board-option-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

.board-option-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.board-option-text strong {
  font-size: 14px;
  color: var(--text);
}

.board-option-text span {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
}

@media (max-width: 600px) {
  .board-selector { grid-template-columns: 1fr; }
}

/* Discord banner */
.discord-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--secondary-subtle);
  border: 1px solid rgba(var(--secondary-rgb), 0.25);
  border-radius: var(--radius);
  margin-bottom: 16px;
  font-size: 13px;
  color: var(--text-muted);
}

.discord-banner-icon { font-size: 16px; flex-shrink: 0; }

.discord-banner a {
  color: var(--secondary);
  font-weight: 600;
  text-decoration: none;
}

.discord-banner a:hover { text-decoration: underline; }

/* Progress */
.vesc-progress-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 28px;
}
.vesc-progress-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 10px;
}
.vesc-progress-label { color: var(--text-muted); font-weight: 600; }
.vesc-progress-count { color: var(--accent); font-weight: 700; }

.vesc-progress-track {
  height: 8px;
  background: var(--surface-2);
  border-radius: 99px;
  overflow: hidden;
}
.vesc-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 99px;
  transition: width 0.4s ease;
}
.vesc-all-done { margin-top: 14px; }

/* Section cards */
.vesc-sections { display: flex; flex-direction: column; gap: 12px; }

.vesc-section {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  transition: border-color 0.2s;
}
.vesc-section--done { border-color: rgba(var(--success-rgb), 0.4); }

.vesc-section-header {
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
.vesc-section-header:hover { background: var(--surface-2); }

.vesc-section-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.vesc-section-icon { font-size: 18px; flex-shrink: 0; }
.vesc-section-title { font-size: 14px; font-weight: 700; }

.vesc-section-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.vesc-section-count { font-size: 12px; color: var(--text-muted); font-weight: 600; }
.vesc-chevron { font-size: 11px; color: var(--text-muted); transition: transform 0.2s; }
.vesc-chevron--open { transform: rotate(180deg); }

/* Section body */
.vesc-section-body { background: var(--bg-alt); }

/* Slide transition */
.vesc-slide-enter-active,
.vesc-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.2s ease;
  overflow: hidden;
  max-height: 2000px;
}
.vesc-slide-enter-from,
.vesc-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Steps */
.vesc-step {
  border-top: 1px solid var(--border);
  transition: background 0.15s;
}
.vesc-step:first-child { border-top: none; }
.vesc-step--done { background: rgba(var(--success-rgb), 0.04); }

.vesc-step-inner {
  display: flex;
  gap: 16px;
  padding: 18px 20px;
  cursor: pointer;
  align-items: flex-start;
}

.vesc-hidden-check { display: none; }

.vesc-check-box {
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
.vesc-step--done .vesc-check-box {
  border-color: var(--success);
  background: rgba(var(--success-rgb), 0.15);
}
.vesc-check-mark {
  color: var(--success);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.vesc-step-content { flex: 1; min-width: 0; }
.vesc-step-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}
.vesc-step-num {
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
.vesc-step--done .vesc-step-num {
  background: rgba(var(--success-rgb), 0.15);
  border-color: var(--success);
  color: var(--success);
}
.vesc-step-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.vesc-step--done .vesc-step-title { color: var(--text-muted); text-decoration: line-through; }

.vesc-step-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 8px;
}
.vesc-step--done .vesc-step-desc { color: var(--text-dim); }

/* Alerts */
.vesc-alert {
  display: flex;
  gap: 8px;
  font-size: 12.5px;
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  margin-top: 8px;
  line-height: 1.5;
}
.vesc-alert-icon { flex-shrink: 0; }
.vesc-alert--warn {
  background: rgba(var(--warning-rgb), 0.1);
  color: var(--warning);
  border: 1px solid rgba(var(--warning-rgb), 0.25);
}
.vesc-alert--tip {
  background: rgba(var(--secondary-rgb), 0.1);
  color: var(--secondary);
  border: 1px solid rgba(var(--secondary-rgb), 0.25);
}

/* Inline calculator widget */
.vesc-calc-widget {
  margin: 0 20px 18px 58px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Step image */
.vesc-step-image {
  margin: 0 20px 18px 58px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface-2);
  box-shadow: var(--shadow);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.vesc-step-image:hover {
  border-color: rgba(var(--accent-rgb), 0.4);
  box-shadow: 0 0 0 1px rgba(var(--accent-rgb), 0.15), var(--shadow);
}
.vesc-step-image--ui {
  display: inline-flex;
  flex-direction: column;
  width: auto;
  max-width: calc(100% - 78px);
}

/* Image + annotation wrapper */
.vesc-img-wrapper {
  position: relative;
  display: block;
  overflow: hidden;
  background: #000;
}
.vesc-img-wrapper img {
  display: block;
  width: 100%;
  height: auto;
  transition: transform 0.35s ease;
}
.vesc-step-image:hover .vesc-img-wrapper img {
  transform: scale(1.015);
}
.vesc-step-image--ui .vesc-img-wrapper img {
  width: auto;
  max-width: 100%;
  image-rendering: crisp-edges;
  transform: none !important;
}

/* Blur overlay — darkens + blurs outside the annotation circles */
.vesc-blur-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  backdrop-filter: blur(3px) brightness(0.55);
  background: rgba(0, 0, 0, 0.15);
}

/* Annotation circles — base style shared by all circles.
   Size is set per-circle via inline style (ann.size, default 64px).
   Target individual circles with .vesc-ann-s{stepId}-{n}, e.g.:
     .vesc-ann-s1-2 { width: 40px; height: 40px; }  */
.vesc-ann-circle {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  border: 2.5px solid var(--accent);
  box-shadow:
    0 0 0 1.5px rgba(var(--bg-rgb), 0.6),
    0 0 12px rgba(var(--accent-rgb), 0.45);
  pointer-events: none;
  animation: ann-pulse 2.4s ease-in-out infinite;
}

@keyframes ann-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 1.5px rgba(var(--bg-rgb), 0.6),
      0 0 10px rgba(var(--accent-rgb), 0.4);
  }
  50% {
    box-shadow:
      0 0 0 1.5px rgba(var(--bg-rgb), 0.6),
      0 0 22px rgba(var(--accent-rgb), 0.7),
      0 0 0 8px rgba(var(--accent-rgb), 0.12);
  }
}

/* Caption */
.vesc-step-image-caption {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 9px 14px;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  background: var(--surface);
  line-height: 1.55;
}
.vesc-caption-icon {
  flex-shrink: 0;
  font-size: 13px;
  margin-top: 1px;
}

/* Step link row */
.vesc-step-link-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px 18px 58px;
  flex-wrap: wrap;
}
.vesc-step-link-note {
  font-size: 12px;
  color: var(--text-muted);
}

/* Footer */
.vesc-footer { margin-top: 28px; }

@media (max-width: 600px) {
  .vesc-calc-widget { margin-left: 20px; }
  .vesc-step-link-row { padding-left: 20px; }
  .vesc-step-image { margin-left: 20px; }
  .vesc-step-image--ui { max-width: calc(100% - 40px); }
  .vesc-section-title { font-size: 13px; }
}
</style>
