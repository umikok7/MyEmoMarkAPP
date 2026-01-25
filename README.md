This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Netlify 部署（前端 + 后端函数）

本项目的后端已改为 Netlify Functions（Node.js + PostgreSQL）。部署时请在 Netlify 的站点设置中：

- **Base directory**：`frontend`
- **Build command**：`npm run build`
- **Publish directory**：`.next`

并配置以下环境变量（Netlify → Site settings → Environment variables）：

- `DATABASE_URL`：你的 PostgreSQL 连接串（例如 Neon）
- `DATABASE_SSL`：本地或内网环境可设为 `false`，线上通常不需要设置

数据库初始化 SQL 在 `db/schema.sql`。

后端入口函数在 `frontend/netlify/functions/api.js`，前端通过 `/api/*` 访问，已由 `netlify.toml` 自动转发。

## Vercel 部署（推荐）

本项目已新增 Next.js Route Handlers（`app/api/*`），Vercel 会自动将 `/api/*` 作为后端接口部署。

请在 Vercel 项目设置中添加环境变量：

- `DATABASE_URL`
- `DATABASE_SSL`（可选，默认 true）

**注意**：在 Vercel 上不要设置 `NEXT_PUBLIC_API_BASE_URL`，保持默认 `/api` 即可。

## 本地调试环境变量

请复制 `frontend/.env.example` 为 `.env.local` 或 `.env`，并填写自己的 PostgreSQL 连接配置；Netlify Functions 也会读取这些变量。

## 本地后端（Netlify Functions）启动方式

由于 `netlify dev` 在部分环境会遇到 `@netlify/plugin-nextjs` 的插件报错，本地测试推荐用下面方式：

1. 终端 A：启动后端函数（脚本内已通过 `env-cmd -f .env` 加载环境变量）
	- `npm run dev:api`
2. 终端 B：启动前端
	- `npm run dev`
3. 在 `.env` 中设置本地 API 地址（与 Functions 端口一致）：
	- `NEXT_PUBLIC_API_BASE_URL=http://localhost:9999/.netlify/functions/api`

这样 `/api/*` 会走本地 Functions，并能连上你的数据库。

## Netlify 部署步骤

1. 在 [Netlify 控制面板](https://app.netlify.com/)新建站点，连接你的 Git 仓库（建议使用 `main`/`master` 分支）。
2. 在 Build settings 中填写：
	- Base directory: `frontend`
	- Build command: `npm run build`
	- Publish directory: `.next`
	- Functions directory: `netlify/functions`
3. 添加部署所需环境变量（与本地 `.env` 保持一致）：
	- `DATABASE_URL`（必选）
	- `DATABASE_SSL`（可选，默认 `true`）
4. 保存后执行 Deploy，如果使用 Netlify CLI 本地测试，运行 `netlify dev` 会自动暴露 `/api/*`。

## 参考

如果你需要更细致的 Netlify 整体部署说明，可以查阅官方文档：https://docs.netlify.com

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
