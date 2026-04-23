const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"] // تعريف المتصفح عشان واتساب يقبل الربط
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === "close") {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === "open") {
            console.log("✅✅ تم الاتصال بنجاح! البوت شغال الآن ✅✅");
        }

        // طلب الكود مرة واحدة فقط عند بداية التشغيل
        if (connection === "connecting" && !sock.authState.creds.registered) {
            console.log("جاري التحضير لطلب كود الربط... انتظر 20 ثانية");
            
            setTimeout(async () => {
                try {
                    // الرقم الخاص بك من الصورة
                    let code = await sock.requestPairingCode("263785728093");
                    console.log("************************************");
                    console.log("كود الربط الخاص بك هو: ", code);
                    console.log("************************************");
                } catch (e) {
                    console.log("واتساب رفض الطلب حالياً.. انتظر دقيقتين وقم بعمل Restart للمشروع");
                }
            }, 20000); // زيادة وقت الانتظار لـ 20 ثانية لتجنب الـ Loop
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
                    // فشل الطرد غالباً لعدم وجود صلاحية أدمن
                }
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();
