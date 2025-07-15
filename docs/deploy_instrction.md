## AWESOME-DIGITAL-HUMAN-部署指南

推荐使用容器部署，本地开发使用裸机开发部署  

### 系统要求
请确保您的机器满足以下最低系统要求：  
* CPU >= 2 Core
* RAM >= 4GB

### 裸机开发部署 - Ubuntu示例
> 基础环境
* python3.10（使用其他版本以及对应的库理论上也是可以的）
* node 推荐 20
> 运行
* 源码下载
```bash
# 下载源码
git clone https://github.com/wan-h/awesome-digital-human-live2d.git
```
* 运行server
```bash
# 安装依赖
pip install -r requirements.txt
# 安装ffmpeg
sudo apt install ffmpeg
# 启动
python main.py
```
* 运行web
```bash
cd web
# 使用高性能的npm
npm install -g pnpm
# 安装依赖
pnpm install
# 编译发布版本
pnpm run build
# 启动
pnpm run start
```

### 容器部署（体验首选，推荐）
无需本地构建, 直接拉取阿里云已构建镜像
> 基础环境
* 安装[docker-compose](https://docs.docker.com/compose/install/)
> 运行
* 启动容器
```bash
# 项目根目录下执行
docker-compose -f docker-compose-quickStart.yaml up -d
```

### 容器部署（容器开发首选）
> 基础环境
* 安装[docker-compose](https://docs.docker.com/compose/install/)
> 运行
* 启动容器
```bash
# 项目根目录下执行
docker-compose up --build -d
```

### 访问页面
本地浏览器访问路径:   
* 源码部署: http://localhost:3000  
* 容器部署: http://localhost:8880 
非本地浏览器访问路径:   
* 源码部署: http://{部署服务器IP}:3000  
* 容器部署: http://{部署服务器IP}:8880

### 设置
参考[操作指南](https://light4ai.feishu.cn/docx/XmGFd5QJwoBdDox8M7zcAcRJnje)中的设置部分

### 其他说明
* 若需要修改端口则需要修改docker-compose文件中nginx的映射端口以及web中[.env](../web/.env)的启动端口`NEXT_PUBLIC_SERVER_PORT` 