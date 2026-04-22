const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");

const warnings = {}; 
const badWords = ["خول", "عرص", "منيك", "شرموط", "كسمك", "خوال"]; 

async function startAnasBot() {
    const { state, saveCreds } = await useMultiFileAuthState('anas_auth');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // لغينا الـ QR عشان يبعت كود رقمي
        browser: ["Anas Guard", "Chrome", "1.0.0"]
    });

    // --- ميزة الكود الرقمي (Pairing Code) ---
    if (!sock.authState.creds.registered) {
        const myNumber = "263785728093"; // رقمك اللي هيشغل البوت
        await delay(5000);
        const code = await sock.requestPairingCode(myNumber);
        console.log(`\n\n----------------------------\nكود الربط بتاعك هو: ${code}\n----------------------------\n\n`);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection } = update;
        if (connection === "open") console.log("✅ البوت شغال يا بطل.. الجروب في أمان دلوقتي!");
    });

    // --- ميزة الصلاة على النبي (تلقائي كل فترة) ---
    setInterval(async () => {
        const groups = Object.keys(await sock.groupFetchAllParticipating());
        for (let gid of groups) {
            await sock.sendMessage(gid, { text: "✨ ذكرى اليوم: صَلُّوا عَلَىٰ رَسُولِ اللَّهِ ﷺ" });
        }
    }, 1000 * 60 * 60 * 3); // هيبعت كل 3 ساعات تلقائياً في كل الجروبات

    sock.ev.on("messages.upsert", async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const messageType = Object.keys(msg.message)[0];
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "").toLowerCase();

        // حصانة المطور (أنت)
        const sudoNumber = "201556853817@s.whatsapp.net"; 
        if (sender === sudoNumber) return;

        // وظيفة التعامل مع المخالفات (حذف + تحذير + طرد)
        async function handleViolation(reason) {
            if (!remoteJid.endsWith('@g.us')) return; 
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

        // 1. ميزة الاستيكر (لو حد بعت صورة وكتب تحتها "ستيكر")
        if (messageType === 'imageMessage' && text.includes("ستيكر")) {
            const { downloadMediaMessage } = require('@whiskeysockets/baileys');
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            return await sock.sendMessage(remoteJid, { sticker: buffer }, { quoted: msg });
        }

        if (!remoteJid.endsWith('@g.us')) return;

        // 2. فحص الشتائم (اللي في القائمة بتاعتك)
        if (badWords.some(word => text.includes(word))) {
            return await handleViolation("السب والقذف");
        }

        // 3. فحص الروابط
        if (/(https?:\/\/[^\s]+)/g.test(text)) {
            return await handleViolation("إرسال روابط");
        }

        // 4. فحص تكرار الحروف (تعديل للضحك)
        const isLaughing = /^(ه)+$/i.test(text) || text.includes("هههه");
        if (/(.)\1{4,}/.test(text) && !isLaughing) {
            return await handleViolation("التكرار المزعج");
        }
    });
}

startAnasBot().catch(err => console.log("خطأ: " + err));
