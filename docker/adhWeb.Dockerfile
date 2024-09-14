FROM node:alpine3.19

# 添加代码
ADD web/ /workspace
WORKDIR /workspace

# npm换源
RUN npm config set registry https://registry.npmmirror.com

# 安装npm依赖库
RUN npm install -g pnpm \
    && npm install \
    && npm run build

ENTRYPOINT ["npm", "run", "start"]