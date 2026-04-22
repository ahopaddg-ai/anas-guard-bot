const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs');

const warnings = {}; // مخزن التحذيرات
const badWords = ["خول", "عرص", "منيك", "شرموط", "كسمك", "خوال"]; // قائمة الشتايم

async function startAnasBot() {
    // 1. تنظيف أي جلسة قديمة عشان يربط معاك من أول مرة
    if (fs.existsSync('anas_auth')) {
        fs.rmSync('anas_auth', { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState('anas_auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true, 
        browser: ["Anas Guard", "Safari", "1.0.0"]
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        // 2. ميزة الرابط: لو ظهر QR هيطلعلك رابط تفتحه يظهرلك المربع واضح
        if (qr) {
            console.log("\n--- افتح الرابط ده عشان تمسح الـ QR بوضوح ---");
            console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
            console.log("------------------------------------------\n");
        }

        if (connection === "open") {
            console.log("✅ مبروك يا أنس.. البوت ارتبط وشغال حماية دلوقتي!");
        }
    });

    // 3. ميزة الصلاة على النبي (تلقائي كل 3 ساعات)
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

        // حصانة رقمك أنت (المطور)
        const sudoNumber = "201556853817@s.whatsapp.net"; 
        if (sender === sudoNumber) return;

        // 4. ميزة الاستيكر (ابعت صورة واكتب تحتها ستيكر)
        if (messageType === 'imageMessage' && text.includes("ستيكر")) {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            return await sock.sendMessage(remoteJid, { sticker: buffer }, { quoted: msg });
        }

        if (!remoteJid.endsWith('@g.us')) return;

        // وظيفة التعامل مع المخالفات (حذف + تحذير + طرد)
        async function handleViolation(reason) {
            await sock.sendMessage(remoteJid, { delete: msg.key });
            if (!warnings[sender]) warnings[sender] = 0;
            warnings[sender]++;

            if (warnings[sender] >= 3) {
                await sock.sendMessage(remoteJid, { text: `🚫 @${sender.split('@')[0]} تجاوزت 3 تحذيرات بسبب (${reason}).. تم الطرد!`, mentions: [sender] });
                await sock.groupParticipantsUpdate(remoteJid, [sender], "remove");
                warnings[sender] = 0; 
            } else {
                await sock.sendMessage(remoteJid, { 
                    text: `⚠️ يا @${sender.split('@')[0]} ممنوع (${reason}).\nالتحذير رقم (${warnings[sender]}/3).`, 
                    mentions: [sender] 
                });
            }
        }

        // فحص الشتائم
        if (badWords.some(word => text.includes(word))) {
            return await handleViolation("السب والقذف");
        }

        // فحص الروابط
        if (/(https?:\/\/[^\s]+)/g.test(text)) {
            return await handleViolation("إرسال روابط");
        }

        // فحص تكرار الحروف (مع استثناء الضحك)
        const isLaughing = /^(ه)+$/i.test(text) || text.includes("هههه");
        if (/(.)\1{4,}/.test(text) && !isLaughing) {
            return await handleViolation("التكرار المزعج");
        }
    });
}

startAnasBot().catch(err => console.log("خطأ في تشغيل البوت: " + err));
