# ☆ taiwan memory ☆

```text
        yukiri & jia's little web

 [ HOME ] [ DIARY ] [ TRAVEL ] [ DANCE ] [ GUIDES ]

````
> **ENTER SITE ♡**
> https://taiwan-memory.onrender.com/

---

## :: about this little web ::
嗯。现在已经完全不知道这是什么网站了。
反正就是一个：
```text
台湾攻略
+ 日记
+ 照片
+ 碎碎念
+ 小舞蹈
+ Word 攻略
+ 留言
+ BGM
+ 一堆没啥用但是很可爱的东西
```
## ☆ 里面到底有啥

### HOME

首页现在已经很乱了哈哈哈哈。有最近发的 Diary、旅行收藏、BGM、留言板、memo，还有一些我自己都快忘了为什么要放上去的小东西。

首页还塞了：
* latest diary
* travel
* mini archive
* guest book
* memo
* site info
* current status
* useless info
* 一堆 GIF 和贴纸

反正很符合这个网站现在的精神状态。

### DIARY

这个东西一开始也没打算做这么多功能。不过有位用户的需求建议下，现在已经变成一个非常简陋但是能用的朋友圈了 23333
可以发：
* 文字
* 最多 9 张照片
* 长篇碎碎念
* 评论
照片上传的时候现在还有进度条。因为之前点完发布以后页面什么反应都没有，我自己都不知道到底是上传了还是死了 = =
Diary 进去以后先显示 3 篇。看完点“显示更多”，再蹦 3 篇。
不然一次全铺开真的太长了……然后照片点一下还能看原图。嗯。
一个台湾旅行网站为什么会长出朋友圈功能。
下一题。

### TRAVEL

这个才是本站最开始真正应该干的事情（笑）
主要就是存：

```text
小红书攻略
抖音攻略
吃的
玩的
台湾各种乱七八糟想去的地方
```

可以按城市和内容筛。台北台南高雄花莲啥的。贴分享链接以后，服务器会努力帮我把标题和封面抓回来。

注意是：
**努力。**
因为小红书真的很喜欢：

```text
改页面 拦请求 不给电脑看 让你扫码 突然换链接格式 哎小红书你为什么要这样呢ww
```

所以哪天发现某个封面没了或者标题抽风了，不一定是我又写炸了……
大概吧。

### DANCE

这个是 yukiri 最爱的低脂小舞蹈区 ^^
跟 TRAVEL 差不多，也是收藏、封面、预览、打开原帖。就是分类不一样。

### GUIDES

这个也是后面越来越离谱以后长出来的。因为有些攻略直接整理在 Word 里面不是挺方便嘛。
那就干脆把 `.docx` 也塞进网站。
现在可以：

```text
选择 Word
→ 导入
→ 等它读完
→ 直接在网页里改
→ 保存修改
```
还可以调字体、字号、粗体、斜体、下划线、缩放。Word 里面有图的话，也会把图片单独传到 Cloudinary。
理论上不会再出现：
```text
A 文档 = B 文档
B 文档 = B 文档
```
这种恐怖故事了吧。
导入的时候现在也有进度条。

## ☆ 一些没啥用但是我很喜欢的东西

右上角有一行：
```text
click me → about this web ♡
```
可以点。里面藏了长篇废话。有点矫情。

另外还有：

**Guest Book**

可以留言。

虽然平时就两个人看这个站，但还是要有留言板。古早网站没有留言板总感觉少点啥。

**BGM**

上一首 / 播放 / 暂停 / 下一首。

浏览器不让网页一打开就自动放音乐。不是我不想。是浏览器不让。T_T

**3D 小人**

Three.js 画的。（其实是因为前两天正好gpt出了个最新模型 我想试试到底怎么个事儿）会跳舞。可以暂停。还能跟着鼠标动。
这应该算本站目前最没必要但我很喜欢的东西之一。

## :: data room / 东西到底存哪 ::

当前页面实际使用这些 Firestore collection：

| collection  | 里面放什么                          |
| ----------- | ------------------------------ |
| `links`     | TRAVEL / DANCE 收藏、分类、标题、封面、原链接 |
| `posts`     | Diary 正文、Cloudinary 图片 URL、评论  |
| `guideDocs` | Word 攻略标题、HTML、CSS 与更新时间       |
| `memos`     | 右侧随手记，页面最多读取 30 条              |
| `guestbook` | 首页留言板，显示最新 6 条                 |

图片上传走 Cloudinary unsigned upload preset。
Diary 多图、Word 内嵌图片和重新缓存的链接封面都会使用 Cloudinary。显示 Cloudinary 图片时，页面会自动加入 `f_auto,q_auto`。
`server.js` 里另外还保留了一套：

```text
data/store.json
uploads/
```
对应的本地 JSON API。
这部分主要是早期 / 兼容用途。当前网页里的收藏、Diary、评论、攻略、memo 和留言板，主数据都以 Firestore 为准。

## :: behind the scenes / 其实背后是这些东西 ::

* **HTML + CSS + Vanilla JavaScript**
  没有 React，也没有构建工具。大部分页面和交互都住在 `index.html`。

* **Node.js 20+**
  一个很薄的原生 `http` server，负责静态文件、链接预览、图片代理、歌曲列表和 MP3 Range 请求。

* **Firebase Firestore**
  收藏、动态、评论、攻略、memo 和留言板都存在这里。

* **Cloudinary**
  存 Diary 图片、Word 内嵌图片和缓存下来的帖子封面。

* **docx-preview + JSZip**
  在浏览器里拆开、显示和编辑 `.docx`。

* **Three.js**
  Header 里那两位会动的 character。

* **Render**
  线上 Node 服务目前部署在这里。

Firebase compat SDK 由页面直接加载。
`docx-preview`、`JSZip` 和 Three.js 文件则已经放在仓库的 `vendor/` 目录里，不需要 npm bundler。

能跑就先不要动.jpg

## [ LOCAL ACCESS / 本地怎么打开 ]

需要 **Node.js 20 或以上**。
当前 `package.json` 没有额外 dependencies，只有启动脚本，所以直接运行：
```bash
git clone https://github.com/jia050904/taiwan_memory.git
cd taiwan_memory
npm start
```
然后打开：
```text
http://127.0.0.1:4173/
```
默认端口是 `4173`。

也可以使用环境变量修改：
```bash
PORT=4182 npm start
```
不要只双击 `index.html` 当作正式运行方式。
链接预览、图片代理、MP3 Range 播放和自动歌曲列表都需要 Node server。

### 自己部署前要准备

1. 一个 Firebase 项目和 Firestore 数据库。
2. 一个 Cloudinary 账号。
3. 一个允许浏览器上传的 Cloudinary unsigned upload preset。
4. 一个能运行 Node.js 20+ 的服务。
5. 把自己的 MP3 放进 `songs/`。

`/api/audio` 会自动扫描 `songs/` 里的 `.mp3` 文件。

Firebase 与 Cloudinary 的公开客户端配置目前写在 `index.html`。换成自己的项目时，需要替换对应配置，并单独设置 Firestore Security Rules 与 Cloudinary preset 限制。

**不要**把下面这些东西写进 README、Git 或前端代码：

```text
Firebase 管理员私钥
Cloudinary API secret
服务端密钥
其它真正的 secret
```
客户端配置可以公开，不代表 Firestore Rules 可以全部放开 = =

### 可选环境变量

```text
PORT        Node 监听端口，默认 4173
HOST        Node 监听地址
DATA_DIR    本地 JSON store 目录，默认 ./data
UPLOAD_DIR  本地 API 上传目录，默认 ./uploads
```
`data/`、`uploads/` 和日志已经写入 `.gitignore`。

如果正式使用本地 JSON API，需要给这些目录配置持久磁盘。Firestore 和 Cloudinary 数据不依赖这两个本地目录。

## [ DEPLOY / Render 那边 ]

当前线上入口：

> https://taiwan-memory.onrender.com/

Render 运行命令：

```bash
npm start
```
生产环境下，Node server 默认监听 `0.0.0.0`，并读取 Render 提供的 `PORT`。
仓库当前没有额外构建步骤，也没有 `render.yaml`。所以 Render 控制台里的 service、branch 和 start command 设置需要继续保留。

## :: tiny file map ::

```text
.
├── index.html             # 五个 tab、Firestore / Cloudinary 与大部分交互
├── homepage-final.css     # 主页、Diary、Guides、弹窗和响应式样式
├── scrapbook.css          # 贴纸层与旧主页装饰样式
├── friends-3d.js          # Header 的 Three.js character 与跳舞控制
├── server.js              # 静态服务、预览代理、歌曲列表、本地兼容 API
├── songs/                 # BGM MP3
├── vendor/                # Three.js、docx-preview、JSZip 及许可证
└── assets/                # 图片、GIF、贴纸、播放器和弹窗素材
```

## :: known strange things ::

* 小红书和抖音的页面结构、分享链接和反爬策略经常变化。
* 有些小红书帖子在电脑端只允许扫码用 App 查看。
* 标题、封面或原帖地址偶尔可能抓取失败。
* Render 免费实例休眠后，第一次打开可能要等一会儿。
* 浏览器不会允许网站刚打开就自动播放音乐，第一次通常要自己点播放。

---

```text
      THIS PAGE IS ALWAYS UNDER CONSTRUCTION...

last update : 随缘
made by yukiri & jia ♡

THANKS FOR VISITING ☆
PLEASE COME AGAIN ^^
```

[ back to top ](#-taiwan-memory-)
