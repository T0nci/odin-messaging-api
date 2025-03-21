const multer = require("multer");
const memoryStorage = multer.memoryStorage();
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5242880, // 5 MiB to bytes
  },
  fileFilter: (req, file, cb) => {
    const types = [
      "image/avif",
      "image/jpeg",
      "image/png",
      "image/svg+xml",
      "image/webp",
    ];

    if (!types.includes(file.mimetype)) return cb(null, false);

    cb(null, true);
  },
});

const uploadWithoutError = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err || err instanceof multer.MulterError) return next();

    next(err);
  });
};

module.exports = {
  uploadWithoutError,
};
