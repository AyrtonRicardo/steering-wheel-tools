/**
 * HIDPIDDriver — minimal HID Physical Interface Device driver for constant force effects.
 *
 * Parses the device's HID output report descriptor at construction time to locate
 * the three PID reports needed for a constant force sweep:
 *   - Set Effect Report      (defines type, duration, gain)
 *   - Set Constant Force     (sets magnitude per step)
 *   - Effect Operation       (start / stop)
 *
 * All field offsets and sizes are read from the descriptor so the driver works
 * across any FFBoard firmware version without hardcoded report IDs.
 */

// ── HID parsing helpers ────────────────────────────────────────────────────────

function usagesOf(item) {
  if (item.usages && item.usages.length > 0) return [...item.usages]
  if (item.usageMinimum != null && item.usageMaximum != null) {
    const out   = []
    const limit = Math.min(item.usageMaximum, item.usageMinimum + item.reportCount - 1)
    for (let u = item.usageMinimum; u <= limit; u++) out.push(u)
    return out
  }
  return []
}

/**
 * Write `bitLen` bits of `value` into `buf` starting at bit `bitOffset`.
 * Handles signed values via two's-complement masking.
 */
function writeBits(buf, bitOffset, bitLen, value) {
  const byteStart = Math.floor(bitOffset / 8)
  const shift     = bitOffset % 8
  const mask      = bitLen < 32 ? (1 << bitLen) - 1 : 0xFFFFFFFF
  const raw       = value & mask   // two's-complement for negatives
  for (let i = 0; i < bitLen; i++) {
    const bit     = (raw >> i) & 1
    const byteIdx = byteStart + Math.floor((shift + i) / 8)
    const bitIdx  = (shift + i) % 8
    if (byteIdx < buf.length) {
      if (bit) buf[byteIdx] |=  (1 << bitIdx)
      else     buf[byteIdx] &= ~(1 << bitIdx)
    }
  }
}

// ── HID PID usage constants (full 32-bit: page 0x0F << 16 | id) ───────────────

const pid = id => (0x0F << 16) | id

const U = {
  BLOCK_INDEX: pid(0x22),   // Effect Block Index (value field)
  EFFECT_TYPE: pid(0x25),   // Effect Type (named array)
  ET_CF:       pid(0x26),   // ET_CONSTANT_FORCE — selection within Effect Type
  DURATION:    pid(0x50),   // Duration
  GAIN:        pid(0x52),   // Gain
  MAGNITUDE:   pid(0x70),   // Magnitude (signed, Set Constant Force)
  OP_START:    pid(0x78),   // Op Effect Start  — selection within Effect Operation
  OP_STOP:     pid(0x7A),   // Op Effect Stop
  LOOP_COUNT:  pid(0x7C),   // Loop Count
}

// ── Descriptor scanning ───────────────────────────────────────────────────────

/**
 * Walk all collections (recursively into children) and return a flat list of
 * output reports, each annotated with a field map keyed by usage.
 *
 * Recursion is required because HID PID output reports on most FFB devices live
 * inside a child Physical/Logical collection, not at the top Application level.
 *
 * Value fields → { bitOff, bitLen, isArray: false }
 * Named-array fields → { bitOff, bitLen, isArray: true, usages, logMin }
 *   stored once per valid selection usage so callers can look up by target.
 */
function parseCollection(coll, out) {
  for (const report of (coll.outputReports || [])) {
    let bitOff = 0
    const fields = new Map()

    for (const item of report.items) {
      if (!item.isConstant) {
        const usages = usagesOf(item)
        if (item.isArray) {
          // Named array: all usages are possible selections for this one slot.
          // Register the same fieldInfo under every selection usage.
          const fi = {
            bitOff, bitLen: item.reportSize,
            isArray: true, usages, logMin: item.logicalMinimum,
          }
          usages.forEach(u => { if (!fields.has(u)) fields.set(u, fi) })
        } else {
          // Value fields: each usage maps to its own slot at an increasing offset.
          usages.forEach((u, i) => {
            fields.set(u, { bitOff: bitOff + i * item.reportSize, bitLen: item.reportSize, isArray: false })
          })
        }
      }
      bitOff += item.reportSize * item.reportCount
    }

    out.push({ id: report.reportId, sizeBytes: Math.ceil(bitOff / 8), fields })
  }

  for (const child of (coll.children || [])) {
    parseCollection(child, out)
  }
}

