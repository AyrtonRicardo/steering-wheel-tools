<template>
  <div class="breakdown">
    <p class="panel-title">How it was calculated</p>
    <div class="steps">
      <div v-for="(step, i) in steps" :key="i" class="step">
        <span class="step-num">{{ i + 1 }}</span>
        <div class="step-body">
          <p class="step-formula">{{ step.formula }}</p>
          <p class="step-sub">= {{ step.substitution }}</p>
          <p class="step-result">= {{ step.result }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  steps: { type: Array, required: true },
  // Each step: { formula: string, substitution: string, result: string }
})
</script>

<style scoped>
.breakdown {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
}

.step-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  margin-top: 1px;
}

.step-body {
  flex: 1;
  min-width: 0;
}

.step-formula {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.step-sub {
  font-size: 12px;
  color: var(--text-dim);
  font-family: 'Courier New', Courier, monospace;
  margin-bottom: 2px;
  padding-left: 8px;
}

.step-result {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-family: 'Courier New', Courier, monospace;
  padding-left: 8px;
}
</style>
