# 使用官方 Python 3.11 Slim 镜像（基于 Debian）
FROM python:3.11-slim

# 设置中文环境支持
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

# 设置时区为东八区
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 写入阿里云 Debian 源配置到 sources.list
RUN echo "deb https://mirrors.aliyun.com/debian/ bookworm main non-free contrib" > /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-updates main non-free contrib" >> /etc/apt/sources.list && \
    echo "deb https://mirrors.aliyun.com/debian/ bookworm-backports main non-free contrib" >> /etc/apt/sources.list

# 安装基础依赖（git、g++、ffmpeg 等）
RUN apt update && \
    apt install -y --no-install-recommends \
    git g++ ffmpeg curl libgl1 libsm6 flac && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# 设置 pip 使用清华源（可选）
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
# 升级 pip 并安装新版 setuptools 和 wheel
RUN pip install --no-cache-dir -U pip setuptools wheel
# 添加代码到容器中
WORKDIR /workspace
COPY . /workspace

# 删除 web 目录（根据需求决定是否保留）
RUN rm -rf /workspace/web/ || true

# 安装 Python 依赖
RUN pip install -r requirements.txt

# 启动命令
ENTRYPOINT ["python3", "main.py"]
