
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const defaultConfig = {
    browser: {
        args:  ['--no-blink-features=AutomationControlled'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    },
    storage: {
        cookies: './browser-profiles/instgram-cookies.json',
        downloads: './downloads',
        browser: './browser-profiles'
    },
    url: {
        login: 'https://www.instagram.com/accounts/login/',
        baseUrl: 'https://www.instagram.com/'
    }
}

class Configure {
    constructor() {
        this.dir = path.join(os.homedir(), '.fromista');
        this.file = path.join(this.dir, 'config.json');
    }

    async mkdir() {
        await fs.mkdir(this.dir, { recursive: true });
    }
    async load() {
        try {
            const content = await fs.readFile(this.file, 'utf8');
            const user = JSON.parse(content);

            return this.merge(defaultConfig, user);
        } catch (error) {
            // 설정 파일이 없으면 기본 설정 반환
            return defaultConfig;
        }
    }
    async setOutput(path) {
        // 디렉토리 생성
        await this.mkdir();
        const update = {
            storage: {
                downloads: path
            }
        }

        try {
            // 기존 파일과 병합.
            const content = await fs.readFile(this.file, 'utf8');
            const config = JSON.parse(content);

            config.storage = { ...config.storage, ...update.storage };
            await this.write(config);
        } catch (error) {
            // 설정 파일이 없으면 새로 생성.
            await this.write(update);
        }

    }

    merge(base, user) {
        return {
            ...base,
            storage: {
                ...base.storage,
                ...user.storage
            },
            browser: {
                ...base.browser,
                ...user.browser
            },
            url: {
                ...base.url,
                ...user.url
            }
        }
    }
    async write(data) {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(this.file, jsonData);
    }
}

const config = new Configure();
module.exports = config;