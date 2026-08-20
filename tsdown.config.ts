import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'chrome/index': 'src/chrome/index.ts',
    'config/index': 'src/config/index.ts',
    'fixture/index': 'src/fixture/index.ts',
    'runner/index': 'src/runner/index.ts',
    'init/index': 'src/init/index.ts',
    'platform/index': 'src/platform/index.ts',
    'bin/cli': 'src/bin/cli.ts',
  },
  format: ['esm'],
  clean: true,
  dts: true,
  platform: 'node',
})
