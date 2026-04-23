const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const express = require("express");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3000;
let qrImage = ""; // لتخزين صورة الكود

async function startBot() {
    // إنشاء مجلد لحفظ جلسة التسجيل
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        // تغيير هوية المتصفح لتجنب الحظر وسرعة استخراج الكود
        browser: ["Mac OS", "Safari", "10.15.7"]
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
            // تحويل الـ QR لصورة تظهر في المتصفح
            qrImage = await QRCode.toDataURL(qr);
            console.log("✅ الـ QR جاهز الآن في الرابط الخارجي.");
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("تم فصل الاتصال، جاري المحاولة مرة أخرى...", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            qrImage = ""; // مسح الكود بعد النجاح
            console.log("✅✅ تم الاتصال بنجاح! البوت شغال الآن ✅✅");
        }
    });

    // كود الحماية (طرد الميديا)
    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        if (jid.endsWith("@g.us")) {
            const type = Object.keys(msg.message)[0];
            // تحديد أنواع الميديا المحظورة
            const isForbidden = ['imageMessage', 'stickerMessage', 'audioMessage', 'videoMessage'].includes(type);

            if (isForbidden) {
                try {
                    // حذف الرسالة
                    await sock.sendMessage(jid, { delete: msg.key });
                    // طرد الشخص
                    await sock.groupParticipantsUpdate(jid, [msg.key.participant], "remove");
                    console.log(`تم طرد ${msg.key.participant} لإرسال ميديا محظورة.`);
                } catch (err) {
                    console.log("فشل الطرد (تأكد أن البوت أدمن في الجروب)");
                }
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

// إنشاء صفحة الويب لعرض الـ QR
app.get("/", (req, res) => {
    if (qrImage) {
        res.send(`
            <html>
                <body style="background:#121212; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                    <h1 style="color:#25D366;">Anas Guard Bot</h1>
                    <div style="background:white; padding:20px; border-radius:15px;">
                        <img src="${qrImage}" style="width:300px; height:300px;" />
                    </div>
                    <p style="margin-top:20px; font-size:1.2rem;">افتح واتساب > الأجهزة المرتبطة > صور الكود</p>
                    <p style="color:#888;">سيتم تحديث الصفحة تلقائياً كل 30 ثانية</p>
                    <script>setTimeout(() => { location.reload(); }, 30000);</script>
                </body>
            </html>
        `);
    } else {
        res.send(`
            <body style="background:#121212; color:white; text-align:center; padding-top:50px; font-family:sans-serif;">
                <h2>جاري تجهيز الكود...</h2>
                <p>انتظر 30 ثانية ثم أعد تحميل الصفحة</p>
                <script>setTimeout(() => { location.reload(); }, 10000);</script>
            </body>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`السيرفر شغال على منفذ ${PORT}`);
    startBot();
});
