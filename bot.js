const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const COINBASE_API = 'https://api.coinbase.com/v2';

let priceAlerts = {};
let portfolios = {};

async function getPrice(symbol) {
  try {
    const res = await axios.get(`${COINBASE_API}/exchange-rates?currency=${symbol.toUpperCase()}`);
    return parseFloat(res.data.data.rates.USD);
  } catch {
    try {
      const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`, { timeout: 5000 });
      return res.data[symbol.toLowerCase()]?.usd || null;
    } catch { return null; }
  }
}

async function checkAlerts() {
  for (const [guildId, alerts] of Object.entries(priceAlerts)) {
    for (const alert of alerts) {
      const price = await getPrice(alert.symbol);
      if (!price) continue;
      let triggered = false;
      if (alert.condition === 'above' && price > alert.target) triggered = true;
      if (alert.condition === 'below' && price < alert.target) triggered = true;
      if (triggered) {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(alert.channelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setTitle(`Price Alert: ${alert.symbol.toUpperCase()}`)
            .setDescription(`Price is now $${price.toLocaleString()}`)
            .setColor('#fbbf24')
            .addFields(
              { name: 'Condition', value: `${alert.condition} $${alert.target.toLocaleString()}`, inline: true },
              { name: 'Current', value: `$${price.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
          channel.send({ embeds: [embed] });
        }
        alert.triggered = true;
      }
    }
    priceAlerts[guildId] = alerts.filter(a => !a.triggered);
  }
}

client.on('ready', () => {
  console.log(`Bot logged in as ${client.user.tag}`);
  setInterval(checkAlerts, 60000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'price') {
    const symbol = args[0] || 'bitcoin';
    const price = await getPrice(symbol);
    if (!price) return message.reply('Symbol not found. Try: !price bitcoin');
    const embed = new EmbedBuilder()
      .setTitle(`${symbol.toUpperCase()} Price`)
      .setDescription(`$${price.toLocaleString()}`)
      .setColor('#22c55e')
      .setTimestamp();
    message.reply({ embeds: [embed] });
  }

  if (cmd === 'alert') {
    const [symbol, condition, target] = args;
    if (!symbol || !condition || !target) return message.reply('Usage: !alert bitcoin above 70000');
    const guildId = message.guildId;
    if (!priceAlerts[guildId]) priceAlerts[guildId] = [];
    priceAlerts[guildId].push({
      symbol: symbol.toLowerCase(), condition, target: parseFloat(target),
      channelId: message.channelId, triggered: false
    });
    message.reply(`Alert set: ${symbol.toUpperCase()} ${condition} $${target}`);
  }

  if (cmd === 'portfolio') {
    const userId = message.author.id;
    const action = args[0];
    if (action === 'add') {
      const [symbol, amount, avgPrice] = args.slice(1);
      if (!portfolios[userId]) portfolios[userId] = {};
      portfolios[userId][symbol.toLowerCase()] = { amount: parseFloat(amount), avgPrice: parseFloat(avgPrice) };
      message.reply(`Added ${amount} ${symbol.toUpperCase()} at $${avgPrice}`);
    } else if (action === 'show') {
      const pf = portfolios[userId];
      if (!pf || Object.keys(pf).length === 0) return message.reply('Portfolio empty. Use: !portfolio add bitcoin 0.5 45000');
      let totalValue = 0, totalCost = 0;
      const fields = [];
      for (const [sym, data] of Object.entries(pf)) {
        const price = await getPrice(sym);
        if (!price) continue;
        const value = data.amount * price;
        const cost = data.amount * data.avgPrice;
        const pnl = value - cost;
        totalValue += value; totalCost += cost;
        fields.push({
          name: sym.toUpperCase(),
          value: `${data.amount} @ $${data.avgPrice}\nCurrent: $${price.toLocaleString()}\nP&L: $${pnl.toFixed(2)}`,
          inline: true
        });
      }
      const embed = new EmbedBuilder()
        .setTitle('Portfolio')
        .addFields(...fields)
        .addFields({ name: 'Total P&L', value: `$${(totalValue - totalCost).toFixed(2)}`, inline: false })
        .setColor(totalValue > totalCost ? '#22c55e' : '#ef4444')
        .setTimestamp();
      message.reply({ embeds: [embed] });
    }
  }

  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('Crypto Bot Commands')
      .addFields(
        { name: '!price [symbol]', value: 'Get current price' },
        { name: '!alert [symbol] [above/below] [price]', value: 'Set price alert' },
        { name: '!portfolio add [symbol] [amount] [avgPrice]', value: 'Add to portfolio' },
        { name: '!portfolio show', value: 'View portfolio with P&L' }
      )
      .setColor('#3b82f6');
    message.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
