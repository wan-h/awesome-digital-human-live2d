FROM node:alpine3.19

# 添加代码
ADD live2dWeb/ /workspace
WORKDIR /workspace

# 安装npm依赖库
RUN npm install