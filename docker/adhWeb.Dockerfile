# FROM node:alpine3.19
# 使用阿里云镜像
FROM registry.cn-hangzhou.aliyuncs.com/awesome-digital-human/node:alpine3.19

# 添加代码
ADD web/ /workspace
WORKDIR /workspace

# npm换源
RUN npm config set registry https://registry.npmmirror.com

# 安装Python和pip
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk update && apk add --no-cache python3 make gcc g++ musl-dev linux-headers

# 安装npm依赖库
RUN npm install -g pnpm \
    && CI=true pnpm install \
    && pnpm run build

ENTRYPOINT ["pnpm", "run", "start"]