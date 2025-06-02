# Official Website

## 启动
### 本地启动
```bash
pnpm install
# 开发模式
pnpm run dev
# 生产模式
pnpm run build
pnpm run start
``` 
### Docker 启动
```bash
# 构建镜像
docker build -t registry.cn-hangzhou.aliyuncs.com/ai-romantic/official-website:v0.0.1 .
# 启动镜像
docker run -d --restart=always --name official-website -p 3000:3000 registry.cn-hangzhou.aliyuncs.com/ai-romantic/official-website:v0.0.1
```