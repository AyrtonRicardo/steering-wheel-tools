<template>
  <main class="tool-page">
    <div class="container">

      <div class="tool-page-header">
        <RouterLink to="/" class="back-link">&#8592; Home</RouterLink>
        <h1 class="tool-page-title">Driver <span class="accent">Setup</span></h1>
        <p class="tool-page-desc">
          Step-by-step setup wizards for the motor drivers supported by OpenFFBoard.
          Pick the driver that matches your hardware.
        </p>
      </div>

      <div class="tool-grid">
        <RouterLink to="/vesc-setup" class="tool-card">
          <div class="tool-icon">&#9889;</div>
          <h3 class="tool-name">VESC Setup Wizard</h3>
          <p class="tool-desc">
            Configure VESC with VESC Tool for direct-drive force feedback.
            Covers wiring, firmware flashing, FOC calibration, and OpenFFBoard integration.
          </p>
          <div>
            <span class="tool-tag">VESC</span>
            <span class="tool-tag">FOC</span>
            <span class="tool-tag">BLDC</span>
          </div>
        </RouterLink>

        <RouterLink to="/tmc-setup" class="tool-card">
          <div class="tool-icon">&#128268;</div>
          <h3 class="tool-name">TMC Setup Wizard</h3>
          <p class="tool-desc">
            Configure a TMC4671 + TMC6100 based direct-drive system.
            Covers SPI bring-up, encoder calibration, FOC current-loop tuning, and FFB integration.
          </p>
          <div>
            <span class="tool-tag">TMC4671</span>
            <span class="tool-tag">TMC6100</span>
            <span class="tool-tag">FOC</span>
          </div>
        </RouterLink>
      </div>

    </div>
  </main>
</template>
