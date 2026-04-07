/**
 * WheelTelemetry — processes raw WebHID input reports from a force-feedback steering wheel
 * into human-readable telemetry values.
 *
 * Responsibilities:
 *   - Parses the HID report descriptor to locate the X axis
 *   - Derives an initial steering range estimate from the descriptor's physical range
 *   - Converts raw axis counts to a normalised 0-1 value and to degrees
 *   - Tracks report frequency and latency using a rolling timestamp window
 *   - Computes smoothed speed and acceleration from successive position samples
 *   - Emits a 'tick' CustomEvent per joystick report with all computed values
 *   - Emits a 'live' CustomEvent (detail: true/false) to signal data activity
 *
 * This class is device-agnostic — it knows nothing about the FFBoard vendor protocol.
 * The caller is responsible for updating `steeringDeg` when the authoritative value
 * arrives from a vendor command channel.
 *
 * Usage:
 *   const tel = new WheelTelemetry()
 *   const { caps, steeringDeg } = tel.attach(device, allGranted)
 *   tel.addEventListener('tick', e => updateUI(e.detail))
 *   tel.addEventListener('live', e => setLive(e.detail))
 *   // later:
 *   tel.steeringDeg = 1080   // override once authoritative value is known
 *   tel.detach()
 */

// ── HID Descriptor Helpers ─────────────────────────────────────────────────────

/**
 * Read `bitLen` bits from `dv` starting at bit `bitOffset` (LSB of byte 0 = bit 0).
 * Returns a signed or unsigned integer.
 */
function readBits(dv, bitOffset, bitLen, signed) {
  const byteStart   = Math.floor(bitOffset / 8)
  const shift       = bitOffset % 8
  const bytesNeeded = Math.ceil((shift + bitLen) / 8)
  let raw = 0
  for (let i = 0; i < bytesNeeded; i++) {
    const idx = byteStart + i
    if (idx < dv.byteLength) raw |= dv.getUint8(idx) << (i * 8)
  }
  const mask = bitLen >= 32 ? 0xFFFFFFFF : (1 << bitLen) - 1
  raw = (raw >>> shift) & mask
  if (signed && raw >= (1 << (bitLen - 1))) raw -= (1 << bitLen)
  return raw
}

/**
 * Expand an HIDReportItem's usage list, handling both explicit arrays and
 * range-style (usageMinimum..usageMaximum) descriptors.
 */
function usagesOf(item) {
  if (item.usages && item.usages.length > 0) return item.usages
  if (item.usageMinimum != null && item.usageMaximum != null) {
    const out   = []
    const limit = item.usageMinimum + item.reportCount - 1
    for (let u = item.usageMinimum; u <= Math.min(item.usageMaximum, limit); u++) out.push(u)
    return out
  }
  return []
}

/**
 * Walk the device's HID collections and return the location of the X axis
 * within the input report stream, or null if not found.
 *
 * Returned object: { reportId, bitOffset, reportSize, logicalMin, logicalMax,
 *                    physicalMin, physicalMax, unitExponent, isSigned }
 */
function buildAxisInfo(device) {
  const X_AXIS = 0x00010030  // Generic Desktop — X
  for (const coll of device.collections) {
    for (const report of coll.inputReports) {
      let bitOff = 0
      for (const item of report.items) {
        const totalBits = item.reportSize * item.reportCount
        if (!item.isConstant) {
          const usages = usagesOf(item)
          const idx    = usages.indexOf(X_AXIS)
          if (idx >= 0) {
            return {
              reportId:     report.reportId,
              bitOffset:    bitOff + idx * item.reportSize,
              reportSize:   item.reportSize,
              logicalMin:   item.logicalMinimum,
              logicalMax:   item.logicalMaximum,
              physicalMin:  item.physicalMinimum  ?? 0,
              physicalMax:  item.physicalMaximum  ?? 0,
              unitExponent: item.unitExponent     ?? 0,
              isSigned:     item.logicalMinimum < 0,
            }
          }
        }
        bitOff += totalBits
      }
    }
  }
  return null
}

/**
 * Estimate the total steering range in degrees from the descriptor's physical range.
 * Falls back to 900° when the descriptor omits physical limits or they look implausible.
 */
