const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const cookieFile = './browser-cookies.json';

const loginCheck = () => {
    const h = document.documentElement.innerHTML;    
    // 로그인 필요 체크
    if (h.includes('"PolarisViewer",[],{"data":null')) {
        return false;
    }

    return true;
}
async function login() {
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 720, height: 720 },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    });

    const page = await context.newPage();
    page.on('load',async () => {
        const pageUrl = page.url();

        console.log(`PAGE LOAD COMPLETE: ${pageUrl}`);
        if (pageUrl.startsWith('https://www.instagram.com/')) {
            const loggedin = await page.evaluate(loginCheck);
            if (loggedin) {
                // 쿠키 저장 및 브라우저 종료.
                console.log('LOGIN COMPLETE!');
                const cookies = await context.cookies();
                await fs.writeFile(cookieFile, JSON.stringify(cookies, null, 2));

                await context.close();
                await browser.close();
            }
        }
    });

    page.goto('https://www.instagram.com/accounts/login/');
}

module.exports = login;