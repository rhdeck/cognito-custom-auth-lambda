module.exports = function(api) {
  api.cache(true);
  const presets = [
    "@babel/preset-react",
    [
      "@babel/preset-env",
      {
        useBuiltIns: "entry",
        targets: {
          node: "10"
        },
        corejs: 3,
        modules: false
      }
    ]
  ];
  const plugins = [
    "@babel/plugin-proposal-class-properties",
    [
      "@babel/plugin-transform-runtime",
      { runtimeHelpers: true, regenerator: true }
    ]
  ];
  return { presets, plugins };
};
