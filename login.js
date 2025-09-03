const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config.js');

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
        args: config.browser.args
    });

    const context = await browser.newContext({
        userAgent: config.browser.userAgent,
        viewport: { width: 720, height: 720 },
        locale: config.browser.locale,
        timezoneId: config.browser.timezoneId
    });

    const page = await context.newPage();
    page.on('load',async () => {
        const pageUrl = page.url();

        console.log(`PAGE LOAD COMPLETE: ${pageUrl}`);
        if (pageUrl.startsWith(config.url.baseUrl)) {
            const loggedin = await page.evaluate(loginCheck);
            if (loggedin) {
                // 쿠키 저장 및 브라우저 종료.
                console.log('LOGIN COMPLETE!');
                const cookies = await context.cookies();

                await fs.mkdir(config.storage.browser, { recursive: true });
                await fs.writeFile(config.storage.cookies, JSON.stringify(cookies, null, 2));

                await context.close();
                await browser.close();
            }
        }
    });
    page.on('close', async () => {
        console.log('PAGE IS CLOSED!');

        await context.close();
        await browser.close();
    });

    page.goto(config.url.login);
}

module.exports = login;