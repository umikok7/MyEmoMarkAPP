const config = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: false,
  jsxSingleQuote: false,
  trailingComma: "none",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",
  plugins: ["@ianvs/prettier-plugin-sort-imports", "prettier-plugin-tailwindcss"],
  importOrder: [
    "^react$",
    "",
    "^next$",
    "^next/.*$",
    "",
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@/(lib|server|generated)",
    "^@/",
    "",
    "^[.]"
  ],
  importOrderTypeScriptVersion: "5.0.0"
};

export default config;
