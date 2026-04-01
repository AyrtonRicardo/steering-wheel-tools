<template>
  <main style="flex: 1;">
    <section class="section">
      <div class="container">
        <h2 class="section-title">Tools</h2>
        <p class="section-sub">Interactive calculators and references for every stage of your build.</p>

        <div class="tool-grid">
          <RouterLink to="/encoder-calculator" class="tool-card">
            <div class="tool-icon">&#128260;</div>
            <h3 class="tool-name">Encoder Resolution Calculator</h3>
            <p class="tool-desc">
              Calculate your steering wheel's angular resolution from encoder PPR and any drive ratio.
              Verify you have enough counts-per-degree for smooth FFB.
            </p>
            <div>
              <span class="tool-tag">Encoder</span>
              <span class="tool-tag">OpenFFBoard</span>
            </div>
          </RouterLink>

          <RouterLink to="/torque-calculator" class="tool-card">
            <div class="tool-icon">&#9889;</div>
            <h3 class="tool-name">FFB Torque &amp; Force Calculator</h3>
            <p class="tool-desc">
              Convert motor torque (Nm) into grip-force at any wheel diameter.
              Compare motors side-by-side and check power supply requirements.
            </p>
            <div>
              <span class="tool-tag">Motor</span>
              <span class="tool-tag">Power Supply</span>
            </div>
          </RouterLink>

          <RouterLink to="/button-matrix" class="tool-card">
            <div class="tool-icon">&#9633;</div>
            <h3 class="tool-name">Button Matrix Calculator</h3>
            <p class="tool-desc">
              Design an optimal row×column matrix for your button box.
              Get pin counts, diode requirements, and a wiring diagram.
            </p>
            <div>
              <span class="tool-tag">Buttons</span>
              <span class="tool-tag">Wiring</span>
            </div>
          </RouterLink>

          <RouterLink to="/motor-gains" class="tool-card">
            <div class="tool-icon">&#128200;</div>
            <h3 class="tool-name">Motor Gains Calculator</h3>
            <p class="tool-desc">
              Calculate FOC current controller Kp and Ki for VESC from motor inductance,
              resistance, and desired torque slew rate. Full step-by-step breakdown.
            </p>
            <div>
              <span class="tool-tag">VESC</span>
              <span class="tool-tag">FOC</span>
              <span class="tool-tag">Kp / Ki</span>
            </div>
          </RouterLink>

          <RouterLink to="/wheelcheck-plotter" class="tool-card">
            <div class="tool-icon">📈</div>
            <h3 class="tool-name">WheelCheck LUT Plotter</h3>
            <p class="tool-desc">
              Drop one or more WheelCheck log2_*.csv files to plot and compare linearity curves.
              Export a LUT for Assetto Corsa or a 1D .cube file. Processed entirely in the browser.
            </p>
            <div>
              <span class="tool-tag">WheelCheck</span>
              <span class="tool-tag">LUT</span>
              <span class="tool-tag">Linearity</span>
            </div>
          </RouterLink>

          <RouterLink to="/driver-setup" class="tool-card">
            <div class="tool-icon">&#128268;</div>
            <h3 class="tool-name">Driver Setup Wizards</h3>
            <p class="tool-desc">
              Step-by-step setup guides for supported motor drivers — VESC and TMC4671+TMC6100.
              Covers wiring, firmware, FOC calibration, and OpenFFBoard integration.
            </p>
            <div>
              <span class="tool-tag">VESC</span>
              <span class="tool-tag">TMC4671</span>
              <span class="tool-tag">FOC</span>
              <span class="tool-tag">Setup</span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
