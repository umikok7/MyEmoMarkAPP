const config = {
  extends: ["stylelint-config-standard"],
  rules: {
    "import-notation": ["string", { severity: "error" }],
    "selector-class-pattern": null,
    "declaration-block-no-redundant-longhand-properties": true,
    "no-descending-specificity": true,
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "theme",
          "apply",
          "layer",
          "utility",
          "variant",
          "custom-variant",
          "tailwind",
          "plugin",
          "source",
          "config",
          "reference",
          "responsive",
          "screen"
        ]
      }
    ]
  }
};

export default config;
