const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// 1. إعدادات البوت
const client = new Client({
    authStrategy: new LocalAuth(), // لحفظ تسجيل الدخول وميخرجش كل شوية
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// 2. تفعيل الربط برقم الهاتف اللي في الصورة
client.on('qr', async (qr) => {
    console.log('جاري طلب كود الربط لرقمك...');
    try {
        // طلب كود الربط المكون من 8 رموز
        let pairingCode = await client.getPairingCode('263785728093'); 
        console.log('-----------------------------------');
        console.log('كود الربط الخاص بك هو: ', pairingCode);
        console.log('افتح الواتساب > الأجهزة المرتبطة > ربط برقم الهاتف ودخل الكود ده');
        console.log('-----------------------------------');
    } catch (err) {
        console.log('خطأ في توليد كود الربط، جرب مرة تانية.');
    }
});

client.on('ready', () => {
    console.log('تم تشغيل البوت بنجاح! هو الآن يراقب الجروبات.');
});

// 3. نظام الطرد التلقائي (المراقب)
const badWords = ['شتم1', 'شتم2', 'سب..']; // ضيف هنا الكلمات اللي عايز تمنعها

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    const contact = await msg.getContact();

    // يشتغل فقط داخل الجروبات
    if (chat.isGroup) {
        
        // أنواع الرسائل الممنوعة (صور، استيكر، ريكورد، فيديو، ملفات)
        const isForbiddenMedia = msg.hasMedia || 
                                 msg.type === 'sticker' || 
                                 msg.type === 'audio' || 
                                 msg.type === 'ptt' || 
                                 msg.type === 'video';

        // فحص الكلمات الخارجة
        const containsBadWords = badWords.some(word => msg.body.toLowerCase().includes(word.toLowerCase()));

        if (isForbiddenMedia || containsBadWords) {
            try {
                // حذف رسالة المخالف
                await msg.delete(true);

                // إرسال تنبيه في الجروب
                await chat.sendMessage(`⚠️ تم طرد @${contact.id.user} بسبب إرسال محتوى ممنوع أو سب.`, {
                    mentions: [contact]
                });

                // طرد الشخص (يجب أن يكون البوت أدمن)
                await chat.removeParticipants([contact.id._serialized]);
                
                console.log(`تم طرد ${contact.pushname} لمخالفته القوانين.`);
            } catch (error) {
                console.log('فشل الطرد: تأكد أن البوت "أدمن" في الجروب.');
            }
        }
    }
});

// تشغيل البوت
client.initialize();
