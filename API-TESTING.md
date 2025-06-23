# WhatsApp Gateway API Testing Guide

This guide provides curl commands to test the WhatsApp Gateway APIs locally or in your preferred environment.

## 1. Send Text Message

Send a text message to a WhatsApp number.

```bash
curl -X POST http://localhost:8000/send-text \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "6281234567890",
    "message": "Hello from WhatsApp Gateway!"
  }'
```

## 2. Send Media Message

Send a media message (image, video, or document) to a WhatsApp number.

```bash
curl -X POST http://localhost:8000/send-media \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "6281234567890",
    "type": "image",
    "url": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }'
```

Replace `"type"` with `"video"` or `"document"` as needed.

## 3. Get Current Status

Check the connection status, uptime, and messages sent.

```bash
curl http://localhost:8000/api/status
```

## 4. Update Webhook Settings

Update the webhook URL and delay time.

```bash
curl -X POST http://localhost:8000/api/settings/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhookUrl": "https://your-webhook-url.com",
    "delayTime": 2000
  }'
```

## 5. Update Read Receipt Settings

Enable or disable read receipts and update the read receipt webhook URL.

```bash
curl -X POST http://localhost:8000/api/settings/read-receipts \\
  -H "Content-Type: application/json" \\
  -d '{
    "enableReadReceipts": true,
    "readWebhookUrl": "https://your-read-receipt-webhook.com"
  }'
```

## 6. Logout

Logout the current WhatsApp session.

```bash
curl -X POST http://localhost:8000/api/logout
```

---

Replace `localhost:8000` with your server address if running remotely.

Make sure your WhatsApp Gateway server is running before testing these commands.

If you need help setting up or running the server locally, please let me know.
