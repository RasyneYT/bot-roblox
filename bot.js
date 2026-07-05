const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Initialisation du client Discord (vérifie tes intents selon tes besoins)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration stricte de tes salons Discord (IDs de ton serveur)
const SALONS_DATA = {
    data: "1523156967865188412",
    data_chat: "1523157275735494779",
    data_player: "1523157085196521492",
    data_save: "1523157156822519918",
    data_anti_roblox: "1523158393551061062"
};

/**
 * Envoie un rapport stylisé sous forme d'Embed dans le salon désigné
 */
async function envoyerDonneesSalon(nomSalon, titre, description, couleur = '#0099ff') {
    const channelId = SALONS_DATA[nomSalon];
    if (!channelId) return console.error(`[Erreur] Salon clé "${nomSalon}" introuvable.`);

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(titre)
            .setDescription(description)
            .setColor(couleur)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Impossible d'envoyer dans #${nomSalon}:`, error);
    }
}

// =========================================================================
// SERVEUR WEB API (RÉCEPTION DES DONNÉES ROBLOX & EDITEUR DU TOTEM)
// =========================================================================
const app = express();
app.use(express.json());

app.post('/api/roblox-logs', (req, res) => {
    const { type, titre, contenu, couleur } = req.body;

    if (!type || !SALONS_DATA[type]) {
        return res.status(400).json({ error: "Type de salon invalide" });
    }

    // 1. Envoi immédiat des logs au salon Discord correspondant
    envoyerDonneesSalon(type, titre, contenu, couleur || '#ffffff');

    // 2. Traitement et synchronisation avec le TOTEM du Bot
    if (type === "data_save") {
        try {
            // Extraction du compteur depuis la structure de la BDD envoyée par Lua
            const matches = contenu.match(/Total Messages IA :\*\* (\d+)/);
            const totalMessages = matches ? matches[1] : "0";

            // Met à jour l'activité du Bot (Le totem affiche : Regarde Roblox | 💬 X messages)
            client.user.setActivity(`Roblox | 💬 ${totalMessages} messages gérés`, {
                type: 3 // Activité : Regarde (Watching)
            });
        } catch (err) {
            console.error("Erreur lors du traitement du Totem :", err);
        }
    }

    res.json({ success: true });
});

// Événement d'allumage du Bot Discord
client.once('ready', () => {
    console.log(`Bot connecté en tant que : ${client.user.tag}`);
    envoyerDonneesSalon('data', '🟢 Bot Connecté', 'L\'infrastructure Node.js est en ligne et à l\'écoute de l\'API.', '#2ecc71');
});

// Connexion au Token Discord de ton application (géré via tes variables d'environnement)
client.login(process.env.DISCORD_TOKEN || "METS_TON_TOKEN_DISCORD_ICI");

// Lancement du serveur d'écoute sur le port de Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur de communication Roblox connecté sur le port : ${PORT}`);
});