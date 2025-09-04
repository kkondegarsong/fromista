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
    .option('-o, --output <path>', 'set downloads path.')
    .option('-c, --clear', 'reset all caches and settings.')
    .action(async (options) => {
        if (options.clear) {
            await configure.clear();
            await storage.clear();
        }

        if (options.output) {
            await configure.setOutput(options.output);
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
        }
    });

program.parse();