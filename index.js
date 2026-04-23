const { default: makeWASocket, useMultiFileAuthState, disconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: "silent" })
    });

    // طلب كود الربط بالرقم
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode("263785728093");
            console.log("************************************");
            console.log("كود الربط الخاص بك هو: ", code);
            console.log("************************************");
        }, 5000);
    }

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid;
        const isGroup = jid.endsWith("@g.us");

        if (isGroup) {
            const type = Object.keys(msg.message)[0];
            // منع الصور، الاستيكر، الريكورد
            const isForbidden = type === 'imageMessage' || type === 'stickerMessage' || type === 'audioMessage';

            if (isForbidden) {
                // حذف الرسالة وطرد الشخص
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.groupParticipantsUpdate(jid, [msg.key.participant], "remove");
            }
        }
    });

    sock.ev.on("creds.update", saveCreds);
}

startBot();
