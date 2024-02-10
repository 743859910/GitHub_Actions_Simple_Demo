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
