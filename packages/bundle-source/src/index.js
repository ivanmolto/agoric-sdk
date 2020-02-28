import { rollup as rollup0 } from 'rollup';
import path from 'path';
import resolve0 from '@rollup/plugin-node-resolve';
import commonjs0 from '@rollup/plugin-commonjs';
import eventualSend from '@agoric/acorn-eventual-send';
import * as acorn from 'acorn';

const DEFAULT_MODULE_FORMAT = 'getExport';

export default async function bundleSource(
  startFilename,
  moduleFormat = DEFAULT_MODULE_FORMAT,
  access,
) {
  if (moduleFormat !== 'getExport') {
    throw Error(`moduleFormat ${moduleFormat} is not implemented`);
  }
  const { commonjsPlugin, rollup, resolvePlugin, pathResolve } = access || {
    rollup: rollup0,
    resolvePlugin: resolve0,
    commonjsPlugin: commonjs0,
    pathResolve: path.resolve,
  };
  const resolvedPath = pathResolve(startFilename);
  const bundle = await rollup({
    input: resolvedPath,
    treeshake: false,
    preserveModules: true,
    external: ['@agoric/evaluate', '@agoric/nat', '@agoric/harden'],
    plugins: [resolvePlugin({ preferBuiltins: true }), commonjsPlugin()],
    acornInjectPlugins: [eventualSend(acorn)],
  });
  const { output } = await bundle.generate({
    exports: 'named',
    format: 'cjs',
    sourcemap: true,
  });
  // console.log(output);

  // Create a source bundle.
  const sourceBundle = {};
  let entrypoint;
  for (const chunk of output) {
    if (chunk.isAsset) {
      throw Error(`unprepared for assets: ${chunk.fileName}`);
    }
    const { code, fileName, isEntry } = chunk;
    if (isEntry) {
      entrypoint = fileName;
    }
    sourceBundle[fileName] = code;
  }

  if (!entrypoint) {
    throw Error('No entrypoint found in output bundle');
  }

  // 'sourceBundle' is now an object that contains multiple programs, which references
  // require() and sets module.exports . This is close, but we need a single
  // stringifiable function, so we must wrap it in an outer function that
  // returns the entrypoint exports.
  //
  // build-kernel.js will prefix this with 'export default' so it becomes an
  // ES6 module. The Vat controller will wrap it with parenthesis so it can
  // be evaluated and invoked to get at the exports.

  // const sourceMap = `//# sourceMappingURL=${output[0].map.toUrl()}\n`;
  const sourceMap = `//# sourceURL:file:///bundle-source/${moduleFormat}-preamble.js`;

  // console.log(sourceMap);
  let source;
  if (moduleFormat === 'getExport') {
    // This function's source code is inlined in the output bundle.
    // It creates an evaluable string for a given module filename.
    function createEvalString(filename) {
      const code = sourceBundle[filename];
      if (!code) {
        return undefined;
      }
      return `\
(function getOneExport(require) { \
  'use strict'; \
  let exports = {}; \
  const module = { exports }; \
  \
  ${code}
  return module.exports;
})
//# sourceURL=file:///bundle-source/${moduleFormat}/${filename}
`;
    }

    // This function's source code is inlined in the output bundle.
    // It figures out the exports from a given module filename.
    const nsBundle = {};
    function computeExports(filename, powers) {
      const { eval: myEval, require: myRequire, _log } = powers;
      // This captures the endowed require.
      const match = filename.match(/^(.*)\/[^\/]+$/);
      const thisdir = match ? match[1] : '.';
      const contextRequire = mod => {
        // Do path algebra to find the actual source.
        const els = mod.split('/');
        let prefix;
        if (els[0][0] === '@') {
          // Scoped name.
          prefix = els.splice(0, 2).join('/');
        } else if (els[0][0] === '.') {
          // Relative.
          els.unshift(...thisdir.split('/'));
        } else {
          // Bare or absolute.
          prefix = els.splice(0, 1);
        }

        const suffix = [];
        for (const el of els) {
          if (el === '.' || el === '') {
            // Do nothing.
          } else if (el === '..') {
            // Traverse upwards.
            suffix.pop();
          } else {
            suffix.push(el);
          }
        }

        // log(mod, prefix, suffix);
        if (prefix !== undefined) {
          suffix.unshift(prefix);
        }
        let modPath = suffix.join('/');
        if (modPath.startsWith('./')) {
          modPath = modPath.slice(2);
        }
        // log('requiring', modPath);
        if (!(modPath in nsBundle)) {
          // log('evaluating', modPath);
          nsBundle[modPath] = computeExports(modPath, powers);
        }

        // log('returning', nsBundle[modPath]);
        return nsBundle[modPath];
      };

      const code = createEvalString(filename);
      if (!code) {
        // log('missing code for', filename, sourceBundle);
        return myRequire(filename);
      }

      // log('evaluating', code);
      return (1, myEval)(code)(contextRequire);
    }

    source = `\
function getExport() {
  'use strict';
  // Serialised sources.
  const moduleFormat = ${JSON.stringify(moduleFormat)};
  const sourceBundle = ${JSON.stringify(sourceBundle, undefined, 2)};
  const nsBundle = {};

  ${createEvalString}

  ${computeExports}

  // Evaluate the entrypoint recursively.
  const entrypoint = ${JSON.stringify(entrypoint)}
  return computeExports(entrypoint, { eval, require, log(...args) { return console.log(...args); } });
}`;
  }

  // console.log(sourceMap);
  return { source, sourceMap, moduleFormat };
}
