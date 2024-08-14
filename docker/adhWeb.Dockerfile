FROM node:alpine3.19

# 添加代码
ADD web/ /workspace
WORKDIR /workspace

# 安装npm依赖库
RUN npm install \
    && npm run build

ENTRYPOINT ["npm", "run", "start"]