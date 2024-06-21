const multer = require('multer');
try {
    var uuid = require('uuid/v4');
} catch (error) {
    var { v4: uuid } = require('uuid');
}

const MIME_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const fileUpload = multer({
    limits: 500000,   //kilobyte
    storage: multer.diskStorage({
        destination: (req,file,cb) => {
            cb(null, 'uploads/images');
        },
        filename: (req,file,cb) => {
            const ext = MIME_TYPE_MAP[file.mimetype];
            cb(null, uuid() + '.' + ext);
        }
    }),
    fileFilter: (req, file, cb) => {
        const isValid = !!MIME_TYPE_MAP[file.mimetype];
        let error = isValid ? null : new Error('Invalid Mime Type!');
        cb(error, isValid);
    }
});

module.exports = fileUpload;