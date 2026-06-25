# 台湾记忆

轻量收藏网站。可以保存小红书 / 抖音链接，自动抓标题和封面；也可以像朋友圈一样发文字和照片。最开始是为台湾旅行攻略做的，所以默认有「旅游攻略」「低脂小舞蹈」「动态墙」三个区域。

在线预览：<https://taiwan-memory.onrender.com/>

## 功能

- 保存小红书 / 抖音分享链接
- 自动抓取标题、封面图，并保留原帖跳转
- 旅游攻略支持地点分类：台东、高雄、花莲、台北、台南、其他
- 每个地点下再分攻略 / 美食
- 单独的低脂小舞蹈收藏区
- 动态墙支持文字 + 1 张图片
- 右下角 BGM 播放器，支持上一首 / 下一首 / 自动循环
- 移动端适配

## 项目结构

.
├── index.html          # 前端页面、样式、Firebase/Cloudinary 配置
├── server.js           # Node 后端：静态文件、抓封面、代理图片、音频播放支持
├── package.json        # 启动命令
├── *.mp3               # BGM 音乐
```

## 如果你也想用这个项目

你需要准备：

- 一个 GitHub 仓库
- 一个 Firebase 项目，用 Firestore 存收藏和动态
- 一个 Cloudinary 账号，用来存动态墙上传的图片
- 一个能跑 Node 的部署平台，比如 Render
（这些都是免费版 且额度能相对充足的）
## 需要改哪里

主要改 `index.html` 里的这几处。

### 1. Firebase 配置
找到：

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};


换成你自己的 Firebase Web App 配置。

Firestore 需要能读写。只自己和朋友用的话，可以先用公开规则：


rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

公开规则很方便，但知道网址的人都能写数据。如果要长期公开展示，建议再加登录或密码。

### 2. Cloudinary 配置

找到：

```js
const cloudinaryConfig = {
  cloudName: "...",
  uploadPreset: "..."
};


改成你自己的 Cloudinary `cloudName` 和 unsigned upload preset。
不要把 Cloudinary API Secret 写进前端。

### 3. 网站文字

标题、简介、页脚都在 `index.html` 里，可以直接搜索这些文字改：

台湾记忆
TAIWAN I LOVE U
Yukiri & Zhiya


分类也在 `index.html` 里：

```js
const cityOptions = ["全部", "台东", "高雄", "花莲", "台北", "台南", "其他"];
const topicOptions = ["全部", "攻略", "美食"];

想换城市或分类，改这里就行。

### 4. BGM

把 `.mp3` 放在仓库根目录里，播放器会自动读取。

如果想让播放器一开始就显示好看的歌名，可以改：

```js
const fallbackPlaylist = [
  { title: "太聪明--陈绮贞", src: "tai-cong-ming.mp3" }
];
```

浏览器通常不允许网页刚打开就自动播放音乐，所以需要用户先点一下播放。

## 本地运行

需要 Node.js 20 或以上。

```bash
npm start

然后打开：
http://localhost:4173/


不要直接双击打开 `index.html`，因为抓封面和音频播放都需要 Node 服务。

## 部署到 Render

1. 把代码推到 GitHub
2. 在 Render 新建 Web Service
3. 连接你的 GitHub 仓库
4. Build Command 填：   npm install

5. Start Command 填：   npm start

部署完成后，Render 会给你一个网址。

## 注意

- 小红书 / 抖音页面结构可能会变，封面抓取不保证永远稳定。
- 动态墙图片存在 Cloudinary，文字数据存在 Firebase Firestore。
- 这个项目本来是给私人小站用的，不带用户登录和后台管理。


