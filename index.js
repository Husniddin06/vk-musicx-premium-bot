const express = require('express');
const { Telegraf, Markup, session } = require('telegraf');
const NodeCache = require('node-cache');
const CryptoJS = require('crypto-js');
const axios = require('axios');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN || '5879313391:AAGuOpL1-phV7JH-jLFL8rB3G1_1-JL0O2Y');
const cache = new NodeCache({ stdTTL: 3600 });
const myCache = new NodeCache({ stdTTL: 86400 });

app.use(express.json());
app.use(express.static('public'));

// === USERS DATABASE (in-memory) ===
let usersDB = {};

// === ENCRYPTION ===
const ENCRYPT_KEY = process.env.ENCRYPT_KEY || 'vk-musicx-secret-2026';
const encrypt = (data) => CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPT_KEY).toString();
const decrypt = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPT_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch {
    return null;
  }
};

// === MIDDLEWARE ===
bot.use(session());
bot.use(async (ctx, next) => {
  const userId = ctx.from.id;
  if (!usersDB[userId]) {
    usersDB[userId] = {
      id: userId,
      username: ctx.from.username || '',
      first_name: ctx.from.first_name || '',
      premium: false,
      vip: false,
      coins: 0,
      plays: 0,
      daily_reward: 0,
      referrals: [],
      created: Date.now(),
      hits_left: 10,
      last_ad: 0,
      level: 1
    };
  }
  ctx.user = usersDB[userId];
  await next();
});

// === COMMANDS ===
bot.start(async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('🎵 VKMusicX Premium', `https://${process.env.VERCEL_URL || 'vk-musicx.vercel.app'}`)],
    [{ text: '💰 Kunlik bonus', callback_ 'daily_reward' }],     // ✅ Tuzatildi!
    [{ text: '👥 Do\'stlarim', callback_ 'referrals' }],         // ✅ Tuzatildi!
    [{ text: '⭐ VIP sotib olish', callback_ 'buy_vip' }]        // ✅ Tuzatildi!
  ]);
  
  await ctx.reply(`
🎵 <b>VKMusicX Premium Bot</b>

<b>Sizning stats:</b>
💰 Coins: <code>${ctx.user.coins}</code>
⭐ Status: ${ctx.user.vip ? '⭐ VIP' : ctx.user.premium ? '💎 Premium' : '🆓 Free'}
🎶 Hits qoldi: ${ctx.user.hits_left}/10
📊 Level: ${ctx.user.level}

Mini App ochish 👇
  `, { parse_mode: 'HTML', reply_markup: keyboard });
});

// === CALLBACK HANDLERS ===
bot.action('daily_reward', async (ctx) => {
  const now = Date.now();
  if (ctx.user.daily_reward && now - ctx.user.daily_reward < 86400000) {
    return ctx.answerCbQuery('⏰ Kunlik bonus faqat 24 soatda 1 marta!');
  }
  
  const reward = ctx.user.vip ? 500 : ctx.user.premium ? 250 : 100;
  ctx.user.coins += reward;
  ctx.user.daily_reward = now;
  cache.set(`user:${ctx.user.id}`, ctx.user);
  
  await ctx.editMessageText(`
✅ <b>Kunlik bonus oldingiz!</b>
💰 +${reward} coins
💰 Jami: <code>${ctx.user.coins}</code>

Mini App 👇
  `, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[Markup.button.webApp('🎵 VKMusicX Premium', `https://${process.env.VERCEL_URL || 'vk-musicx.vercel.app'}`)]]
    }
  });
});

bot.action('buy_vip', async (ctx) => {
  await ctx.answerCbQuery('💎 VIP 30 kun - 5000 so\'m\n\nTo\'lov @admin');
  await ctx.reply('💎 VIP sotib olish uchun @admin ga murojaat qiling!');
});

bot.action('referrals', async (ctx) => {
  const refLink = `https://t.me/${ctx.botInfo.username}?start=ref_${ctx.user.id}`;
  await ctx.reply(`
👥 <b>Referral dasturi</b>

Sizning link: <code>${refLink}</code>

💰 Do'stlar soni: ${ctx.user.referrals.length}
💎 Har bir do'st uchun: 100 coins

Mini App 👇
  `, {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [[Markup.button.webApp('🎵 VKMusicX Premium', `https://${process.env.VERCEL_URL || 'vk-musicx.vercel.app'}`)]]
    }
  });
});

// === WEBHOOK FOR MINI APP DATA ===
app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const data = JSON.parse(req.body.toString());
  const userId = parseInt(data.user_id);
  
  if (usersDB[userId]) {
    usersDB[userId].coins += parseInt(data.coins || 0);
    usersDB[userId].hits_left = Math.max(0, usersDB[userId].hits_left - 1);
    cache.set(`user:${userId}`, usersDB[userId]);
  }
  
  res.json({ success: true });
});

// === START REFERRAL ===
bot.command('start', async (ctx) => {
  const args = ctx.match;
  if (args && args.startsWith('ref_')) {
    const refId = parseInt(args.split('_')[1]);
    if (refId && refId !== ctx.from.id && usersDB[refId]) {
      if (!ctx.user.referrals.includes(ctx.from.id)) {
        usersDB[refId].referrals.push(ctx.from.id);
        usersDB[refId].coins += 100;
        usersDB[ctx.from.id].referred_by = refId;
      }
    }
  }
  await bot.telegram.sendMessage(ctx.chat.id, 'Bot ishga tushdi! /start');
});

// === LAUNCH ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
bot.launch();

module.exports = app;
