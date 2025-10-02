require("dotenv").config();
const { Telegraf } = require("telegraf");
const { Pool } = require("pg");

// Conexão com o banco Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const bot = new Telegraf(process.env.BOT_TOKEN);

// /start -> cadastra aluno
bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const name = ctx.from.first_name;

  try {
    await pool.query(
      `INSERT INTO users (telegram_id, name) 
       VALUES ($1, $2)
       ON CONFLICT (telegram_id) DO NOTHING`,
      [telegramId, name]
    );
    ctx.reply(`Bem-vindo, ${name}! Você foi cadastrado ✅\nUse /q para receber uma questão.`);
  } catch (err) {
    console.error(err);
    ctx.reply("Erro ao cadastrar usuário ❌");
  }
});

// /q -> sorteia e envia questão
bot.command("q", async (ctx) => {
  try {
    const res = await pool.query(
      "SELECT * FROM questions ORDER BY RANDOM() LIMIT 1"
    );
    if (res.rows.length === 0) return ctx.reply("Nenhuma questão disponível 😢");

    const q = res.rows[0];

    const text = `📚 *${q.subject}*\n\n${q.statement}\n\nA) ${q.a}\nB) ${q.b}\nC) ${q.c}\nD) ${q.d}\n\nResponda com A, B, C ou D.`;

    await ctx.replyWithMarkdown(text);

    // Salva histórico de envio
    await pool.query(
      "INSERT INTO user_questions (telegram_id, question_id) VALUES ($1, $2)",
      [ctx.from.id, q.id]
    );
  } catch (err) {
    console.error(err);
    ctx.reply("Erro ao buscar questão ❌");
  }
});

// Responder A/B/C/D
// Responder A/B/C/D
// Responder A/B/C/D
bot.hears(/^[ABCD]$/i, async (ctx) => {
  const answer = ctx.message.text.trim().toUpperCase();
  const telegramId = ctx.from.id;

  try {
    // Pega a última questão pendente desse usuário
    const { rows } = await pool.query(`
      SELECT 
        uq.id              AS user_question_id,
        q.id               AS question_id,
        q.correct          AS correct
      FROM user_questions uq
      JOIN questions q      ON q.id = uq.question_id
      WHERE uq.telegram_id = $1
        AND uq.answered = FALSE
      ORDER BY uq.sent_at DESC
      LIMIT 1
    `, [telegramId]);

    if (rows.length === 0) {
      await ctx.reply('📭 Nenhuma questão pendente. Envie /questao para receber uma.');
      return;
    }

    const pending = rows[0];
    const isCorrect = answer === pending.correct;

    // Atualiza o registro com a resposta
    await pool.query(`
      UPDATE user_questions
      SET answered = TRUE,
          answer_given = $1,
          correct = $2
      WHERE id = $3
    `, [answer, isCorrect, pending.user_question_id]);

    // Feedback imediato
    if (isCorrect) {
      await ctx.reply('✅ Resposta correta! Parabéns!');
    } else {
      await ctx.reply(`❌ Resposta incorreta.\nA correta era: ${pending.correct}`);
    }

    await ctx.reply('Quer outra? Envie "Questão do dia" ou /questao');

  } catch (err) {
    console.error(err);
    await ctx.reply('⚠️ Erro ao validar sua resposta. Tente novamente em instantes.');
  }
});


bot.launch();
console.log("🤖 Bot rodando...");
