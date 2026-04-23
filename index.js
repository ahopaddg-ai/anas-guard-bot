const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const QRCode = require("qrcode");
const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeUrl = ""; // هنا هنخزن صورة الـ QR

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true // هيفضل يظهر في اللوج برضه للاحتياط
    });

    sock.ev.on("connection.update", async (update) => {
        const { qr, connection } = update;
        if (qr) {
            // تحويل الكود لرابط صورة (Data URL) عشان تفتح في المتصفح
            qrCodeUrl = await QRCode.toDataURL(qr);
            console.log("✅ الـ QR Code جاهز في الرابط الخارجي!");
        }
        if (connection === "open") console.log("✅ تم الربط بنجاح!");
    });

    sock.ev.on("creds.update", saveCreds);

    // إضافة نظام الحماية (طرد الصور والاستيكر)
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const jid = msg.key.remoteJid;
        if (jid.endsWith("@g.us")) {
            const type = Object.keys(msg.message)[0];
            if (['imageMessage', 'stickerMessage', 'audioMessage'].includes(type)) {
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.groupParticipantsUpdate(jid, [msg.key.participant], "remove");
            }
        }
    });
}

// إنشاء الرابط الخارجي
app.get("/", (req, res) => {
    if (qrCodeUrl) {
        res.send(`
            <html>
                <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;flex-direction:column;font-family:sans-serif;">
                    <h1>Scanner for WhatsApp Bot</h1>
                    <img src="${qrCodeUrl}" style="border:10px solid white; border-radius:10px;" />
                    <p>صور الكود ده من الموبايل عشان تشغل البوت</p>
                    <script>setTimeout(() => { location.reload(); }, 20000);</script>
                </body>
            </html>
        `);
    } else {
        res.send("<h1>جاري تجهيز الكود.. حدث الصفحة بعد ثواني</h1>");
    }
});

app.listen(PORT, () => { console.log(`السيرفر شغال على منفذ ${PORT}`); });
startBot();
