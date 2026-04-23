const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// 1. إعدادات المشغل (Puppeteer) - معدلة خصيصاً للسيرفرات (Railway/Heroku)
const client = new Client({
    authStrategy: new LocalAuth(), 
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

// 2. طلب كود الربط (Pairing Code) للرقم الخاص بك
client.on('qr', async (qr) => {
    // عرض الـ QR في الكونسول كاحتياطي
    qrcode.generate(qr, {small: true});
    
    console.log('--- جاري طلب كود الربط للهاتف ---');
    try {
        // الرقم اللي في الصورة: 263785728093
        let pairingCode = await client.getPairingCode('263785728093'); 
        console.log('************************************');
        console.log('كود الربط الخاص بك هو: ', pairingCode);
        console.log('ادخل الكود في واتساب > الأجهزة المرتبطة');
        console.log('************************************');
    } catch (err) {
        console.error('خطأ في توليد كود الربط: ', err);
    }
});

client.on('ready', () => {
    console.log('✅ البوت جاهز وشغال الآن على الرقم!');
});

// 3. نظام الحماية (طرد الصور، الاستيكرات، الريكوردات، والسب)
const badWords = ['يا حمار', 'يا كلب', 'شتم1', 'سب..']; // ضيف كلماتك هنا

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    if (chat.isGroup) {
        // تحديد أنواع الرسائل الممنوعة
        const isMedia = msg.hasMedia; // صور، فيديوهات، ملفات
        const isSticker = msg.type === 'sticker';
        const isVoice = msg.type === 'audio' || msg.type === 'ptt';
        const containsBadWords = badWords.some(word => msg.body.includes(word));

        if (isMedia || isSticker || isVoice || containsBadWords) {
            try {
                // مسح الرسالة
                await msg.delete(true);

                // إرسال رسالة الطرد
                await chat.sendMessage(`🚫 تم طرد @${contact.id.user} لمخالفة القوانين (ممنوع الصور/الاستيكر/السب).`, {
                    mentions: [contact]
                });

                // تنفيذ الطرد
                await chat.removeParticipants([contact.id._serialized]);
                console.log(`تم طرد المخالف: ${contact.id.user}`);
            } catch (e) {
                console.log('خطأ: البوت محتاج يكون "أدمن" عشان يطرد الناس.');
            }
        }
    }
});

// تشغيل البوت
client.initialize();
