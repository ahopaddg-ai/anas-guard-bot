const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");

const warnings = {}; 
const badWords = ["خول", "عرص", "منيك", "شرموط", "كسمك", "خوال"]; 

async function startAnasBot() {
    const { state, saveCreds } = await useMultiFileAuthState('anas_auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        browser: ["Anas Guard", "Chrome", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) {
            console.clear();
            console.log("✅ صغر الخط واعمل سكان للـ QR:");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") console.log("✅ البوت شغال (الضحك مسموح) يا أنس!");
    });

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid.endsWith('@g.us')) return;

        const sender = msg.key.participant || msg.key.remoteJid;
        const messageType = Object.keys(msg.message)[0];
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();

        // حصانة المطور
        const sudoNumber = "201556853817@s.whatsapp.net"; 
        if (sender === sudoNumber) return;

        async function handleViolation(reason) {
            await sock.sendMessage(remoteJid, { delete: msg.key });
            if (!warnings[sender]) warnings[sender] = 0;
            warnings[sender]++;

            if (warnings[sender] >= 3) {
                await sock.sendMessage(remoteJid, { text: `🚫 @${sender.split('@')[0]} ده التحذير الثالث بسبب (${reason}).. تم الطرد!`, mentions: [sender] });
                await sock.groupParticipantsUpdate(remoteJid, [sender], "remove");
                warnings[sender] = 0; 
            } else {
                await sock.sendMessage(remoteJid, { 
                    text: `⚠️ يا @${sender.split('@')[0]} ممنوع (${reason}).\nالتحذير رقم (${warnings[sender]}/3).`, 
                    mentions: [sender] 
                });
            }
        }

        // --- استثناء الضحك (عشان هههههه متتحسبش مخالفة) ---
        const isLaughing = /^(ه)+$/i.test(text) || text.includes("هههه");
        
        // 1. فحص تكرار الحروف (بشرط ميكونش ضحك)
        const longCharRegex = /(.)\1{3,}/; 
        if (longCharRegex.test(text) && !isLaughing) {
            return await handleViolation("تكرار الحروف 4 مرات فأكثر");
        }

        // 2. فحص الشتائم
        if (badWords.some(word => text.includes(word))) {
            return await handleViolation("السب والقذف");
        }

        // 3. فحص الروابط
        if (/(https?:\/\/[^\s]+)/g.test(text)) {
            return await handleViolation("إرسال روابط");
        }

        // 4. فحص الميديا
        const forbiddenTypes = ['imageMessage', 'videoMessage', 'stickerMessage'];
        if (forbiddenTypes.includes(messageType)) {
            return await handleViolation("إرسال ميديا ممنوعة");
        }
    });
}

startAnasBot().catch(err => console.log("خطأ: " + err));

