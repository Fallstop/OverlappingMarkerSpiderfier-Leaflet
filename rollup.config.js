import typescript from '@rollup/plugin-typescript';
import { uglify } from 'rollup-plugin-uglify';
import _ from 'lodash';

import pkg from './package.json';

const baseConfig = {
  input: 'src/oms.ts',
  output: {
    file: 'build/oms.js',
    format: 'cjs',
    name: 'OverlappingMarkerSpiderfier'
  },
  plugins: [
    typescript({lib: ["es5", "es6"], target: "es5"})
  ]
};

export default [
  baseConfig,
  _.merge(_.cloneDeep(baseConfig), {
    output: {
      file: pkg.main
    },
    plugins: [
      uglify()
    ]
  })
];
