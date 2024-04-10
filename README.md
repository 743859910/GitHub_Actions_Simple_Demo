# GitHub_Actions_Simple_Demo

---

### 前言

`GitHub Actions` 是 `GitHub`平台提供的一项功能，用于自动化构建、测试和部署软件项目。

它可以让我们在`特定的事件`（如`push` 、`pull request` 事件等）或`条件发生`（如特定时间执行等）时执行自定义的工作流程。

本文将通过从 `0-1` 的方式带你部署一个自己的自动化工作流。（这是我的[Demo仓库](https://github.com/wlc743859910/GitHub_Actions_Simple_Demo)，你可以作为参考）

---

### 新建仓库

首先，你需要在 GitHub 上创建一个仓库，该仓库作为我们的自动化工作流项目。

![截屏2023-07-12 12.39.11](http://cdn.aimotong.top/writing/%E6%88%AA%E5%B1%8F2023-07-12%2012.39.11.png)

---

### 配置自动化工作流

仓库创建好之后，我们可以找到仓库的 `Actions` ，并使用推荐的工作流配置，它很简单和基础，我们可以基于它定制我们自己的工作流

![截屏2023-07-12 12.41.05](http://cdn.aimotong.top/writing/%E6%88%AA%E5%B1%8F2023-07-12%2012.41.05.png)

基础的工作流配置如下

```yaml
name: CI

# Controls when the workflow will run
# 控制工作流何时运行
on:
  # Triggers the workflow on push or pull request events but only for the "master" branch
  # 当主分支存在 push 或者 pull request请 求时触发任务
  push:
    branches: [ "master" ]
  pull_request:
    branches: [ "master" ]

  # Allows you to run this workflow manually from the Actions tab
  # 允许, 从仓库的 Actions 选项卡手动运行当前工作流
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
# 工作流由一个或多个作业组成，这些作业可以顺序运行，也可以并行运行
jobs:
  build:
    # 作业运行的系统环境（运行时环境）
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    # 步骤，表示完成该作业的一些列原子操作/步骤
    steps:
      # 跳转到当前仓库的$GITHUB_WORKSPACE目录，以便访问仓库中的代码
      - uses: actions/checkout@v3

      # 运行一个shell命令
      # name 为步骤名称，run 为运行shell脚本
      - name: Run a one-line script
        run: echo Hello, world!

      # 运行一组命令
      - name: Run a multi-line script
        run: |
          echo Add other actions to build,
          echo test, and deploy your project.
```

点右上角的`Commit changes...`按钮，将基础工作流提交到我们的仓库中

因为我们提交了一个文件`blank.yml`到仓库中，这时会触发 `push` 请求，所以也会自动触发我们的任务。



![image-20230712130349092](http://cdn.aimotong.top/writing/image-20230712130349092.png)

---

### 实战-版本号更新任务

我们实现的任务是：当主分支有`push`或者`pull request`时，我们就更新`package.json`中的版本号。

这应该是很长见的场景，下面我们就来实现一下

**1. 将仓库克隆到本地，初始化npm**

```
npm init -y
```

**2. 新建`updateVersion.js`文件，编写更新版本号的脚本**

```js
const fsp = require("fs/promises");
const { exec } = require('child_process');
const path = require('path');

async function autoUpdateVersion() {
    // 读取 package.json 文件
    const PKG_PATH = path.resolve(__dirname, "package.json");
    try {
        const data = await fsp.readFile(PKG_PATH, { encoding: "utf-8" });
        const pkg = JSON.parse(data);

        // 更新版本号
        const currentVersion = pkg.version;
        const versionParts = currentVersion.split('.');
        let [major, minor, patch] = versionParts.map(Number);
        patch++;
        const newVersion = `${major}.${minor}.${patch}`;

        pkg.version = newVersion;

        await fsp.writeFile(PKG_PATH, JSON.stringify(pkg, null, 2), { encoding: "utf-8" });
        // 执行 Git 命令提交更新
        const commitMessage = `[AutoUpdateVersion] update version for ${newVersion}`;
        exec(`git commit -am "${commitMessage}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('执行 Git 命令时出错:', error);
            } else {
                console.log(`package.json 的版本号已更新为 ${newVersion}`);
                console.log('Git 提交成功！');
            }
        });

    } catch (error) {
        console.error(error);
        throw error;
    }
}

autoUpdateVersion();

```

**3.配置版本号更新任务**

下面是实现版本号更新任务的配置，我做了比较详细的备注，都比较好理解。

其中，配置里用到了几个环境变量：`secrets.GITHUB_TOKEN`、`secrets.NAME` 和 `secrets.EMAIL` 。

`secrets.GITHUB_TOKEN` 属于Github仓库的内置环境变量

`secrets.NAME` 和 `secrets.EMAIL` 是自定义的环境变量

关于环境变量，我会在后面进行说明

```yml
name: AutoUpdateVersion

