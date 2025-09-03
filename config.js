const config = {
    browser: {
        args:  ['--no-blink-features=AutomationControlled'],
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
    },
    storage: {
        cookies: './browser-profiles/instgram-cookies.json',
        downloads: './downloads',
        browser: './browser-profiles'
    },
    url: {
        login: 'https://www.instagram.com/accounts/login/',
        baseUrl: 'https://www.instagram.com/'
    }
}

module.exports = config;