function scanOutputReports(device) {
  const reports = []
  for (const coll of device.collections) parseCollection(coll, reports)
  return reports
}

// ── HIDPIDDriver ──────────────────────────────────────────────────────────────

export class HIDPIDDriver {
  #device
  #rEffect = null   // Set Effect report
  #rForce  = null   // Set Constant Force report
  #rOp     = null   // Effect Operation report

  constructor(device) {
    this.#device = device
    const reports = scanOutputReports(device)
    // Named arrays are registered under their selection usages, not the array's
    // own usage (U.EFFECT_TYPE = 0x0F25).  Look for ET_CF (0x0F26) instead.
    this.#rEffect = reports.find(r => r.fields.has(U.ET_CF)) ?? null
    this.#rForce  = reports.find(r => r.fields.has(U.MAGNITUDE))   ?? null
    this.#rOp     = reports.find(r => r.fields.has(U.OP_START) || r.fields.has(U.LOOP_COUNT)) ?? null
  }

  /** True when all three required PID reports were found in the descriptor. */
  get isReady() { return !!(this.#rEffect && this.#rForce && this.#rOp) }

  /**
   * Configure effect slot as a constant force effect with infinite duration.
   * Call once at the start of a sweep; do not call again per step.
   */
  async initEffect(slot = 1) {
    if (!this.#rEffect) return
    const { id, sizeBytes, fields } = this.#rEffect
    const buf = new Uint8Array(sizeBytes)
    this.#val(buf, fields, U.BLOCK_INDEX, slot)
    this.#arr(buf, fields, U.ET_CF)             // Effect Type = Constant Force
    this.#val(buf, fields, U.DURATION, 0xFFFF)  // Infinite duration
    this.#val(buf, fields, U.GAIN,     0xFF)     // 100% gain
    await this.#send(id, buf)
  }

  /**
   * Update the magnitude of the constant force effect.
   * @param {number} magnitude  -10000 (full reverse) … +10000 (full forward)
   */
  async setMagnitude(slot = 1, magnitude = 0) {
    if (!this.#rForce) return
    const { id, sizeBytes, fields } = this.#rForce
    const buf = new Uint8Array(sizeBytes)
    this.#val(buf, fields, U.BLOCK_INDEX, slot)
    this.#val(buf, fields, U.MAGNITUDE, magnitude)
    await this.#send(id, buf)
  }

  /** Start (or resume) the effect. */
  async startEffect(slot = 1) {
    if (!this.#rOp) return
    const { id, sizeBytes, fields } = this.#rOp
    const buf = new Uint8Array(sizeBytes)
    this.#val(buf, fields, U.BLOCK_INDEX, slot)
    this.#arr(buf, fields, U.OP_START)
    this.#val(buf, fields, U.LOOP_COUNT, 1)
    await this.#send(id, buf)
  }

  /** Stop the effect. */
  async stopEffect(slot = 1) {
    if (!this.#rOp) return
    const { id, sizeBytes, fields } = this.#rOp
    const buf = new Uint8Array(sizeBytes)
    this.#val(buf, fields, U.BLOCK_INDEX, slot)
    this.#arr(buf, fields, U.OP_STOP)
    await this.#send(id, buf)
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #send(reportId, data) {
    try { await this.#device.sendReport(reportId, data) } catch { /* silently ignore */ }
  }

  /** Write a plain value field. */
  #val(buf, fields, usage, value) {
    const f = fields.get(usage)
    if (f && !f.isArray) writeBits(buf, f.bitOff, f.bitLen, value)
  }

  /**
   * Write a named-array field by selecting the target usage.
   * Written value = logMin + indexOf(targetUsage) in the field's usages list.
   */
  #arr(buf, fields, targetUsage) {
    const f = fields.get(targetUsage)
    if (!f?.isArray) return
    const idx = f.usages.indexOf(targetUsage)
    if (idx >= 0) writeBits(buf, f.bitOff, f.bitLen, f.logMin + idx)
  }
}
