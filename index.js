const admin = require('firebase-admin');
const express = require('express');
const bodyParser = require('body-parser');

// ১. ফায়ারবেস কানেকশন
// মনে রাখবেন: serviceAccount.json ফাইলটি আপনার কোডের সাথেই থাকতে হবে
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bet-baji-vip-default-rtdb.firebaseio.com" // আপনার প্রজেক্ট আইডি অনুযায়ী
});

const db = admin.database();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ২. পেমেন্ট রিসিভ করার এন্ডপয়েন্ট
app.post('/sms-webhook', async (req, res) => {
    const sms = req.body.message || req.body.text; 
    const sender = req.body.from;

    console.log(`পেমেন্ট SMS এসেছে: ${sms}`);

    if (sms && (sms.includes("TrxID") || sms.includes("Transaction ID"))) {
        try {
            // Regex দিয়ে TrxID এবং Amount বের করা
            const trxId = sms.match(/[0-9A-Z]{10}/)[0];
            const amount = sms.match(/Tk ([0-9,.]+)/)[1];

            // ৩. সরাসরি Firebase Realtime Database-এ ডাটা সেভ
            await db.ref('autopayments/' + trxId).set({
                amount: amount,
                sender: sender,
                sms_full: sms,
                status: "Pending", // আপনি চাইলে অটো Success করে দিতে পারেন
                timestamp: Date.now()
            });

            console.log(`ফায়ারবেসে সেভ হয়েছে: TrxID ${trxId}`);
            res.status(200).send("Success");
        } catch (error) {
            console.error("Error parsing SMS:", error);
            res.status(500).send("Error");
        }
    } else {
        res.status(400).send("Not a payment SMS");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
