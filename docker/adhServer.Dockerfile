# FROM python:3.10.15-bookworm
# 使用阿里云镜像
FROM registry.cn-hangzhou.aliyuncs.com/awesome-digital-human/python:3.10.15-bookworm


# 中文问题
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8

# 东八区问题
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# apt修改国内源
RUN sed -i 's@deb.debian.org@repo.huaweicloud.com@g' /etc/apt/sources.list.d/debian.sources

RUN rm /var/lib/apt/lists/* -vf

# apt安装依赖库
RUN apt update \
  && apt-get install -y git g++ vim python3-pip ffmpeg\
  && rm -rf /var/lib/apt/lists/*

# pip设置修改
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 添加代码
ADD . /workspace
RUN rm -rf /workspace/web/
WORKDIR /workspace

# 安装pip依赖库
RUN pip install -r /workspace/requirements.txt

ENTRYPOINT ["python3", "main.py"]