# Controls when the workflow will run
# 控制工作流何时运行
on:
  # Triggers the workflow on push or pull request events but only for the "master" branch
  # 当主分支存在 push 或者 pull请 求时触发任务
  push:
    branches: ["master"]
  pull_request:
    branches: ["master"]

  # Allows you to run this workflow manually from the Actions tab
  # 允许, 从仓库的 Actions 选项卡手动运行当前工作流
  workflow_dispatch:

# A workflow run is made up of one or more jobs that can run sequentially or in parallel
# 工作流由一个或多个作业组成，这些作业可以顺序运行，也可以并行运行
jobs:
  build:
    # 作业运行的系统环境（运行时环境）
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    # 步骤，表示完成该作业的一些列原子操作/步骤
    steps:
      # 切到仓库的workspace(根目录)
      - name: Checkout repository
        uses: actions/checkout@v3

      # 配置Git用户
      - name: Configure Git
        env:
          GIT_USERNAME: ${{ secrets.NAME }}
          GIT_EMAIL: ${{ secrets.EMAIL }}
        run: |
          git config --global user.name "${GIT_USERNAME}"
          git config --global user.email "${GIT_EMAIL}"

      # 检查是否需要更新版本
      - name: Check if version update is needed
        id: version-check
        run: |
          # 获取最近的提交信息
          latest_commit_message=$(git log --pretty=format:%s -1)

          # 检查提交信息是否包含 [AutoUpdateVersion]，主要用于防止发生任务死循环
          # 如果最新提交时更新版本号，则无需再触发任务，直接退出
          if [[ $latest_commit_message == *"[AutoUpdateVersion]"* ]]; then
            echo "Skip version update as it was triggered by an automated commit"
            exit 78
          else
            echo "Version update is needed"
          fi

      # 更新版本号并提交
      - name: Update version and commit changes
        if: steps.version-check.outcome == 'success'
        run: |
          # 执行更新版本号
          node updateVersion.js

      # 同步提交
      - name: Push changes to master branch
        if: steps.version-check.outcome == 'success'
        # 引用第三方任务以实现push操作
        uses: ad-m/github-push-action@master
        with:
          branch: master
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

**4. 配置环境变量**

**`GITHUB_TOKEN`**

工作流中我们使用`secrets.GITHUB_TOKEN` 环境变量，它用于工作流权限控制，每个仓库都默认存在。

因为我们在工作流中修改了`package.json`文件，并且使用第三方任务(`ad-m/github-push-action@master`)来执行 `push` 操作。所以需要给工作流以 `写入权限` 。

默认情况下选中的是只读权限，因此，我们需要勾选`读和写`的权限，以允许 `push` 操作

![image-20230712144213183](http://cdn.aimotong.top/writing/image-20230712144213183.png)



**自定义环境变量`NAME` 和 `EMAIL`**

当前仓库的自定义环境变量，可以通过 `Actions` -> `Secrets and Variables` 进行配置，之后就可以在工作流中进行使用了；

值得一提的是：添加自定义环境变量是保障信息安全的常规操作，当我们要执行一个自动化任务时，如果需要在代码中传入敏感信息，比如用户名密码之类，通常建议选择使用环境变量的方式，以保障敏感信息不回暴露在仓库源码中。

![image-20230712145404356](http://cdn.aimotong.top/writing/image-20230712145404356.png)

---

### 最后

当我们完成以上所有内容之后，就可以提交这些文件修改了。

当你看到版本号更新的`commit`时，那么恭喜你完成了一个自动化任务^_^

![image-20230712145656033](http://cdn.aimotong.top/writing/image-20230712145656033.png)

---

<p align="center">
  <img src="https://raw.gitmirror.com/wlc743859910/GitHub_Actions_Simple_Demo/master/img/1.webp">
</p>

<p align="center">
  <img src="https://raw.gitmirror.com/wlc743859910/GitHub_Actions_Simple_Demo/master/img/2.webp">
</p>

<p align="center">
  <img src="https://raw.gitmirror.com/wlc743859910/GitHub_Actions_Simple_Demo/master/img/3.webp">
</p>

<p align="center">
  <img src="https://raw.gitmirror.com/wlc743859910/GitHub_Actions_Simple_Demo/master/img/4.webp">
</p>

<p align="center">
  <img src="https://raw.gitmirror.com/wlc743859910/GitHub_Actions_Simple_Demo/master/img/5.webp">
</p>

---

![Visitor Count](https://profile-counter.glitch.me/{GitHub_Actions_Simple_Demo}/count.svg)

---

<table>
    <tr>
        <td >
昵称：我只是你的过客

个性签名：每个人都是每个人的过客

国籍：中华人民共和国 / 现居：中国湖北省武汉市
        </center>
        </td>
    </tr>
</table>

---

<table>
    <tr>
        <td >
MIT License

Copyright © 2008-2024 Powered by wlc743859910. Inc. All Rights Reserved. 我只是你的过客工作室. 版权所有
        </center>
        </td>
    </tr>
</table>

---
