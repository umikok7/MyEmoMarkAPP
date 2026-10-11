// 提交规范：沿用本仓库现有风格 `type:YYYYMMDD/中文描述`，强制 type 枚举 + 中文描述
const TYPE_ENUM = ["feat", "fix", "perf", "test", "docs", "style", "refactor", "build", "other"];
const CHINESE_CHAR = /[一-龥]/;

const config = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((.*)\))?:\s*(.*)$/,
      headerCorrespondence: ["type", "scope", "subject"]
    }
  },
  rules: {
    "type-empty": [2, "never"],
    "type-enum": [2, "always", TYPE_ENUM],
    "type-case": [2, "always", "lower-case"],
    "scope-empty": [0],
    "subject-empty": [2, "never"],
    "subject-must-contain-chinese": [2, "always"]
  },
  plugins: [
    {
      rules: {
        "subject-must-contain-chinese": (parsed) => {
          const { subject } = parsed;
          if (!CHINESE_CHAR.test(subject ?? "")) {
            return [false, "变更描述必须包含中文，不允许纯英文提交信息"];
          }
          return [true];
        }
      }
    }
  ]
};

export default config;
