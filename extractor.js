
const { chromium } = require('playwright');
const extractScript = require('./extract-script.js');
const userDataDir = "./userdata"; // 세션 저장할 폴더

class Extractor {
    constructor(options = {}) {
        this.options = {
            headless: true,
            timeout: 30000,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            cookieFile: './browser-cookies.json',
            ...options
        };
    }


    async extract(linkUrl) {
        const browser = await chromium.launchPersistentContext(userDataDir, { 
            headless: this.options.headless,
            userAgent: this.options.userAgent,
            viewport: { width: 1920, height: 1080 },
            locale: 'ko-KR',
            timezoneId: 'Asia/Seoul'
        });


        try {            
            console.log(`Instagram 페이지로 이동: ${linkUrl}`);
            await this.loadCookies(browser);      
            const result = await this.runScript(browser, linkUrl);

            // 결과 검증 및 후처리
            if (result.error) {
                if (result.error === 'login_required') {
                    while (true) {
                        const login = await chromium.launch({ 
                            headless: false
                        });
                        
                        const loginContext = await login.newContext({
                            userAgent: this.options.userAgent,
                            viewport: { width: 720, height: 720 },
                            locale: 'ko-KR',
                            timezoneId: 'Asia/Seoul'
                        });
                        const loginPage = await loginContext.newPage();
                        await loginPage.goto('https://www.instagram.com/accounts/login/', { 
                            waitUntil: 'domcontentloaded',
                            timeout: this.options.timeout
                        });

                        const input = await question(
                            "로그인이 필요합니다. 로그인 후 continue를 입력하여 계속 진행해주세요. (or stop): "
                        );

                        if (input === "continue") {
                            const cookies = await loginContext.cookies();
                            await fs.writeFile(this.options.cookieFile, JSON.stringify(cookies, null, 2));

                            await loginContext.close();
                            await login.close();

                            const instagram = await chromium.launchPersistentContext(userDataDir, { 
                                headless: this.options.headless,
                                userAgent: this.options.userAgent,
                                viewport: { width: 1920, height: 1080 },
                                locale: 'ko-KR',
                                timezoneId: 'Asia/Seoul'
                            });

                            await instagram.addCookies(cookies);                             
                            return this.runScript(instagram, linkUrl);
                        } else if (input === "stop") {
                            await browser.close();
                            return { error: "stopped", message: "사용자 중단" };
                        } else {
                            console.log("잘못된 입력입니다. 다시 입력해주세요.");
                        }
                    }
                } else {
                    console.error('추출 오류:', result);
                    return result;
                }                
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