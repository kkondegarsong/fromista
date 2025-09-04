
const { chromium } = require('playwright');
const extractScript = require('./extract-script.js');
const configure = require('./config.js');
const fs = require('fs').promises;

class Extractor {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            ...options
        };
    }


    async extract(linkUrl) {
        const config = await configure.load();        
        const browser = await chromium.launchPersistentContext(config.storage.browser, { 
            headless: this.options.headless,
            userAgent: config.browser.userAgent,
            viewport: { width: 1920, height: 1080 },
            locale: config.browser.locale,
            timezoneId: config.browser.timezoneId,
            args: config.browser.args
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
            
            console.log('extracting media files...');
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
        const config = await configure.load();

        try {
            const cookieData = await fs.readFile(config.storage.cookies, 'utf8');
            const cookies = JSON.parse(cookieData);
            await browser.addCookies(cookies);
        } catch (error) {
            console.log("[extractor] 저장된 쿠키가 없습니다.");
        }
    }
}


const extractor = new Extractor();
module.exports = extractor;