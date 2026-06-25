# 台湾记忆部署说明

## 现在这个版本怎么存东西

- 旅游攻略、低脂小舞蹈、动态墙文字：存在 Firebase Firestore
- 动态墙图片：存在 Cloudinary
- 小红书 / 抖音标题和封面抓取：由 Render 上的 Node 服务负责

所以 Render 免费版睡眠或重启以后，内容也不会因为本地硬盘清空而丢。

## Firebase 要先确认

进 Firebase 控制台，打开 Firestore Database。

如果你们只打算两个人用，可以先用最简单的公开规则：

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

这代表知道网址的人都能读写。后面如果想加密码，再把规则收紧。

## Cloudinary 要先确认

Cloudinary 里需要有一个 unsigned upload preset：

```txt
taiwan_memory
```

Cloud name 当前写在网页里：

```txt
dhpe1nuvd
```

不要把 API Secret 放进网页，也不要发给别人。

## Render 部署

1. 打开 Render
2. 点 New +
3. 选 Web Service
4. 连接 GitHub 仓库：`jia050904/taiwan_memory`
5. 填这些：

```txt
Build Command: npm install
Start Command: npm start
```

6. Environment 选 Node
7. 点 Deploy Web Service

部署好以后，Render 会给你一个网址，把这个网址发给朋友就能用了。

## 本地运行

```bash
npm start
```

打开：

```txt
http://localhost:4173/
```

不要直接打开 `index.html` 文件。

## 音乐

播放器读取：

```txt
audio/tai-cong-ming.mp3
```

如果公开部署，没有授权的商业音乐不要放到公开仓库里。网页可以保留播放器，音频可以之后换成你们有权使用的文件。
