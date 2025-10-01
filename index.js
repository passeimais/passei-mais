// index.js — Bot mínimo
require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('Faltou o BOT_TOKEN no .env');
  process.exit(1);
}

const bot = new Telegraf(token);

// 1) /start
bot.start((ctx) => ctx.reply('Bem-vindo! Envie /q para receber uma questão.'));

// 2) Questão de teste (só para ver funcionando)
const question = {
  subject: 'Português',
  stem: 'Assinale a alternativa correta.',
  choices: ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'],
  answerKey: 'B',
  explanation: 'Porque a alternativa B está correta.'
};

// 3) /q → envia questão com botões A-D
bot.command('q', async (ctx) => {
  const letters = ['A','B','C','D'];
  const keyboard = letters.map((L, i) => [Markup.button.callback(`${L}) ${question.choices[i]}`, `ans:${L}`)]);
  const text = `<b>${question.subject}</b>\n${question.stem}`;
  await ctx.reply(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(keyboard) });
});

// 4) Clique no botão → corrige
bot.action(/^ans:(.+)$/, async (ctx) => {
  const choice = ctx.match[1];
  await ctx.answerCbQuery(); // tira o "relógio"
  const correct = question.answerKey;
  const exp = `\n\n<b>Comentário:</b> ${question.explanation}`;
  if (choice === correct) {
    await ctx.reply('✅ CORRETA!' + exp, { parse_mode: 'HTML' });
  } else {
    await ctx.reply(`❌ INCORRETA. Gabarito: ${correct}` + exp, { parse_mode: 'HTML' });
  }
});

// 5) Inicia em "polling" (não precisa webhook ainda)
bot.launch();
console.log('Bot ligado. Envie /start no Telegram.');
