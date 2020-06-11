// import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import babel from "rollup-plugin-babel";
import json from "@rollup/plugin-json";
import autoExternal from "rollup-plugin-auto-external";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: [{ dir: "dist", format: "cjs" }],
    plugins: [
      autoExternal(),
      // resolve(), // so Rollup can find `ms`
      json(),
      babel({
        runtimeHelpers: true,
        exclude: ["node_modules/**"],
      }),
      commonjs(), // so Rollup can convert `ms` to an ES module
      typescript({ exclude: ["**/*.test.ts", "**/__tests__/*"] }),
    ],
  },
];
