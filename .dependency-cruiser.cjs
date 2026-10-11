/**
 * dependency-cruiser 分层规则（Next.js 适配版）。
 *
 * 依赖方向：app 页面(薄) → features/<name>/（仅 index.ts 公开入口）→ 共享层（components/lib/store/hooks/types）
 * 服务端代码（app/api、lib/server、lib/prisma、lib/encryption、lib/generated）不参与前端分层校验。
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "禁止循环依赖",
      from: {},
      to: { circular: true }
    },
    {
      name: "no-orphans",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "(^|/)layout\\.tsx$",
          "(^|/)page\\.tsx$",
          "(^|/)route\\.tsx$",
          "(^|/)not-found\\.tsx$",
          "(^|/)__tests__/",
          "config\\.(ts|mjs|cjs)$",
          "^\\.dependency-cruiser\\.cjs$",
          "vitest\\.setup\\.ts$",
          "next-env\\.d\\.ts$"
        ]
      },
      to: {}
    },
    {
      name: "shared-layer-cannot-depend-on-features",
      severity: "error",
      from: { path: "^(components|lib|store|hooks|types)/" },
      to: { path: "^features/" }
    },
    {
      name: "shared-layer-cannot-depend-on-pages",
      severity: "error",
      from: { path: "^(components|lib|store|hooks|types)/" },
      to: { path: "^app/" }
    },
    {
      name: "features-cannot-depend-on-pages",
      severity: "error",
      from: { path: "^features/" },
      to: { path: "^app/" }
    },
    {
      name: "features-must-use-sibling-feature-barrel-only",
      severity: "error",
      comment: "跨 feature 只允许通过对方 index.ts barrel 依赖",
      from: {
        path: "^features/([^/]+)/",
        pathNot: "^features/([^/]+)/index\\.ts$"
      },
      to: {
        path: "^features/([^/]+)/(?!index\\.ts$).+",
        pathNot: "^features/$1/"
      }
    },
    {
      name: "no-deep-import-into-feature-internals-from-outside",
      severity: "error",
      comment: "feature 内部文件（api/hooks/store/components）只能被 feature 自身 import",
      from: { pathNot: "^features/" },
      to: {
        path: "^features/([^/]+)/(?!index\\.ts$).+"
      }
    },
    {
      name: "client-cannot-depend-on-server-only",
      severity: "error",
      comment: "客户端分层禁止触碰服务端模块（prisma/加密/session）",
      from: {
        path: "^(features|components|store|hooks|lib)/",
        pathNot: "^lib/server/"
      },
      to: { path: "^lib/(server|prisma\\.ts|encryption\\.ts)" }
    },
    {
      name: "no-import-of-test-files",
      severity: "error",
      from: { pathNot: "\\.test\\.(ts|tsx)$" },
      to: { path: "\\.test\\.(ts|tsx)$" }
    }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    exclude: {
      path: [
        "^lib/generated/",
        "^app/api/",
        "^lib/server/",
        "^react-vite-ts-bootstrap/",
        "^\\.next/",
        "^public/"
      ]
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"]
    },
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
      archi: {
        collapsePattern: "^(features/[^/]+|app|components/ui|components|lib|store|hooks)"
      }
    }
  }
};
