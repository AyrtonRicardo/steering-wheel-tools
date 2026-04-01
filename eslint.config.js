import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Allow single-word component names (e.g. HomeView, EncoderCalc)
      'vue/multi-word-component-names': 'off',

      // Formatting-only rules — the codebase uses a compact inline style;
      // these are style preferences not correctness issues.
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'vue/html-indent': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/multiline-html-element-content-newline': 'off',
    },
  },
]
