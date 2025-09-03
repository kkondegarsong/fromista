const { chromium } = require('playwright');
const storage = require('./url-storage.js');
const extractor = require('./extractor.js');

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const readline = require("readline");


function question(query) {
    return new Promise((resolve) => {
        // readline 인터페이스를 매번 새로 열고 닫음
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question(query, (answer) => {
            rl.close(); // 입력이 끝나면 닫기
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function readUsers() {
    const filePath = path.join(__dirname, 'users.txt');
    
    try {
        // 1. 파일이 존재하는지 확인합니다.
        await fs.access(filePath, fs.constants.F_OK);
        
        // 2. 파일이 존재하면 내용을 읽어옵니다.
        const data = await fs.readFile(filePath, 'utf8');

        // 3. 줄바꿈 문자로 분리하고 공백을 제거합니다.
        const users = data.split('\n').map(line => line.trim()).filter(Boolean);        
        return users;        
    } catch (error) {
        // 파일이 존재하지 않는 경우 (EEXIST 오류)
        if (error.code === 'ENOENT') {
            console.log(`유저 목록 파일이 존재하지 않습니다. 새로 생성합니다.`);
            
            try {
                // 빈 파일을 생성합니다.
                await fs.writeFile(filePath, '', 'utf8');
                return []; // 새로 생성했으니 빈 배열 반환
            } catch (writeError) {
                console.error(`파일 생성 중 오류가 발생했습니다: ${writeError.message}`);
                return [];
            }
        }

        console.error(`파일을 읽는 도중 오류가 발생했습니다: ${error.message}`);
        return []; // 오류 발생 시 빈 배열 반환
    }
}

async function download(linkUrl) {
    const dir = './downloads';

    const downloadFile = (url, filepath) => {
        return new Promise((resolve, reject) => {
            const file = require('fs').createWriteStream(filepath);
            
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                
                file.on('error', reject);
            }).on('error', reject);
        });
    };
    
    try {
        const result = await extractor.extract(linkUrl);

        if (result.error) {
            console.log('❌ 추출 실패:', result.message);
            return;
        }

        console.log('✅ 추출 성공!');
        console.log(`📱 사용자: ${result.user}`);
        console.log(`🖼️ 미디어 개수: ${result.count}`);
        console.log(`🎥 비디오 개수: ${result.vcount || 0}`);

        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
        // 디렉토리가 이미 존재하면 무시
        }

        console.log(`파일 다운로드 시작...`);

        for (let i = 0; i < result.urls.length; i++) {
            try {
                const urlString = result.urls[i];
                const isVideo = urlString.includes('.mp4') || urlString.includes('video');
                const ext = isVideo ? 'mp4' : 'jpg';

                const url = new URL(urlString);
                const basename = path.basename(url.pathname);

                const filename = `${result.user}_${basename}.${ext}`;
                const filepath = path.join(dir, filename);
                
                await downloadFile(urlString, filepath);
                await storage.saveUrl(linkUrl);
                
                // 다운로드 간격
                await new Promise(resolve => setTimeout(resolve, 1000));                
            } catch (error) {
                console.log(`❌ 다운로드 실패: ${error.message}`);
            }
        }
    } catch (error) {
        console.error('오류 발생:', error);
    }
}

async function getUrls(user) {
    const browser = await chromium.launch({ 
        headless: true
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    });

    try {
        const page = await context.newPage();

        // User-Agent 설정 (봇 차단 방지)
        await page.goto(`https://www.instagram.com/${user}/`);
        // 패턴에 해당하는 요소가 나타날 때까지 대기
        const pattern = `a[href*="/${user}/p/"]`
        await page.waitForSelector(pattern, { timeout: 10000 });

        // 패턴으로 요소들 추출
        const elements = await page.$$(pattern);

        // 각 요소의 실제 내용 추출
        const elementContents = await page.evaluate((_user) => {
            const links = document.querySelectorAll(`a[href*="/${_user}/p/"]`);
            return Array.from(links).map((link, index) => ({
                index: index + 1,
                href: link.href
            }));
        }, user);

        let urls = [];
        for (const item of elementContents) {
            if (storage.has(item.href)) {
                continue;
            }

            urls.push(item.href);
        }

        return urls;
    } catch (error) {
        return {
            error: 'getUrls-error',
            message: error.message
        }
    } finally {
        browser.close();
    }
}


// 실행할 예시 선택
async function main() {
    // 하나씩 실행해보세요
    const users = await readUsers();
    if (users.length == 0) {
        console.log('저장 된 유저 목록이 없습니다. 유저를 추가 한 뒤 다시 시도해 주세요.');
        return;
    }

    for (const user of users) {
        const urls = await getUrls(user);
        if (urls.error) {
            console.log('❌ URL 얻기 실패: ', urls.message);
            return;
        }

        console.log(`${user}의 새로운 컨텐츠 갯수:`, urls.length);

        for (const url of urls) {
            await download(url);
        }
    }
}

// 스크립트 직접 실행 시
if (require.main === module) {
    main().catch(console.error);
}