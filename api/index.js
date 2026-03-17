const express = require('express');
const { Telegraf, Markup } = require('telegraf');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// ✅ TOKEN QO'SHILDI
const bot = new Telegraf('5879313391:AAGuOpL1-phV7JH-jLFL8rB3G1_1-JL0O2Y');

// Users database
let usersDB = {};

// Middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  if (!usersDB[userId]) {
    usersDB[userId] = {
      id: userId,
      coins: 0,
      hits_left: 10,
      vip: false,
      level: 1
    };
  }
  ctx.user = usersDB[userId];
  await next();
});

// Start command
bot.start(async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎵 VKMusicX Premium', 'https://vk-musicx-premium-bot.vercel.app')],
    [{ text: '💰 Bonus', callback_ 'daily_reward' }],
    [{ text: '⭐ VIP', callback_ 'buy_vip' }]
  ]);
  
  await ctx.reply(`
🎵 <b>VKMusicX Premium Bot</b>

💰 Coins: ${ctx.user.coins}
🎶 Hits: ${ctx.user.hits_left}/10
⭐ Status: ${ctx.user.vip ? 'VIP' : 'Free'}

Mini App 👇
  `, { 
    parse_mode: 'HTML', 
    reply_markup: keyboard 
  });
});

// Daily reward
bot.action('daily_reward', async (ctx) => {
  ctx.user.coins += 100;
  await ctx.answerCbQuery('✅ +100 coins!');
  await ctx.reply(`💰 Yangi balans: ${ctx.user.coins}`);
});

// VIP
bot.action('buy_vip', async (ctx) => {
  await ctx.answerCbQuery('⭐ VIP sotib olish uchun @admin');
});

// Webhook for mini app
app.post('/api/webhook', (req, res) => {
  const data = req.body;
  const userId = parseInt(data.user_id);
  
  if (usersDB[userId]) {
    usersDB[userId].coins += 50;
  }
  
  res.json({ success: true });
});

// Bot start referral
bot.command('start', async (ctx) => {
  const args = ctx.match;
  if (args && args.startsWith('ref_')) {
    const refId = parseInt(args.split('_')[1]);
    if (usersDB[refId]) {
      usersDB[refId].coins += 100;
    }
  }
  await ctx.reply('Bot ishga tushdi! /start');
});

// Launch
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
bot.launch();

module.exports = app;
