
const os = require('os');
const path = require('path');
const fs = require('fs').promises;

// 전역 상수들
const HOME_DIR = os.homedir();
const BASE_DIR = path.join(HOME_DIR, '.fromista');

const defaultConfig = {
    browser: {
        args:  ['--no-blink-features=AutomationControlled'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    },
    storage: {
        downloads: path.join(BASE_DIR, 'downloads'),
        thumbnail: true,
        browser: path.join(BASE_DIR, 'browser-profiles'),
        cookies: path.join(BASE_DIR, 'browser-profiles', 'instagram-cookies.json')
    },
    url: {
        login: 'https://www.instagram.com/accounts/login/',
        baseUrl: 'https://www.instagram.com/'
    }
}

class Configure {
    constructor() {
        this.file = path.join(BASE_DIR, 'config.json');
    }

    async mkdir() {
        await fs.mkdir(BASE_DIR, { recursive: true });
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
    async output(path) {
        // 디렉토리 생성
        await this.mkdir();
        const update = {
            storage: {
                downloads: path
            }
        }

        await this.mergeStorage(update);
    }
    async thumbnail(boolean) {
        // 디렉토리 생성
        await this.mkdir();
        const value = (boolean === 'yes') ? true : false;
        const update = {
            storage: {
                thumbnail: value
            }
        }

        await this.mergeStorage(update);
    }

    async clear() {
        try {
            await fs.unlink(this.file);
            await fs.rm(defaultConfig.storage.browser, { recursive: true, force: true });
            console.log('configure initialized.');
        } catch (error) {
            // 파일이 존재하지 않으면 무시.
        }
    }
    async mergeStorage(update) {
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