const fs = require('fs').promises;

class URLStorage {
    constructor(filename = 'download_urls.json') {
        this.urls = new Set();
        this.filename = filename;
        this.loadUrls();
    }
    
    // 파일에서 URL들 로드
    async loadUrls() {
        try {
            const data = await fs.readFile(this.filename, 'utf8');
            const urlArray = JSON.parse(data);
            urlArray.forEach(url => this.urls.add(url));
            console.log(`${this.urls.size}개 URL 로드됨`);
        } catch (error) {
            console.log('저장 파일 없음, 새로 시작');
        }
    }
    
    // 파일에 URL들 저장
    async saveUrls() {
        const urlArray = Array.from(this.urls);
        await fs.writeFile(this.filename, JSON.stringify(urlArray, null, 2));
        console.log(`${this.urls.size}개 URL 저장됨`);
    }
    async saveUrl(url) {
        const wasNew = !this.urls.has(url);
        if (wasNew) {
            this.urls.add(url);
            const urlArray = Array.from(this.urls);
            const jsonFile = JSON.stringify(urlArray, null, 2);
            await fs.writeFile(this.filename, jsonFile);
            console.log(`URL 저장됨: ${url}`);           
        }
    }
    
    // URL 추가
    add(url) {
        const wasNew = !this.urls.has(url);
        this.urls.add(url);
        return wasNew; // 새로운 URL이면 true, 기존에 있던 URL이면 false
    }
    
    // URL 존재 여부 체크
    has(url) {
        return this.urls.has(url);
    }
    
    // 전체 URL 개수
    size() {
        return this.urls.size;
    }
    
    // 모든 URL 리스트
    getAll() {
        return Array.from(this.urls);
    }
}

// 클래스 인스턴스를 단 한 번만 생성합니다.
const storage = new URLStorage();

// 이 인스턴스를 외부에서 사용할 수 있도록 내보냅니다.
module.exports = storage;