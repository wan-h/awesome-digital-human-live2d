# FROM node:alpine3.19
# 使用阿里云镜像
FROM registry.cn-hangzhou.aliyuncs.com/awesome-digital-human/adh-web:main-latest

# 添加代码
ADD web/ /workspace
WORKDIR /workspace

# npm换源
RUN npm config set registry https://registry.npmmirror.com

# 安装npm依赖库
RUN npm install -g pnpm \
    && pnpm install \
    && pnpm run build

ENTRYPOINT ["pnpm", "run", "start"]