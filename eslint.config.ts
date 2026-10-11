import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import type { Linter } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import checkFile from "eslint-plugin-check-file";
import reactDOM from "eslint-plugin-react-dom";
import reactHooks from "eslint-plugin-react-hooks";
import reactX from "eslint-plugin-react-x";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

const OFF = "off" as const;
const WARN = "warn" as const;
const ERROR = "error" as const;

// 存量迁移策略（skill 2.3）：GATE 门禁规则以 warn 暴露债务，
// CI 通过 --max-warnings=MAX_WARNINGS 锁定债务不新增，逐步下调。
const GATE_RULES: Linter.RulesRecord = {
  complexity: [WARN, 15],
  "max-depth": [WARN, 5],
  "max-statements": [WARN, 20],
  "max-lines": [WARN, { max: 500, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": [WARN, { max: 120, skipBlankLines: true, skipComments: true }],
  "max-params": [WARN, 5],
  "max-classes-per-file": [WARN, 1],
  "no-nested-ternary": WARN,
  "sonarjs/cognitive-complexity": [WARN, 15],
  "@typescript-eslint/no-explicit-any": WARN
};

const LOCKED_GATE_RULE_NAMES = [
  "complexity",
  "max-depth",
  "max-statements",
  "max-lines",
  "max-lines-per-function",
  "max-params",
  "max-classes-per-file",
  "no-nested-ternary",
  "sonarjs/cognitive-complexity",
  "@typescript-eslint/no-explicit-any"
];

const GUARDRAIL_RULES: Linter.RulesRecord = {
  curly: [WARN, "all"],
  eqeqeq: [WARN, "always"],
  "no-duplicate-imports": WARN,
  "no-magic-numbers": [
    WARN,
    { ignore: [0, 1, -1, 2], ignoreEnums: true, ignoreReadonlyClassProperties: true }
  ],
  "no-console": [WARN, { allow: ["warn", "error"] }],

  // 存量代码在 effect 中同步 setState / 渲染期读 ref，数据层迁移 useQuery 后逐步消除
  "react-hooks/set-state-in-effect": WARN,
  "react-hooks/refs": WARN,

  "sonarjs/no-all-duplicated-branches": WARN,
  "sonarjs/no-identical-expressions": WARN,
  "sonarjs/no-gratuitous-expressions": WARN,
  "sonarjs/no-redundant-jump": WARN,
  "sonarjs/prefer-immediate-return": WARN,
  "sonarjs/no-ignored-return": WARN,
  "sonarjs/no-collection-size-mischeck": WARN,
  "sonarjs/no-nested-conditional": WARN
};

const TYPESCRIPT_RULES: Linter.RulesRecord = {
  "no-unused-vars": OFF,

  // 存量迁移（skill 2.3）：类型卫生类规则对存量代码降为 warn，CI 用 --max-warnings 锁定不新增
  "@typescript-eslint/prefer-nullish-coalescing": WARN,
  "@typescript-eslint/no-confusing-void-expression": WARN,
  "@typescript-eslint/no-unsafe-member-access": WARN,
  "@typescript-eslint/no-unsafe-assignment": WARN,
  "@typescript-eslint/no-unsafe-argument": WARN,
  "@typescript-eslint/no-unsafe-call": WARN,
  "@typescript-eslint/no-unsafe-return": WARN,
  "@typescript-eslint/no-unnecessary-condition": WARN,
  "@typescript-eslint/no-unnecessary-type-assertion": WARN,
  "@typescript-eslint/no-floating-promises": WARN,
  "@typescript-eslint/use-unknown-in-catch-callback-variable": WARN,
  "@typescript-eslint/non-nullable-type-assertion-style": WARN,
  "@typescript-eslint/no-deprecated": WARN,
  "@typescript-eslint/no-meaningless-void-operator": WARN,
  "@typescript-eslint/no-redundant-type-constituents": WARN,
  "@typescript-eslint/require-await": WARN,
  "@typescript-eslint/dot-notation": WARN,

  "@typescript-eslint/consistent-type-imports": [
    ERROR,
    { prefer: "type-imports", fixStyle: "inline-type-imports" }
  ],
  "@typescript-eslint/no-import-type-side-effects": ERROR,
  "@typescript-eslint/naming-convention": [
    ERROR,
    { selector: "typeLike", format: ["PascalCase"] },
    {
      selector: "variable",
      format: ["camelCase", "UPPER_CASE", "PascalCase"],
      leadingUnderscore: "allow"
    },
    { selector: "parameter", format: ["camelCase"], leadingUnderscore: "allow" }
  ],
  "@typescript-eslint/no-misused-promises": [ERROR, { checksVoidReturn: { attributes: false } }],
  "@typescript-eslint/no-unused-vars": [
    ERROR,
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
  ],
  "@typescript-eslint/restrict-template-expressions": [
    ERROR,
    { allowNumber: true, allowBoolean: true }
  ],

  // Next.js 约定适配：default import、宽松布尔判断等与 Next 生态惯例冲突的规则降级
  "react-x/no-default-export": OFF,
  "@typescript-eslint/strict-boolean-expressions": WARN,
  "@typescript-eslint/switch-exhaustiveness-check": WARN,
  "@typescript-eslint/prefer-readonly": WARN,

  "@typescript-eslint/array-type": OFF,
  "@typescript-eslint/consistent-type-definitions": OFF
};

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "lib/generated/**",
      "next-env.d.ts",
      "react-vite-ts-bootstrap/**"
    ]
  },
  reactHooks.configs.flat["recommended-latest"],
  reactX.configs["recommended-type-checked"],
  reactDOM.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    }
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    rules: TYPESCRIPT_RULES
  },
  eslintConfigPrettier,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { sonarjs, "eslint-comments": eslintComments },
    rules: {
      ...GATE_RULES,
      ...GUARDRAIL_RULES,
      "eslint-comments/no-restricted-disable": [ERROR, ...LOCKED_GATE_RULE_NAMES]
    }
  },
  {
    files: ["*.config.ts", "*.config.mjs"],
    rules: {
      "no-magic-numbers": OFF,
      "@typescript-eslint/no-unsafe-assignment": OFF,
      "@typescript-eslint/no-unsafe-member-access": OFF,
      "@typescript-eslint/no-unsafe-call": OFF
    }
  },
  {
    // 服务端（App Router route handlers）：Next 处理器签名与前端门禁部分冲突，仅保留基础检查
    files: ["app/api/**/*.ts"],
    rules: {
      "no-console": OFF,
      "@typescript-eslint/no-unsafe-return": OFF
    }
  },
  {
    files: ["**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "no-magic-numbers": OFF,
      "max-lines-per-function": OFF,
      "max-lines": OFF,
      "sonarjs/no-identical-expressions": OFF,
      "sonarjs/no-gratuitous-expressions": OFF,
      "@typescript-eslint/unbound-method": OFF,
      "@typescript-eslint/require-await": OFF,
      "@typescript-eslint/only-throw-error": OFF
    }
  },
  {
    // React 组件文件 PascalCase（app/** 由 Next 约定接管，不参与）
    files: [
      "components/**/*.tsx",
      "features/*/components/**/*.tsx",
      "layouts/**/*.tsx",
      "store/**/*.tsx",
      "hooks/**/*.tsx"
    ],
    ignores: ["components/ui/**", "**/__tests__/**"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [ERROR, { "**/*.tsx": "PASCAL_CASE" }]
    }
  },
  {
    files: ["components/**/*.ts", "features/**/*.ts", "lib/**/*.ts", "store/**/*.ts", "hooks/**/*.ts"],
    ignores: ["**/*.d.ts", "**/__tests__/**"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [ERROR, { "**/*.ts": "KEBAB_CASE" }]
    }
  },
  {
    files: ["components/**", "features/**", "lib/**", "store/**", "hooks/**"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/folder-naming-convention": [
        ERROR,
        {
          "features/*/": "KEBAB_CASE",
          "features/*/components/*/": "PASCAL_CASE"
        }
      ]
    }
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/folder-match-with-fex": [
        ERROR,
        {
          "*.test.{ts,tsx}": "**/__tests__/"
        }
      ]
    }
  }
);
