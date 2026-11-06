import multer from 'multer';

/** الملف في الذاكرة (أقصى 5MB، ملف واحد، من غير حقول نصية) ثم بيتعالج بـ sharp */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
});

export const uploadSingleImage = upload.single('image');