export default async function handler(req, res) {
    // 1. อนุญาตเฉพาะการส่งข้อมูลแบบ POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed (ต้องเป็น POST เท่านั้น)' });
    }

    try {
        // 2. ดึง API Key จาก Environment Variables ของ Vercel อย่างปลอดภัย
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Server Error: ไม่พบการตั้งค่า GEMINI_API_KEY ในระบบ Vercel" });
        }

        // 3. รับรูปภาพที่หน้าบ้านส่งมาให้
        const { base64Image } = req.body;
        if (!base64Image) {
            return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพที่ส่งมา" });
        }

        // 4. ตั้งค่า Prompt สำหรับเภสัชกร
        const prompt = `Task: Analyze this medication label/document image as an expert clinical pharmacist.
                        Extract ONLY the generic names of the medications.
                        Rules:
                        1. Ignore all numbers, dosages, instructions, and non-medication text.
                        2. Correct any obvious spelling mistakes from OCR.
                        3. Output EXACTLY a raw JSON array of strings containing the generic names in English.
                        Example output: ["Aspirin", "Ibuprofen"]`;

        // 5. เรียกใช้ Gemini 2.5 Flash
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }

        const data = await response.json();
        
        // 6. ส่งผลลัพธ์กลับไปให้หน้าเว็บ
        return res.status(200).json(data);

    } catch (error) {
        console.error("Backend Error:", error);
        return res.status(500).json({ error: error.message });
    }
}