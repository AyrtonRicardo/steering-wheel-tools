import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ToolsView from '../views/ToolsView.vue'
import EncoderCalc from '../views/EncoderCalc.vue'
import TorqueCalc from '../views/TorqueCalc.vue'
import ButtonMatrix from '../views/ButtonMatrix.vue'
import DriverSetup from '../views/DriverSetup.vue'
import VescSetup from '../views/VescSetup.vue'
import TmcSetup from '../views/TmcSetup.vue'
import MotorGains from '../views/MotorGains.vue'
import WheelCheckPlotter from '../views/WheelCheckPlotter.vue'
import WheelTester from '../views/WheelTester.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/tools', component: ToolsView },
  { path: '/encoder-calculator', component: EncoderCalc },
  { path: '/torque-calculator', component: TorqueCalc },
  { path: '/button-matrix', component: ButtonMatrix },
  { path: '/driver-setup', component: DriverSetup },
  { path: '/vesc-setup', component: VescSetup },
  { path: '/tmc-setup', component: TmcSetup },
  { path: '/motor-gains', component: MotorGains },
  { path: '/wheelcheck-plotter', component: WheelCheckPlotter },
  { path: '/wheel-tester', component: WheelTester },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash }
    return { top: 0 }
  },
})
