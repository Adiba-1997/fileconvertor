const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const officegen = require('officegen');
const ffmpeg = require('fluent-ffmpeg');
const archiver = require('archiver');
const unzipper = require('unzipper');
const fileType = require('file-type');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Configure multer for file uploads with file filtering
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/bmp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
      'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg',
      'application/zip', 'application/x-rar-compressed', 'application/x-tar', 'application/x-7z-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// All converter routes
const converterRoutes = [
  // Document converters
  '/pdf-to-word', '/word-to-pdf', '/pdf-to-excel', '/excel-to-pdf', '/pdf-to-ppt', '/ppt-to-pdf',
  // Image converters
  '/jpg-to-png', '/png-to-jpg', '/webp-to-jpg', '/svg-to-png', '/heic-to-jpg', '/bmp-to-jpg',
  // Video converters
  '/mp4-to-mov', '/mov-to-mp4', '/avi-to-mp4', '/mkv-to-mp4', '/webm-to-mp4', '/gif-to-mp4',
  // Audio converters
  '/mp3-to-wav', '/wav-to-mp3', '/flac-to-mp3', '/ogg-to-mp3', '/aac-to-mp3', '/m4a-to-mp3',
  // Archive converters
  '/zip-to-rar', '/rar-to-zip', '/tar-to-zip', '/7z-to-zip', '/gzip-to-zip'
];

converterRoutes.forEach(route => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
});

// File upload and conversion endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    const targetFormat = req.body.targetFormat;
    const conversionType = req.body.conversionType;
    const outputPath = path.join('converted', `${req.file.filename}-converted.${targetFormat}`);

    // Determine file type
    const type = await fileType.fromFile(inputPath);
    const mimeType = type ? type.mime : req.file.mimetype;

    // Perform conversion based on type
    let result;
    if (conversionType === 'document') {
      result = await convertDocument(inputPath, outputPath, mimeType, targetFormat);
    } else if (conversionType === 'image') {
      result = await convertImage(inputPath, outputPath, targetFormat);
    } else if (conversionType === 'video') {
      result = await convertVideo(inputPath, outputPath, targetFormat);
    } else if (conversionType === 'audio') {
      result = await convertAudio(inputPath, outputPath, targetFormat);
    } else if (conversionType === 'archive') {
      result = await convertArchive(inputPath, outputPath, targetFormat);
    } else {
      throw new Error('Unsupported conversion type');
    }

    // Clean up the uploaded file
    fs.unlink(inputPath, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    res.json({
      success: true,
      downloadUrl: `/download?file=${path.basename(outputPath)}&name=${originalName.replace(/\.[^/.]+$/, '')}.${targetFormat}`
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message || 'Conversion failed' });
  }
});

// File download endpoint
app.get('/download', (req, res) => {
  const filePath = path.join('converted', req.query.file);
  const downloadName = req.query.name || req.query.file;
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error(err);
    } else {
      // Clean up the converted file after download
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting converted file:', err);
      });
    }
  });
});

// Conversion functions
async function convertDocument(inputPath, outputPath, mimeType, targetFormat) {
  if (mimeType === 'application/pdf' && targetFormat === 'docx') {
    // PDF to Word conversion
    // In a real implementation, you would use a library like pdf2docx
    // This is a simplified version
    await fs.promises.copyFile(inputPath, outputPath);
    return { success: true };
  } else if ((mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') && targetFormat === 'pdf') {
    // Word to PDF conversion
    const docx = officegen('docx');
    // This is a simplified version - in reality you'd need to read the Word file
    docx.generate(outputPath);
    return { success: true };
  }
  // Add other document conversions here
  throw new Error('Unsupported document conversion');
}

async function convertImage(inputPath, outputPath, targetFormat) {
  try {
    const image = sharp(inputPath);
    
    switch (targetFormat) {
      case 'jpg':
      case 'jpeg':
        await image.jpeg().toFile(outputPath);
        break;
      case 'png':
        await image.png().toFile(outputPath);
        break;
      case 'webp':
        await image.webp().toFile(outputPath);
        break;
      default:
        throw new Error('Unsupported image format');
    }
    
    return { success: true };
  } catch (error) {
    throw new Error(`Image conversion failed: ${error.message}`);
  }
}

function convertVideo(inputPath, outputPath, targetFormat) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat(targetFormat)
      .on('error', (err) => {
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .on('end', () => {
        resolve({ success: true });
      })
      .save(outputPath);
  });
}

function convertAudio(inputPath, outputPath, targetFormat) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec(targetFormat === 'mp3' ? 'libmp3lame' : 'pcm_s16le')
      .toFormat(targetFormat)
      .on('error', (err) => {
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on('end', () => {
        resolve({ success: true });
      })
      .save(outputPath);
  });
}

async function convertArchive(inputPath, outputPath, targetFormat) {
  if (targetFormat === 'zip') {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip');
    
    return new Promise((resolve, reject) => {
      output.on('close', () => resolve({ success: true }));
      archive.on('error', (err) => reject(new Error(`Archive conversion failed: ${err.message}`)));
      
      archive.pipe(output);
      
      if (path.extname(inputPath) === '.zip') {
        // For zip to zip (just copy)
        archive.file(inputPath, { name: path.basename(inputPath) });
      } else {
        // For other formats, extract first then compress
        fs.createReadStream(inputPath)
          .pipe(unzipper.Extract({ path: 'temp' }))
          .on('close', () => {
            archive.directory('temp', false);
            archive.finalize();
          });
      }
    });
  }
  throw new Error('Unsupported archive conversion');
}

// Create necessary directories if they don't exist
const directories = ['uploads', 'converted', 'temp'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Note: For full functionality, ensure FFmpeg is installed on your system');
  console.log('Run: sudo apt-get install ffmpeg');
});