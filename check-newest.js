const { chromium } = require('playwright');
const storage = require('./url-storage.js');
const config = require('./config.js');
const fs = require('fs').promises;

const loginCheck = () => {
    const h = document.documentElement.innerHTML;    
    // 로그인 필요 체크
    if (h.includes('"PolarisViewer",[],{"data":null')) {
        return false;
    }

    return true;
}


async function loadCookies(browser) {
    try {
        const cookieData = await fs.readFile(config.storage.cookies, 'utf8');
        const cookies = JSON.parse(cookieData);
        await browser.addCookies(cookies);
        console.log("저장된 쿠키를 로드했습니다.");
    } catch (error) {
        console.log("저장된 쿠키가 없습니다.");
    }
}

async function getUrls(user) {
    const browser = await chromium.launch({ 
        headless: true,
        args: config.browser.args
    });
    const context = await browser.newContext({
        userAgent: config.browser.userAgent,
        locale: config.browser.locale,
        timezoneId: config.browser.timezoneId
    });

    try {
        await loadCookies(context);
        const page = await context.newPage();

        // User-Agent 설정 (봇 차단 방지)
        await page.goto(`https://www.instagram.com/${user}/`);
        // 패턴에 해당하는 요소가 나타날 때까지 대기
        const pattern = `a[href*="/${user}/p/"]`
        await page.waitForSelector(pattern, { timeout: 10000 });
    
        const loggedin = await page.evaluate(loginCheck);
        if (!loggedin) {
            return { error: 'login_required', message: '로그인이 필요합니다' };
        }

        // 각 요소의 실제 내용 추출
        const elementContents = await page.evaluate((_pattern) => {
            const links = document.querySelectorAll(_pattern);
            return Array.from(links).map((link, index) => (
                {
                    index: index + 1,
                    href: link.href
                }
            ));
        }, pattern);

        let urls = [];
        for (const item of elementContents) {
            if (storage.has(item.href)) {
                continue;
            }

            urls.push(item.href);
        }

        return urls.slice(0, 5);
    } catch (error) {
        return {
            error: 'check-error',
            message: error.message
        }
    } finally {
        browser.close();
    }
}

module.exports = getUrls;