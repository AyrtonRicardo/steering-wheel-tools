<template>
  <header class="site-header">
    <div class="container">
      <div class="header-inner">
        <RouterLink to="/" class="logo">
          <span class="logo-icon">&#9696;</span>
          <span class="logo-text">DIY Steering Wheel Tools</span>
        </RouterLink>
        <nav class="site-nav">
          <RouterLink to="/" class="nav-link" :class="{ active: route.path === '/' }">Home</RouterLink>
          <div class="nav-dropdown" :class="{ active: isDriverSetupActive }">
            <button class="nav-link nav-dropdown-trigger" :class="{ active: isDriverSetupActive }">
              Driver Setup <span class="nav-dropdown-arrow">&#9660;</span>
            </button>
            <div class="nav-dropdown-menu">
              <RouterLink to="/vesc-setup" class="nav-dropdown-item" :class="{ active: route.path === '/vesc-setup' }">VESC Setup</RouterLink>
              <RouterLink to="/tmc-setup" class="nav-dropdown-item" :class="{ active: route.path === '/tmc-setup' }">TMC Setup</RouterLink>
            </div>
          </div>
          <div class="nav-dropdown" :class="{ active: isCalcsActive }">
            <button class="nav-link nav-dropdown-trigger" :class="{ active: isCalcsActive }">
              Calculators <span class="nav-dropdown-arrow">&#9660;</span>
            </button>
            <div class="nav-dropdown-menu">
              <RouterLink to="/encoder-calculator" class="nav-dropdown-item" :class="{ active: route.path === '/encoder-calculator' }">Encoder Calc</RouterLink>
              <RouterLink to="/torque-calculator" class="nav-dropdown-item" :class="{ active: route.path === '/torque-calculator' }">Torque Calc</RouterLink>
              <RouterLink to="/motor-gains" class="nav-dropdown-item" :class="{ active: route.path === '/motor-gains' }">Motor Gains Calc</RouterLink>
            </div>
          </div>
          <div class="nav-dropdown" :class="{ active: isExtrasActive }">
            <button class="nav-link nav-dropdown-trigger" :class="{ active: isExtrasActive }">
              Extras <span class="nav-dropdown-arrow">&#9660;</span>
            </button>
            <div class="nav-dropdown-menu">
              <RouterLink to="/button-matrix" class="nav-dropdown-item" :class="{ active: route.path === '/button-matrix' }">Button Matrix</RouterLink>
              <RouterLink to="/wheelcheck-plotter" class="nav-dropdown-item" :class="{ active: route.path === '/wheelcheck-plotter' }">WheelCheck LUT Plotter</RouterLink>
              <RouterLink to="/wheel-tester" class="nav-dropdown-item" :class="{ active: route.path === '/wheel-tester' }">FFBoard Wheel Tester</RouterLink>
            </div>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const isCalcsActive = computed(() =>
  ['/encoder-calculator', '/torque-calculator', '/motor-gains'].includes(route.path)
)
const isExtrasActive = computed(() =>
  ['/button-matrix', '/wheelcheck-plotter', '/wheel-tester'].includes(route.path)
)
const isDriverSetupActive = computed(() =>
  route.path === '/vesc-setup' || route.path === '/tmc-setup'
)
</script>
