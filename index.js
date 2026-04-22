const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require('fs');

const warnings = {}; 
const badWords = ["خول", "عرص", "منيك", "شرموط", "كسمك", "خوال"]; 

async function startAnasBot() {
    // تنظيف أي جلسة قديمة عشان الـ QR يظهر جديد وما يعلقش
    if (fs.existsSync('anas_auth')) {
        fs.rmSync('anas_auth', { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('anas_auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true, // تفعيل ظهور الـ QR Code في الـ Logs
        browser: ["Anas Guard", "Safari", "1.0.0"] 
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;
        if (qr) {
            console.clear();
            console.log("✅ صغر شاشة المتصفح (Zoom Out) واعمل سكان للـ QR:");
            qrcode.generate(qr, { small: true }); // إظهار الـ QR بحجم صغير لسهولة المسح
        }
        if (connection === "open") console.log("✅ البوت شغال يا أنس.. الجروب في أمان!");
    });

    // --- ميزة الصلاة على النبي (تلقائي كل 3 ساعات) ---
    setInterval(async () => {
        try {
            const groups = Object.keys(await sock.groupFetchAllParticipating());
            for (let gid of groups) {
                await sock.sendMessage(gid, { text: "✨ ذكرى اليوم: صَلُّوا عَلَىٰ رَسُولِ اللَّهِ ﷺ" });
            }
        } catch (e) { console.log("خطأ في إرسال الذكرى") }
    }, 1000 * 60 * 60 * 3);

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const messageType = Object.keys(msg.message)[0];
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").toLowerCase();

        // رقم المطور (أنت) له حصانة كاملة
        const sudoNumber = "201556853817@s.whatsapp.net"; 
        if (sender === sudoNumber) return;

        // ميزة عمل ستيكر (ابعت صورة واكتب تحتها ستيكر)
        if (messageType === 'imageMessage' && text.includes("ستيكر")) {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            return await sock.sendMessage(remoteJid, { sticker: buffer }, { quoted: msg });
        }

        if (!remoteJid.endsWith('@g.us')) return;

        // نظام الحماية (حذف + تحذير + طرد)
        async function handleViolation(reason) {
            await sock.sendMessage(remoteJid, { delete: msg.key });
            if (!warnings[sender]) warnings[sender] = 0;
            warnings[sender]++;

            if (warnings[sender] >= 3) {
                await sock.sendMessage(remoteJid, { text: `🚫 تم طردك يا @${sender.split('@')[0]} بسبب ${reason} (تجاوزت 3 تحذيرات).`, mentions: [sender] });
                await sock.groupParticipantsUpdate(remoteJid, [sender], "remove");
                warnings[sender] = 0; 
            } else {
                await sock.sendMessage(remoteJid, { text: `⚠️ ممنوع ${reason} يا @${sender.split('@')[0]} (تحذير ${warnings[sender]}/3).`, mentions: [sender] });
            }
        }

        // فحص الشتائم والروابط
        if (badWords.some(word => text.includes(word))) return await handleViolation("السب والقذف");
        if (/(https?:\/\/[^\s]+)/g.test(text)) return await handleViolation("نشر الروابط");
    });
}

startAnasBot().catch(err => console.log("خطأ: " + err));
