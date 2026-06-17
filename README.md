# 狂野HomeGame 🃏

德州扑克手牌记录应用 — 记录每一场狂野牌局

## 快速开始

### 1. 安装依赖
```bash
cd wild-homegame
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 http://localhost:5173

### 3. 构建生产版本
```bash
npm run build
```

## 快速体验账号

| 邮箱 | 密码 | 昵称 |
|------|------|------|
| prince@test.com | 123456 | 德扑小王子 |
| allin@test.com | 123456 | All In姐 |
| steady@test.com | 123456 | 稳如老狗 |
| bluff@test.com | 123456 | bluff大师 |
| newbie@test.com | 123456 | 牌桌新人 |
| fish@test.com | 123456 | 鱼塘塘主 |

## 功能特性

- 创建牌局，设置地点和日期
- 银行家记录每个玩家的买入手数
- 实时记录补码
- 为离场玩家结算剩余筹码
- 自动验证筹码对齐（总码 = 剩余码 + 结算码）
- 排行榜：富豪 / 慈善家 / 连胜王 / 活跃玩家
- 暗色模式：晚 8 点自动切换
- PWA 支持：添加到主屏幕像原生 app 使用

## 管理员功能

管理员可以：
- 查看和管理所有注册用户
- 设置/取消其他用户的管理员权限
- 设置/取消工具人账号保护（受保护账号无法被删除）
- 查看和管理所有牌局
- 删除任意牌局

底部导航栏会为管理员显示"管理"入口。

## 部署到线上（免费）

### Step 1: 注册账号
1. GitHub: https://github.com
2. Supabase: https://supabase.com (用 GitHub 登录)
3. Vercel: https://vercel.com (用 GitHub 登录)

### Step 2: 设置 Supabase 数据库
1. 在 Supabase 创建新项目
2. 进入 SQL Editor，执行 `supabase-setup.sql` 中的 SQL
3. 复制项目的 URL 和 anon key

### Step 3: 配置邮箱验证（推荐）
Supabase 默认开启邮箱验证。如果你希望快速测试或不需要邮箱验证：
1. 进入 Supabase Dashboard → Authentication → Providers
2. 找到 Email 设置
3. 关闭 "Confirm email" 选项

如果保留邮箱验证，用户注册后需要输入邮箱收到的验证码才能完成注册。

### Step 4: 设置管理员账号
1. 先在网站上注册一个账号（如 admin@wild.game）
2. 进入 Supabase Dashboard → SQL Editor
3. 执行以下 SQL（替换邮箱）：
```sql
UPDATE profiles SET is_admin = true, is_protected = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@wild.game');
```

### Step 5: 配置环境变量
创建 `.env` 文件：
```
VITE_SUPABASE_URL=你的supabase项目URL
VITE_SUPABASE_ANON_KEY=你的supabase anon key
```

### Step 6: 部署到 Vercel
1. 将代码推到 GitHub
2. 在 Vercel 导入 GitHub 仓库
3. 添加环境变量
4. 点击部署

部署完成后，分享链接给朋友，他们打开后点击"添加到主屏幕"即可。

## 项目结构

```
wild-homegame/
├── public/                 # 静态资源
├── src/
│   ├── components/        # 可复用组件
│   │   ├── BottomNav.tsx     # 底部导航栏
│   │   ├── GameCard.tsx      # 牌局卡片
│   │   ├── PlayerAvatar.tsx  # 玩家头像
│   │   └── ThemeToggle.tsx   # 主题切换
│   ├── contexts/          # 状态管理
│   │   ├── AppContext.tsx    # 应用数据（游戏、用户）
│   │   └── ThemeContext.tsx  # 主题管理
│   ├── lib/               # 工具和配置
│   │   ├── supabase.ts      # Supabase 客户端
│   │   └── utils.ts         # 工具函数
│   ├── pages/             # 页面
│   │   ├── AdminPage.tsx     # 管理后台（管理员专属）
│   │   ├── DashboardPage.tsx # 首页
│   │   ├── GameLobbyPage.tsx # 牌局详情
│   │   ├── LeaderboardPage.tsx # 排行榜
│   │   ├── LoginPage.tsx     # 登录注册
│   │   ├── NewGamePage.tsx   # 创建牌局
│   │   └── ProfilePage.tsx   # 个人资料
│   ├── types/index.ts     # TypeScript 类型
│   ├── App.tsx            # 路由
│   └── main.tsx           # 入口
├── supabase-setup.sql     # 数据库初始化 SQL
└── package.json
```

## 技术栈

- React 18 + TypeScript
- Vite (构建工具)
- Tailwind CSS (样式)
- React Router 6 (路由)
- Lucide React (图标)
- Supabase (后端/数据库/认证/实时同步)
- Vite PWA (渐进式 Web 应用)
