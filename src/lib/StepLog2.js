/**
 * StepLog2 — runs a WheelCheck-compatible Step Log 2 (linear force test) natively.
 *
 * Algorithm:
 *   1. Stop any running effect and sample the wheel's center position.
 *   2. Create a constant force effect and start it at zero magnitude.
 *   3. For each step i = 0 … maxCount:
 *        a. Set magnitude = round(i / maxCount × 10000)   (0 = no force, 10000 = full)
 *        b. Wait settleMs for the wheel to reach equilibrium.
 *        c. Average position samples over the next 50 ms.
 *        d. Record { force: magnitude, delta: |pos − center| } and emit 'progress'.
 *   4. Stop the effect and emit 'complete' with all rows.
 *
 * A centering force must be active for meaningful results: either the FFBoard's
 * idle spring or a sim running with FFB.  Without centering the wheel drifts to
 * the end-stop at any non-zero force.
 *
 * Emits:
 *   'progress' — { step, total, force, delta }   after each step
 *   'complete' — { rows: [{force, delta}] }       on success
 *   'error'    — { message }                      if the driver is not ready
 */

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export class StepLog2 extends EventTarget {
  #pid
  #telemetry
  #aborted = false

  /**
   * @param {import('./HIDPIDDriver.js').HIDPIDDriver} pidDriver
   * @param {import('./WheelTelemetry.js').WheelTelemetry} telemetry
   */
  constructor(pidDriver, telemetry) {
    super()
    this.#pid       = pidDriver
    this.#telemetry = telemetry
  }

  /**
   * Start the sweep.
   * @param {object}  opts
   * @param {number}  opts.maxCount  Number of force steps (default 50)
   * @param {number}  opts.settleMs  Milliseconds to wait per step for equilibrium (default 150)
   */
  async run({ maxCount = 50, settleMs = 150 } = {}) {
    if (!this.#pid.isReady) {
      this.dispatchEvent(new CustomEvent('error', {
        detail: 'No HID PID output reports found on this device — force output unavailable.',
      }))
      return
    }

    this.#aborted = false

    // Establish center reference with no force applied
    await this.#pid.stopEffect(1)
    await sleep(200)
    const centerDeg = await this.#sample(100)

    // Initialise effect once — update magnitude each step without reinitialising
    await this.#pid.initEffect(1)
    await this.#pid.setMagnitude(1, 0)
    await this.#pid.startEffect(1)

    const rows = []

    for (let i = 0; i <= maxCount && !this.#aborted; i++) {
      const force = Math.round((i / maxCount) * 10000)

      await this.#pid.setMagnitude(1, force)
      await sleep(settleMs)

      const posDeg = await this.#sample(50)
      const delta  = Math.abs(posDeg - centerDeg)

      rows.push({ force, delta })
      this.dispatchEvent(new CustomEvent('progress', {
        detail: { step: i, total: maxCount, force, delta },
      }))
    }

    await this.#pid.stopEffect(1)

    if (!this.#aborted) {
      this.dispatchEvent(new CustomEvent('complete', { detail: { rows } }))
    }
  }

  /** Abort a running sweep and stop the effect. */
  stop() {
    this.#aborted = true
    this.#pid.stopEffect(1).catch(() => {})
  }

  // ── Private ────────────────────────────────────────────────────────────────

  /**
   * Collect tick-event position samples for `durationMs` and return their mean
   * in degrees.  Returns 0 if no ticks arrived (telemetry not yet active).
   */
  #sample(durationMs) {
    return new Promise(resolve => {
      const samples = []
      const onTick = e => {
        samples.push((e.detail.xAxis - 0.5) * this.#telemetry.steeringDeg)
      }
      this.#telemetry.addEventListener('tick', onTick)
      setTimeout(() => {
        this.#telemetry.removeEventListener('tick', onTick)
        resolve(samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0)
      }, durationMs)
    })
  }
}
