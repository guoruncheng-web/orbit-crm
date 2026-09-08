# 中国大陆部署

- 分支：`china`
- 中文站点：`https://orbit.livegrc.chat`
- 英文站点：`https://orbit-crm-web-xi.vercel.app`
- 启动：复制 `.env.china.example` 为 `.env`，填写随机密码后运行 `docker compose -f compose.china.yml up -d --build`

中文部署使用独立 PostgreSQL 数据卷；数据库没有映射到宿主机公网端口。Web 通过同源 `/api` 访问 NestJS API，反向代理需要将 `/api/*` 和 `/docs-assets/*` 转发到 `orbit-cn-api:8080`，其余请求转发到 `orbit-cn-web:3000`。
