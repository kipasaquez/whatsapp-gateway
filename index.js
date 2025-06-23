const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const WebSocket = require('ws');
const qr = require('qr-image');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
require('dotenv').config();

// Initialize Express app and WebSocket server
const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Store WebSocket clients
const clients = new Set();

// Initialize logger
const logger = pino({ level: 'info' });

// Settings storage
let settings = {
    webhookUrl: process.env.WEBHOOK_URL || '',
    delayTime: parseInt(process.env.WEBHOOK_DELAY_MS) || 2000,
    enableReadReceipts: true,
    readWebhookUrl: process.env.READ_WEBHOOK_URL || '',
    messagesSent: 0,
    startTime: Date.now()
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// API endpoints for web interface
app.get('/api/settings', (req, res) => {
    res.json({
        webhookUrl: settings.webhookUrl,
        delayTime: settings.delayTime,
        enableReadReceipts: settings.enableReadReceipts,
        readWebhookUrl: settings.readWebhookUrl
    });
});

app.post('/api/settings/webhook', (req, res) => {
    const { webhookUrl, delayTime } = req.body;
    settings.webhookUrl = webhookUrl;
    settings.delayTime = parseInt(delayTime) || 2000;
    res.json({ status: true, message: 'Settings updated successfully' });
});

app.post('/api/settings/read-receipts', (req, res) => {
    const { enableReadReceipts, readWebhookUrl } = req.body;
    settings.enableReadReceipts = enableReadReceipts;
    settings.readWebhookUrl = readWebhookUrl;
    res.json({ status: true, message: 'Read receipt settings updated successfully' });
});

app.get('/api/status', (req, res) => {
    const uptime = Math.floor((Date.now() - settings.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    res.json({
        connected: waClient?.user?.id ? true : false,
        uptime: `${hours}h ${minutes}m ${seconds}s`,
        messagesSent: settings.messagesSent
    });
});

// Serve static files after API endpoints
app.use(express.static('public'));

// Serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global variable to store WhatsApp client
let waClient;

// Function to send webhook with delay
async function sendWebhookWithDelay(payload) {
    setTimeout(async () => {
        try {
            if (settings.webhookUrl) {
                await axios.post(settings.webhookUrl, payload);
                logger.info('Webhook sent successfully:', payload);
            }
        } catch (error) {
            logger.error('Failed to send webhook:', error.message);
        }
    }, settings.delayTime);
}

// Function to send read receipt webhook
async function sendReadReceiptWebhook(payload) {
    if (settings.enableReadReceipts && settings.readWebhookUrl) {
        try {
            await axios.post(settings.readWebhookUrl, payload);
            logger.info('Read receipt webhook sent successfully:', payload);
        } catch (error) {
            logger.error('Failed to send read receipt webhook:', error.message);
        }
    }
}

// Initialize WhatsApp connection
async function startWhatsApp() {
    const sessionDir = path.join(__dirname, 'sessions');
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const client = makeWASocket({
        auth: state,
        logger
    });

    // Handle credentials update
    client.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    client.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const jid = msg.key.remoteJid;
            if (!jid) continue;

            let payload;
            const recipientId = waClient.user.id.split(':')[0];
            
            if (msg.message.conversation) {
                payload = {
                    type: 'text',
                    from: jid.split('@')[0],
                    to: recipientId,
                    senderName: msg.pushName || 'Unknown',
                    message: msg.message.conversation
                };
            } else if (msg.message.imageMessage) {
                payload = {
                    type: 'media',
                    from: jid.split('@')[0],
                    to: recipientId,
                    senderName: msg.pushName || 'Unknown',
                    mediaType: 'image',
                    mediaUrl: msg.message.imageMessage.url,
                    mimetype: msg.message.imageMessage.mimetype,
                    caption: msg.message.imageMessage.caption || ''
                };
            } else if (msg.message.videoMessage) {
                payload = {
                    type: 'media',
                    from: jid.split('@')[0],
                    to: recipientId,
                    senderName: msg.pushName || 'Unknown',
                    mediaType: 'video',
                    mediaUrl: msg.message.videoMessage.url,
                    mimetype: msg.message.videoMessage.mimetype,
                    caption: msg.message.videoMessage.caption || ''
                };
            } else if (msg.message.locationMessage) {
                payload = {
                    type: 'location',
                    from: jid.split('@')[0],
                    to: recipientId,
                    senderName: msg.pushName || 'Unknown',
                    latitude: msg.message.locationMessage.degreesLatitude,
                    longitude: msg.message.locationMessage.degreesLongitude,
                    name: msg.message.locationMessage.name || '',
                    address: msg.message.locationMessage.address || ''
                };
            }

            if (payload) {
                await sendWebhookWithDelay(payload);
            }
        }
    });

    // Handle message status updates (read receipts)
    client.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.status === 'READ') {
                const payload = {
                    type: 'receipt',
                    id: update.key.id,
                    to: update.key.remoteJid.split('@')[0],
                    status: 'read'
                };
                await sendReadReceiptWebhook(payload);
            }
        }
    });

    // Handle connection updates with WebSocket
    client.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Generate QR code as data URL
            const qrImage = qr.image(qr, { type: 'png' });
            const chunks = [];
            qrImage.on('data', (chunk) => chunks.push(chunk));
            qrImage.on('end', () => {
                const qrBuffer = Buffer.concat(chunks);
                const qrDataUrl = 'data:image/png;base64,' + qrBuffer.toString('base64');
                broadcast({ type: 'qr', qr: qrDataUrl });
            });
            logger.info('Scan QR code to connect to WhatsApp');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 403;
            logger.info('Connection closed. Reconnecting:', shouldReconnect);
            broadcast({ type: 'connection', connected: false });
            if (shouldReconnect) {
                startWhatsApp();
            }
        } else if (connection === 'open') {
            logger.info('WhatsApp connection opened');
            broadcast({ type: 'connection', connected: true });
        }
    });

    return client;
}

// WebSocket handlers
wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
        clients.delete(ws);
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

// Add logout endpoint
app.post('/api/logout', async (req, res) => {
    try {
        if (waClient) {
            await waClient.logout();
            await waClient.end();
            waClient = null;
            
            // Delete session files
            const sessionDir = path.join(__dirname, 'sessions');
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }
            
            broadcast({ type: 'connection', connected: false });
            res.json({ status: true, message: 'Logged out successfully' });
        } else {
            res.status(400).json({ status: false, message: 'Not logged in' });
        }
    } catch (error) {
        logger.error('Error during logout:', error);
        res.status(500).json({ status: false, message: 'Error during logout' });
    }
});

// Start the application
(async () => {
    try {
        // Start WhatsApp client
        waClient = await startWhatsApp();

        // Start Express server with WebSocket support
        const PORT = 8000;
        server.listen(PORT, () => {
            logger.info(`WhatsApp Gateway server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Error starting the application:', error);
        process.exit(1);
    }
})();
