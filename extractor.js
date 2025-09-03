
const { chromium } = require('playwright');
const extractScript = require('./extract-script.js');
const config = require('./config.js');
const userDataDir = "./userdata"; // 세션 저장할 폴더

class Extractor {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            userAgent: config.browser.userAgent,
            cookieFile: config.storage.cookies,
            ...options
        };
    }


    async extract(linkUrl) {
        const browser = await chromium.launchPersistentContext(userDataDir, { 
            headless: this.options.headless,
            userAgent: this.options.userAgent,
            viewport: { width: 1920, height: 1080 },
            locale: config.browser.locale,
            timezoneId: config.browser.timezoneId
        });


        try {            
            await this.loadCookies(browser);      
            const result = await this.runScript(browser, linkUrl);

            // 결과 검증 및 후처리
            if (result.error) {
                console.error('추출 오류:', result.message);
                return result;              
            }
            
            // 성공적인 결과 로깅        
            return result;            
        } catch (error) {
            console.error('Playwright 오류:', error);
            return { 
                error: 'playwright_error', 
                message: error.message 
            };
        } finally {
            await browser.close();
        }
    }

    async runScript(browser, linkUrl) {
        let page;
        
        try {
            // Instagram 페이지로 이동
            page = await browser.newPage();
            await page.goto(linkUrl, { 
                waitUntil: 'domcontentloaded'  // 오타 수정
            });
            await page.waitForSelector('body');
            
            // CPU 성능 측정용 변수 설정
            await page.evaluate(() => {
                window.cpu = 100;
            });
            
            console.log('Instagram 미디어 추출 스크립트 실행 중...');
            // 외부 스크립트 실행
            const result = await page.evaluate(extractScript);
            return result;            
        } catch (error) {
            console.error('runScript 오류:', error);
            return {
                error: 'script_error',
                message: error.message
            };
        } finally {
            // 페이지만 닫고 브라우저는 닫지 않음
            if (page) {
                await page.close();
            }
        }
    }

    async loadCookies(browser) {
        const fs = require('fs').promises;
        try {
            const cookieData = await fs.readFile(this.options.cookieFile, 'utf8');
            const cookies = JSON.parse(cookieData);
            await browser.addCookies(cookies);
            console.log("저장된 쿠키를 로드했습니다.");
        } catch (error) {
            console.log("저장된 쿠키가 없습니다.");
        }
    }
}


const extractor = new Extractor();
module.exports = extractor;