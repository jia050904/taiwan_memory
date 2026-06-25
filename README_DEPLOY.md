# 台湾铁杆粉栖息地部署说明

## 先说结论

这个项目不是纯静态网页。它需要 Node 后端，因为要：

- 抓小红书 / 抖音标题和封面
- 保存旅游攻略、低脂小舞蹈、动态墙内容
- 保存动态墙上传的图片
- 提供音乐文件

所以不要部署到 GitHub Pages 这种只能放静态网页的地方。

## 你需要准备

1. 一个 GitHub 仓库
2. 一个能跑 Node 的平台，例如 Render、Railway、Fly.io、VPS
3. 一个持久化存储位置，用来保存：
   - `data/store.json`
   - `uploads/`

如果平台没有持久化存储，网站也能打开，但重启或重新部署后动态和上传图片可能会丢。

## 本地运行

```bash
npm start
```

打开：

```text
http://localhost:4173/
```

不要直接打开 `index.html` 文件。

## 部署环境变量

如果平台支持环境变量，推荐设置：

```text
NODE_ENV=production
HOST=0.0.0.0
DATA_DIR=/data
UPLOAD_DIR=/data/uploads
```

如果平台的持久硬盘挂载到别的位置，就把 `DATA_DIR` 和 `UPLOAD_DIR` 改成对应路径。

## 启动命令

```bash
npm start
```

## 音乐文件

播放器当前读取：

```text
audio/tai-cong-ming.mp3
```

如果网站是公开访问的，不建议直接公开发布没有授权的商业歌曲文件。更稳的方式是：

- 换成你们自己有权使用的音频
- 或者把网站加访问密码，只给你们两个人用
- 或者先不上传 mp3，让播放器保留但不播放

## 下一步建议

如果你想完全免费、稳定、不担心服务器硬盘丢数据，下一步可以把 `data/store.json` 和 `uploads/` 换成 Firebase 或 Supabase。
