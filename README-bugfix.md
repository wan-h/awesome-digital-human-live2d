# 部署时会遇到的问题解决方案

## 1、群晖部署并使用tailscale组网网络不通的问题
群晖上部署了数字人，并通过tailscale组网进行连接，连接不上的原因不是数字人项目本身，而是因为群晖上tailscale up时天然不支持accept routes，导致群晖只能被单向访问，无法从群晖ping通局域网内其他tailscale客户端，导致访问失败。换成zerotier内网地址就可以了。

## 2、如何增加https协议部署,使得手机\ipad等设备可以使用语音按钮及沉浸模式语音输入
如果只是电脑使用，可以直接通过 chrome://flags/#unsafely-treat-insecure-origin-as-secure 使用。

如果已经通过nginx或者群晖自带的反向代理配置了https，遇到【浏览器控制台提示：
Mixed Content: The page at 'https://100.64.0.7:8888/sentio ' was loaded over HTTPS, but requested an insecure resource 'http://100.64.0.7:8880/adh/asr/v0/engine/file '. This request has been blocked; the content must be served over HTTPS.】

那么解决方法如下：

1、宿主机进入web容器中
```abc
docker exec -it awesome_digital_human-adh-web-1 /bin/sh
```

2、进入指定目录
```abc
cd /workspace/dist/static/chunks/app/(products)/sentio/
```

3、好习惯备份一下，防止翻车
```abc
cp ./page-0b750d4e81e7fc5b.js ./page-0b750d4e81e7fc5b.js.bak
```

4、把
```abc
return "http://" + (sZ.env.NEXT_PUBLIC_SERVER_IP || (null === (e = globalThis.location) || void 0 === e ? void 0 : e.hostname)) + ":8880"
```
替换为
```abc
return (globalThis.location?.protocol || "http:") + "//" + (globalThis.location?.hostname || "localhost") + (globalThis.location?.port ? ":" + globalThis.location.port : "")
```

5、宿主机提交变更，这样重新部署就不会再重复上述操作了
```abc
docker commit awesome_digital_human-adh-web-1 registry.cn-hangzhou.aliyuncs.com/awesome-digital-human/adh-web:main-latest-https
```

原理就是作者在web容器中的page-0b750d4e81e7fc5b.js文件里，把路径给写死了，固定成了http，导致出现http和https的混合内容，导致访问失败。按照我上面的步骤更改后，就彻底解决了后端的问题，然后前端比如你使用的群晖，就在 控制面板-登录门户-高级-反向代理服务器中设置一下。参数如下：

反向代理服务器名称：ADH数字人反代
来源协议：https
来源主机名： *
来源端口：8888

目的地协议：http
目的地主机名：localhost
目的地端口：8880

## 3、如何修改启动时的默认角色
进入web容器
```abc
docker exec -it awesome_digital_human-adh-web-1 /bin/sh
```

查找包含HaruGreeter的js文件
```abc
find . -name "*.js" | xargs grep -l "HaruGreeter"
```

可以找到以下两个

./dist/server/app/\(products\)/sentio/page.js

./dist/static/chunks/app/\(products\)/sentio/page-0b750d4e81e7fc5b.js

直接进行编辑
```abc
vi ./dist/static/chunks/app/\(products\)/sentio/page-0b750d4e81e7fc5b.js
```

快速定位
/HaruGreeter  找到下面这里，修改为Kei即可
/sc = "HaruGreeter"    sc = "Kei"

## 4、语音输入框位置修正
把docker容器awesome_digital_human-adh-web-1  中/workspace/dist/static/css/f8b2a301a9578d95.css文件拷贝到宿主机 /volume1/Download，方便修改

docker cp awesome_digital_human-adh-web-1:/workspace/dist/static/css/f8b2a301a9578d95.css /volume1/Download

docker cp /volume1/Download/f8b2a301a9578d95.css awesome_digital_human-adh-web-1:/workspace/dist/static/css/

vscode编辑器加到最后

.flex.flex-col.full-height-minus-64px {height: calc(100dvh - 84px) !important;padding-bottom: 0 !important;}.flex.flex-col.w-4\/5\.md\:w-2\/3\.2xl\:w-1\/2.items-start.z-10{position:fixed!important;left:50%!important;bottom:0!important;transform:translateX(-50%)!important;width:80%!important;max-width:768px!important;z-index:100!important;margin:0!important}

## 有图有真相，最终效果：
![修改完成后的最终效果](https://raw.githubusercontent.com/simplify123/awesome-digital-human-live2d/refs/heads/main/%E6%9C%80%E7%BB%88%E6%95%88%E6%9E%9C.webp)
