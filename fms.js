const { Command } = require('commander');
const login = require('./login');

const program = new Command();

program
    .name('fromista')
    .description('fromis_9 instagram download tool')
    .version('1.0.0');

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
    .option('-m, --member <member>', 'account who want download')
    .option('-a, --all', 'download all accounts')
    .action(async (options) => {
        if (options.all) {
            console.log('please login to instagram');
        } else if (options.member) {
            console.log(options);
        } else {
            console.log('please write argument');
        }
    });

program.parse();