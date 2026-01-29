This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# 全栈开发部署流程

技术栈：next.js, vercel, postgreSQL（Neon）

## 部署流程
快速开发迭代MVP版本建议选用的技术栈一定是next.js前后端一把梭，可以在一个项目目录下同时写react组件以及serverless API。在完成本地调试需要部署的时候，选用原生支持next.js的vercel平台进行一键CICD部署；并配置以下环境变量：

- `DATABASE_URL`：你的 PostgreSQL 连接串（Neon）
- `DATABASE_SSL`：本地或内网环境可设为 `false`，线上通常不需要设置

数据库初始化 SQL 在 `db/schema.sql`。


## Vercel 部署
本项目已新增 Next.js Route Handlers（`app/api/*`），Vercel 会自动将 `/api/*` 作为后端接口部署。

## 数据库
选用Neon平台，本质上是postgreSQL，但是提供了500M的免费存储额度，适合MVP版本

## 域名
vercel部署后所分配的域名不支持国内访问，这里选择`NameSilo`平台进行域名的购买，可以很低的价格买到一些非热门的域名

## 域名托管
使用`cloudfare`进行域名托管，托管成功后就能将NameSilo购买的域名绑定到vercel对应的项目中，随后就可以通过该域名国内访问。

## 费用
vercel前后端部署免费，Neon数据库500M免费存储，cloudfare免费，域名最便宜的0.99¥一年，全部加一块1刀解决，作为个人自用项目来说是足够的。

## TODOList
