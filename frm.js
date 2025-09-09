#!/usr/bin/env node

const { Command } = require('commander');
const login = require('./login.js');
const download = require('./download.js');
const check = require('./check-newest.js');
const configure = require('./config.js');
const storage = require('./url-storage.js');

const program = new Command();

program
    .name('fromista')
    .description('fromis_9 instagram download tool')
    .version('1.0.0');

// 로그인
program
    .command('login')
    .description('instagram login')
    .action(async () => {
        try {
            await login();
        } catch (error) {
            console.error('❌ login failed: ', error.message);
            process.exit(1);
        }
    });

// 계정 이름을 argument로 받기
program
    .option('-u, --user <member>', 'account who want download.')
    .option('-a, --all', 'download all accounts.')
    .option('-l, --link <url>', 'download from instagram url')
    .option('-o, --output <path>', 'set downloads path.')
    .option('-c, --clear', 'reset all caches and settings.')
    .option('-t, --thumbnail <boolean>', 'set whether to download the video with its thumbnail')
    .action(async (options) => {
        let setConfig = false;

        if (options.clear) {
            await configure.clear();
            await storage.clear();
            setConfig = true;
        }

        if (options.output) {
            await configure.output(options.output);
            setConfig = true;
        }

        if (options.thumbnail) {
            const boolean = options.thumbnail 
            if (!boolean || typeof boolean !== 'string') {
                console.error(`thumbnail options must 'yes' or 'no'`);
                return;
            }

            const lower = boolean.toLowerCase();
            if (lower !== 'yes' && lower !== 'no') {
                console.error(`invalid option: ${boolean}. thumbnail options must 'yes' or 'no'`);
                return;
            }

            await configure.thumbnail(lower);
            setConfig = true;
        }

        if (setConfig) {
            console.log('configure completed! retry download.');
            return;
        }

        if (options.all) {
            console.log('please login to instagram');
        } else if (options.user) {
            const contents = await check(options.user);
            if (contents.error) {
                if (contents.error === 'login_required') {
                    console.log('please login to instagram');
                    return;
                }

                console.log('can not get content urls: ', contents.message);
                return;
            }

            for (const url of contents) {
                await download(url);
            }
        } else if (options.link) {
            await download(options.link);
        }
    });

program.parse();