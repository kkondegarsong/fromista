const { chromium } = require('playwright');
const storage = require('./url-storage.js');
const extractor = require('./extractor.js');
const config = require('./config.js');

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

function showProgress(current, total, message = 'downloading') {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 2)) + '░'.repeat(50 - Math.floor(percentage / 2));
    
    process.stdout.write(`\r${message}... [${progressBar}] ${percentage}%`);
}

async function download(linkUrl) {
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

        console.log(`✅ extract success: ${result.user}`);
        console.log(`photos: ${result.count}, videos: ${result.vcount || 0}`);

        try {
            await fs.mkdir(config.storage.downloads, { recursive: true });
        } catch (error) {
            // 디렉토리가 이미 존재하면 무시
        }


        for (let i = 0; i < result.urls.length; i++) {
            try {
                const urlString = result.urls[i];
                const isVideo = urlString.includes('.mp4') || urlString.includes('video');
                const ext = isVideo ? 'mp4' : 'jpg';

                const url = new URL(urlString);
                const basename = path.basename(url.pathname);

                const filename = `${result.user}_${basename}.${ext}`;
                const filepath = path.join(config.storage.downloads, filename);
                
                await downloadFile(urlString, filepath);
                await storage.saveUrl(linkUrl);
                
                showProgress(i+1, result.urls.length);
                // 다운로드 간격
                await new Promise(resolve => setTimeout(resolve, 1000));                
            } catch (error) {
                console.log(`❌ 다운로드 실패: ${error.message}`);
            }
        }

        console.log('\n✅ download compelete!');
    } catch (error) {
        console.error('오류 발생:', error);
    }
}

module.exports = download;