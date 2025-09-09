const { chromium } = require('playwright');
const storage = require('./url-storage.js');
const extractor = require('./extractor.js');
const configure = require('./config.js');

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

function showProgress(current, total, message = 'Downloading') {
    const percentage = Math.round((current / total) * 100);
    const floored = Math.floor(percentage / 2);
    const progressBar = '█'.repeat(floored) + '░'.repeat(50 - floored);
    
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
        const config = await configure.load();
        const result = await extractor.extract(linkUrl);

        if (result.error) {
            return;
        }

        try {
            await fs.mkdir(config.storage.downloads, { recursive: true });
        } catch (error) {
            // 디렉토리가 이미 존재하면 무시
        }

        let elements = result;
        if (!result.ispost && result.one) {
            elements = result.one;
        } 


        console.log(`✅ extract success: ${elements.user}`);
        console.log(`photos: ${elements.count}, videos: ${elements.vcount || 0}`);

        for (let i = 0; i < elements.urls.length; i++) {
            try {
                const urlString = elements.urls[i];
                const isVideo = urlString.includes('.mp4') || urlString.includes('video');
                const ext = isVideo ? 'mp4' : 'jpg';
                const date = (elements.ispost) ? elements.baseDate : elements.dates[i];

                const filename = `${elements.user}_${date}_${i+1}.${ext}`;
                const filepath = path.join(config.storage.downloads, filename);
                
                await downloadFile(urlString, filepath);
                await storage.save(linkUrl);
                
                showProgress(i+1, elements.urls.length);
                // 다운로드 간격
                await new Promise(resolve => setTimeout(resolve, 1000));                
            } catch (error) {
                console.log(`failed: ${error.message}\n url: ${elements.urls[i]}`);
            }
        }

        console.log('\n✅ download complete!');
    } catch (error) {
        console.error('오류 발생:', error);
    }
}

module.exports = download;