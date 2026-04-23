const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // قفلنا الـ QR عشان نستخدم الكود
        logger: pino({ level: "silent" })
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("تم قفل الاتصال، جاري إعادة المحاولة...", shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅ البوت اتصل بنجاح وهو الآن شغال!");
        }

        // طلب الكود فقط لما الحالة تكون "waiting" والاتصال لسه بيبدأ
        if (!sock.authState.creds.registered && connection === "connecting") {
            // استنى 5 ثواني للتأكد إن السوكيت جاهز
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode("263785728093");
                    console.log("************************************");
                    console.log("كود الربط الخاص بك هو: ", code);
                    console.log("************************************");
                } catch (e) {
                    console.log("فشل طلب الكود، السيرفر هيحاول تاني تلقائياً...");
                }
            }, 10000);
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const jid = msg.key.remoteJid;

        if (jid.endsWith("@g.us")) {
            const type = Object.keys(msg.message)[0];
            const isForbidden = ['imageMessage', 'stickerMessage', 'audioMessage', 'videoMessage'].includes(type);

            if (isForbidden) {
                try {
                    await sock.sendMessage(jid, { delete: msg.key });
                    await sock.groupParticipantsUpdate(jid, [msg.key.participant], "remove");
                } catch (err) {
                    console.log("محتاج صلاحية أدمن للطرد");
                }
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();
