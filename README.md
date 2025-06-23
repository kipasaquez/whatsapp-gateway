
Built by https://www.blackbox.ai

---

# WhatsApp Gateway

## Project Overview

WhatsApp Gateway is a Node.js application that leverages the Baileys library to create a gateway for sending and receiving messages via WhatsApp. This project allows for the integration of WhatsApp into various applications by providing an API for sending messages and receiving status updates. It includes a QR code scanning feature, which is essential for connecting to WhatsApp.

## Installation

To install the WhatsApp Gateway, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/whatsapp-gateway.git
   cd whatsapp-gateway
   ```

2. **Install dependencies:**

   Ensure you have Node.js installed. Then, run the following command in the project directory:

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root of your project and configure necessary environment variables:

   ```plaintext
   WEBHOOK_URL=https://your-webhook-url.com
   WEBHOOK_DELAY_MS=2000
   READ_WEBHOOK_URL=https://your-read-webhook-url.com
   ```

   Adjust the above values to fit your setup.

4. **Start the server:**

   Launch the application using:

   ```bash
   npm start
   ```

## Usage

Once the server is running, you can access the following API endpoints:

- `GET /api/settings` - Retrieve current gateway settings.
- `POST /api/settings/webhook` - Update the webhook URL and delay time.
- `POST /api/settings/read-receipts` - Update settings for read receipts.
- `GET /api/status` - Check the status of the WhatsApp connection and messages sent.
- `POST /api/logout` - Logout from the WhatsApp account and clear sessions.

You can also connect via WebSocket to receive real-time updates, including QR code data and message statuses.

## Features

- **Web API**: Access to settings and status of the WhatsApp gateway.
- **QR Code Generation**: Automatic generation of a QR code for connecting WhatsApp clients.
- **Webhook Support**: Send received messages to a configured webhook URL with a configurable delay.
- **Real-time Updates**: WebSocket integration for real-time updates on connection status and incoming messages.
- **Read Receipts**: Optionally, send read receipt notifications to a specified URL.

## Dependencies

The project uses the following key dependencies:

- **@whiskeysockets/baileys**: Library for interacting with the WhatsApp Web API.
- **axios**: Promise-based HTTP client for making requests.
- **dotenv**: Allows environment variables to be loaded from a `.env` file.
- **express**: Fast, unopinionated, minimalist web framework for Node.js.
- **pino**: Extremely fast JSON logger for Node.js.
- **qr-image**: Generates QR codes in image format.
- **qrcode-terminal**: Creates QR codes in the terminal.
- **ws**: WebSocket library for Node.js.

Refer to the `package.json` for a complete list of dependencies.

## Project Structure

The project is structured as follows:

```
whatsapp-gateway/
├── .env                 # Environment variables configuration
├── index.js             # Main application file
├── package.json         # Project metadata and dependencies
├── package-lock.json    # Exact versions of installed dependencies
└── sessions/            # Directory to store WhatsApp session files
```

## License

This project is licensed under the ISC License.

---

For further questions or issues, please open an issue in the GitHub repository.