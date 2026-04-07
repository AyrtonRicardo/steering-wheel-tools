/**
 * FFBoardHID — low-level driver for the OpenFFBoard vendor HID command protocol.
 *
 * The FFBoard exposes a bidirectional command interface on report ID 0xA1 alongside
 * the standard HID gamepad report.  Packet layout (24 bytes, little-endian):
 *
 *   [0]     type      uint8   — CmdType.*
 *   [1-2]   classId   uint16  — ClassId.*
 *   [3]     instance  uint8   — usually 0
 *   [4-7]   cmd       uint32  — command ID from Commands.md
 *   [8-15]  val       int64   — first data value (0 for reads)
 *   [16-23] addr      int64   — second data value (0 for single-value commands)
 *
 * Usage:
 *   const ffb = new FFBoardHID(hidDevice)
 *   ffb.addEventListener('message', e => console.log(e.detail))
 *   await ffb.request(ClassId.axis, 0, AxisCmd.degrees)
 *   // …
 *   ffb.destroy()
 *
 * Emits: CustomEvent 'message' with detail { type, classId, instance, cmd, val }
 */

export const REPORT_ID = 0xA1

export const CmdType = {
  write:        0,
  request:      1,
  info:         2,
  writeAddr:    3,
  requestAddr:  4,
  ack:          10,
  notFound:     13,
  notification: 14,
  err:          15,
}

export const ClassId = {
  system:  0x0000,
  ffb:     0x0001,
  axis:    0x0A01,
  effects: 0x0A02,
}

export const AxisCmd = {
  power:     0x00,
  degrees:   0x01,   // configured rotation range in deg
  esgain:    0x02,
  pos:       0x09,   // raw encoder position
  curtorque: 0x0D,
  curpos:    0x0E,   // axis position
  curspd:    0x0F,   // axis speed
  curaccel:  0x10,   // axis acceleration
}

export const FxCmd = {
  spring:   0x03,
  friction: 0x04,
  damper:   0x05,
  inertia:  0x06,
}

export class FFBoardHID extends EventTarget {
  #device
  #boundHandler

  constructor(device) {
    super()
    this.#device       = device
    this.#boundHandler = this.#onInputReport.bind(this)
    device.addEventListener('inputreport', this.#boundHandler)
  }

  /** Send a read request.  The reply arrives as a 'message' event. */
  async request(classId, instance, cmd) {
    await this.#send(CmdType.request, classId, instance, cmd, 0n, 0n)
  }

  /** Send a write command with a single value. */
  async write(classId, instance, cmd, val) {
    await this.#send(CmdType.write, classId, instance, cmd, BigInt(val), 0n)
  }

  /** Send a write command with a value and an address (WA commands). */
  async writeAddr(classId, instance, cmd, val, addr) {
    await this.#send(CmdType.writeAddr, classId, instance, cmd, BigInt(val), BigInt(addr))
  }

  /** Remove the input-report listener.  Call this when disconnecting. */
  destroy() {
    this.#device.removeEventListener('inputreport', this.#boundHandler)
  }

  // ── Private ────────────────────────────────────────────────────────────────

  async #send(type, classId, instance, cmd, val, addr) {
    const buf  = new ArrayBuffer(24)
    const view = new DataView(buf)
    view.setUint8(0, type)
    view.setUint16(1, classId, true)
    view.setUint8(3, instance)
    view.setUint32(4, cmd, true)
    view.setBigInt64(8, val, true)
    view.setBigInt64(16, addr, true)
    try {
      await this.#device.sendReport(REPORT_ID, new Uint8Array(buf))
    } catch {
      /* device may not expose vendor output reports — silently ignore */
    }
  }

  #onInputReport(event) {
    if (event.reportId !== REPORT_ID) return
    const msg = this.#parse(event.data)
    if (msg) this.dispatchEvent(new CustomEvent('message', { detail: msg }))
  }

  #parse(data) {
    if (data.byteLength < 24) return null
    const v = new DataView(data.buffer, data.byteOffset)
    return {
      type:     v.getUint8(0),
      classId:  v.getUint16(1, true),
      instance: v.getUint8(3),
      cmd:      v.getUint32(4, true),
      val:      Number(v.getBigInt64(8, true)),
    }
  }
}
