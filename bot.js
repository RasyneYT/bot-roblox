// bot.js
// Bot Discord + API HTTP pour répondre aux questions envoyées par un jeu Roblox.
// Le bot reste connecté 24h/24 (voir instructions d'hébergement plus bas)
// et expose une route POST /ask qui reçoit une question et renvoie une réponse IA courte.

require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

// ----------------------------------------------------
// 1. Configuration
// ----------------------------------------------------

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------
// 2. Connexion du bot Discord (le garde "en ligne" 24h/24)
// ----------------------------------------------------

const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

discordClient.once('ready', () => {
  console.log(`✅ Bot Discord connecté en tant que ${discordClient.user.tag}`);
});

discordClient.login(process.env.DISCORD_TOKEN);

// ----------------------------------------------------
// 3. Fonction de nettoyage du texte
//    - retire les retours à la ligne et caractères spéciaux
//    - limite à 120 caractères
// ----------------------------------------------------

function nettoyerTexte(texte) {
  let propre = texte.replace(/[\r\n\t]+/g, ' ');           // supprime sauts de ligne/tabulations
  propre = propre.replace(/[^\p{L}\p{N}\s.,!?'-]/gu, '');   // garde lettres, chiffres, ponctuation simple
  propre = propre.replace(/\s+/g, ' ').trim();              // espaces multiples -> un seul

  if (propre.length > 120) {
    propre = propre.slice(0, 117).trim() + '...';
  }
  return propre;
}

// ----------------------------------------------------
// 4. Route HTTP appelée par le script Roblox
// ----------------------------------------------------

app.post('/ask', async (req, res) => {
  const question = req.body && req.body.question;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Le champ "question" (string) est requis.' });
  }

  try {
    // Appel à l'API OpenAI (voir plus bas pour utiliser Gemini à la place)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Tu réponds de façon très courte, factuelle et exacte, en une seule phrase, ' +
            'sans mise en forme, sans emoji, sans guillemets.'
        },
        { role: 'user', content: question }
      ],
      max_tokens: 60,
      temperature: 0.2
    });

    const reponseBrute = completion.choices[0].message.content || '';
    const reponsePropre = nettoyerTexte(reponseBrute);

    return res.json({ answer: reponsePropre });
  } catch (erreur) {
    console.error('Erreur lors de l\'appel IA :', erreur);
    return res.status(500).json({ error: "Impossible d'obtenir une réponse pour le moment." });
  }
});

// Route de santé simple, pratique pour vérifier que le serveur tourne
app.get('/health', (req, res) => {
  res.json({ status: 'ok', discordReady: discordClient.isReady() });
});

// ----------------------------------------------------
// 5. Démarrage du serveur HTTP
// ----------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 API en écoute sur le port ${PORT}`);
});
