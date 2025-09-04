const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const config = require('./config.js');

// 전역 상수들
const HOME_DIR = os.homedir();
const BASE_DIR = path.join(HOME_DIR, '.fromista');

class URLStorage {
    constructor() {
        this.filename = path.join(BASE_DIR, 'download_history.json');

        this.urls = new Set();
        this.load();
    }

    async mkdir() {
        await fs.mkdir(BASE_DIR, { recursive: true });
    }
    // 파일에서 URL들 로드
    async load() {
        await this.mkdir();

        try {
            const data = await fs.readFile(this.filename, 'utf8');
            const urlArray = JSON.parse(data);

            urlArray.forEach(url => this.urls.add(url));
        } catch (error) {
            // 저장 파일이 없으면 새로 만듬.
        }
    }    
    async save(url) {
        const hasUrl = this.urls.has(url);
        if (hasUrl) {
            return;
        }

        this.urls.add(url);
        const urlArray = Array.from(this.urls);
        const jsonFile = JSON.stringify(urlArray, null, 2);
        await fs.writeFile(this.filename, jsonFile);
    }
    async clear() {
        try {
            await fs.unlink(this.filename);
            console.log('storage initialized.');
        } catch (error) {
            // 파일이 존재하지 않으면 무시.
        }
    }
    has(url) {
        return this.urls.has(url);
    }
}

// 클래스 인스턴스를 단 한 번만 생성합니다.
const storage = new URLStorage();
// 이 인스턴스를 외부에서 사용할 수 있도록 내보냅니다.
module.exports = storage;