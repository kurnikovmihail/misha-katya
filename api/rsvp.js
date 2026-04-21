const { Resend } = require('resend');

const RECIPIENT = 'belitskayaekaterinka@yandex.ru';
const SENDER = 'Mikhail & Ekaterina <onboarding@resend.dev>';

function normalize(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    const contentType = String(req.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      return JSON.parse(req.body);
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }

  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  return {};
}

exports.handler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = await readBody(req);
    const guestName = normalize(body['Имя и фамилия'] || body.name);
    const presence = normalize(body['Присутствие'] || body.presence);

    if (!guestName) {
      return res.status(400).json({ error: 'Укажите имя и фамилию.' });
    }

    if (!presence) {
      return res.status(400).json({ error: 'Выберите вариант присутствия.' });
    }

    const apiKey = normalize(process.env.RESEND_API_KEY);
    if (!apiKey) {
      return res.status(500).json({ error: 'Не задан RESEND_API_KEY.' });
    }

    const resend = new Resend(apiKey);
    const subject = `Подтверждение приглашения: ${guestName}`;
    const text = [
      'Новое подтверждение приглашения',
      `Имя: ${guestName}`,
      `Ответ: ${presence}`,
      `Дата отправки: ${new Date().toISOString()}`,
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#3b332e">
        <h2 style="margin:0 0 12px">Новое подтверждение приглашения</h2>
        <p style="margin:0 0 8px"><strong>Имя:</strong> ${escapeHtml(guestName)}</p>
        <p style="margin:0 0 8px"><strong>Ответ:</strong> ${escapeHtml(presence)}</p>
        <p style="margin:0"><strong>Дата отправки:</strong> ${new Date().toISOString()}</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: SENDER,
      to: RECIPIENT,
      subject,
      text,
      html,
    });

    if (error) {
      return res.status(500).json({
        error: error.message || 'Не удалось отправить письмо.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Не удалось отправить письмо.',
    });
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