function deriveSteeringRange(info) {
  if (!info) return 900
  const { physicalMin, physicalMax, unitExponent } = info
  if (!physicalMax && !physicalMin) return 900
  const scale   = Math.pow(10, unitExponent || 0)
  const halfDeg = Math.abs(physicalMax * scale)
  if (halfDeg >= 90 && halfDeg <= 1800) return halfDeg * 2
  return 900
}

/**
 * Parse static device capabilities from the HID report descriptor.
 * Returns a plain object — does not mutate any external state.
 */
function parseDeviceCaps(device, allGranted) {
  const AXIS_USAGES   = new Set([0x00010030, 0x00010031, 0x00010032, 0x00010033, 0x00010034, 0x00010035])
  const SLIDER_USAGES = new Set([0x00010036, 0x00010037])
  let axes = 0, sliders = 0, buttons = 0, pov = 0, effects = 0, channel = 0

  for (const coll of device.collections) {
    if (coll.usagePage === 1 && channel === 0) channel = coll.usage

    for (const report of coll.inputReports) {
      for (const item of report.items) {
        if (item.isConstant) continue
        for (const u of usagesOf(item)) {
          if (AXIS_USAGES.has(u))        axes++
          else if (SLIDER_USAGES.has(u)) sliders++
          else if (u === 0x00010039)     pov++
          else if ((u >>> 16) === 0x09)  buttons++
        }
      }
    }

    for (const report of coll.featureReports) {
      for (const item of report.items) {
        for (const u of usagesOf(item)) {
          if (u === 0x000F0092 || u === 0x000F007F) {
            effects = Math.max(effects, item.logicalMaximum || item.reportCount || 0)
          }
        }
      }
    }
  }

  return {
    devicesFound: allGranted.length,
    deviceIndex:  allGranted.findIndex(d => d === device),
    axes, sliders, buttons, pov, effects, channel,
  }
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function lerp(a, b, alpha) { return a + (b - a) * alpha }

// ── Class ─────────────────────────────────────────────────────────────────────

export class WheelTelemetry extends EventTarget {
  /** Total steering range in degrees. Update this when the authoritative value arrives. */
  steeringDeg = 900

  #axisInfo       = null
  #prevDeg        = 0
  #prevSpeedDegS  = 0
  #prevTs         = 0
  #tsWindow       = []
  #liveTimer      = null
  #device         = null
  #boundHandler   = null

  // Smoothed state kept internally to support the lerp across ticks
  #smooth = {
    frequency: 0, speed_degs: 0, speed_rpm: 0,
    accel_degs2: 0, accel_rpms: 0,
    tel_speed_rads: 0, tel_accel_rots2: 0, tel_accel_rads2: 0,
  }

  /**
   * Attach to a HID device.  Parses the descriptor and registers the inputreport listener.
   * Returns { caps, steeringDeg } with the static descriptor data and initial range estimate.
   */
  attach(device, allGranted) {
    this.#device       = device
    this.#axisInfo     = buildAxisInfo(device)
    this.steeringDeg   = deriveSteeringRange(this.#axisInfo)
    this.#boundHandler = this.#onInputReport.bind(this)
    device.addEventListener('inputreport', this.#boundHandler)

    const caps = parseDeviceCaps(device, allGranted)
    return { caps, steeringDeg: this.steeringDeg }
  }

  /** Remove the inputreport listener and cancel the live timer. */
  detach() {
    if (this.#device && this.#boundHandler) {
      this.#device.removeEventListener('inputreport', this.#boundHandler)
    }
    clearTimeout(this.#liveTimer)
    this.#device       = null
    this.#boundHandler = null
  }

  /** Reset all accumulated state (call after detach when reusing). */
  reset() {
    this.#axisInfo      = null
    this.#prevDeg       = 0
    this.#prevSpeedDegS = 0
    this.#prevTs        = 0
    this.#tsWindow      = []
    this.steeringDeg    = 900
    Object.keys(this.#smooth).forEach(k => { this.#smooth[k] = 0 })
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  #onInputReport(event) {
    // Only process reports that belong to the joystick axis report ID.
    // This automatically excludes vendor command packets (e.g. FFBoard report 0xA1)
    // and any other non-axis report IDs without needing to know their specific values.
    if (!this.#axisInfo || event.reportId !== this.#axisInfo.reportId) return

    const { data, timeStamp } = event
    const now = performance.now()

    // Live indicator
    this.dispatchEvent(new CustomEvent('live', { detail: true }))
    clearTimeout(this.#liveTimer)
    this.#liveTimer = setTimeout(
      () => this.dispatchEvent(new CustomEvent('live', { detail: false })),
      500,
    )

    // Frequency / timing
    this.#tsWindow.push(now)
    if (this.#tsWindow.length > 120) this.#tsWindow.shift()

    let frequency = this.#smooth.frequency
    let fps = 0
    let timestep_ms = 0
    let latency = 0
    if (this.#tsWindow.length > 1) {
      const span = this.#tsWindow[this.#tsWindow.length - 1] - this.#tsWindow[0]
      const hz   = (this.#tsWindow.length - 1) / (span / 1000)
      frequency  = lerp(this.#smooth.frequency, hz, 0.05)
      fps        = Math.round(frequency)
      timestep_ms = frequency > 0 ? 1000 / frequency : 0
      latency     = Math.max(0, now - timeStamp)
      this.#smooth.frequency = frequency
    }

    // Axis position
    const ai   = this.#axisInfo
    const raw  = readBits(data, ai.bitOffset, ai.reportSize, ai.isSigned)
    const span = ai.logicalMax - ai.logicalMin
    const xAxis = Math.max(0, Math.min(1, span > 0 ? (raw - ai.logicalMin) / span : 0.5))
    const deg   = (xAxis - 0.5) * this.steeringDeg

    // Speed / acceleration (only when we have a valid previous sample)
    let speed_degs = this.#smooth.speed_degs
    let speed_rpm  = this.#smooth.speed_rpm
    let accel_degs2 = this.#smooth.accel_degs2
    let accel_rpms  = this.#smooth.accel_rpms
    let tel_speed_rads  = this.#smooth.tel_speed_rads
    let tel_accel_rots2 = this.#smooth.tel_accel_rots2
    let tel_accel_rads2 = this.#smooth.tel_accel_rads2
    let testState = 0, testStateName = 'Idle', testStateVal = deg

    if (this.#prevTs > 0) {
      const dt = (now - this.#prevTs) / 1000
      if (dt > 0 && dt < 0.2) {
        const spDegS  = (deg - this.#prevDeg) / dt
        const spRpm   = spDegS / 6
        const acDegS2 = (spDegS - this.#prevSpeedDegS) / dt
        const acRpmS  = acDegS2 / 6

        speed_degs  = lerp(speed_degs,  spDegS,  0.12)
        speed_rpm   = lerp(speed_rpm,   spRpm,   0.12)
        accel_degs2 = lerp(accel_degs2, acDegS2, 0.10)
        accel_rpms  = lerp(accel_rpms,  acRpmS,  0.10)
        tel_speed_rads  = lerp(tel_speed_rads,  spDegS  * (Math.PI / 180), 0.12)
        tel_accel_rots2 = lerp(tel_accel_rots2, acDegS2 / 360,             0.10)
        tel_accel_rads2 = lerp(tel_accel_rads2, acDegS2 * (Math.PI / 180), 0.10)

        Object.assign(this.#smooth, {
          speed_degs, speed_rpm, accel_degs2, accel_rpms,
          tel_speed_rads, tel_accel_rots2, tel_accel_rads2,
        })

        if (Math.abs(spDegS) > 5) {
          testState     = 1
          testStateName = 'Moving'
          testStateVal  = spDegS
        }

        this.#prevSpeedDegS = spDegS
      }
    }

    this.#prevDeg = deg
    this.#prevTs  = now

    this.dispatchEvent(new CustomEvent('tick', {
      detail: {
        xAxis, frequency, latency, fps, timestep_ms,
        speed_degs, speed_rpm, accel_degs2, accel_rpms,
        tel_speed_rpm: speed_rpm,
        tel_speed_rads, tel_accel_rots2, tel_accel_rads2,
        testState, testStateName, testStateVal,
      },
    }))
  }
}
