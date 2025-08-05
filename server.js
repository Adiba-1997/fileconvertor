const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Document converters
app.get('/pdf-to-word', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/word-to-pdf', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Image converters
app.get('/jpg-to-png', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/png-to-jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Video converters
app.get('/mp4-to-mov', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/mov-to-mp4', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Audio converters
app.get('/mp3-to-wav', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/wav-to-mp3', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Archive converters
app.get('/zip-to-rar', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/rar-to-zip', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// File upload and conversion endpoint
app.post('/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('converted', `${req.file.filename}-converted.${req.body.targetFormat}`);
    
    // In a real implementation, you would use appropriate libraries to convert files
    // This is just a simulation
    setTimeout(() => {
        // Simulate conversion by copying the file
        fs.copyFile(inputPath, outputPath, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Conversion failed' });
            }
            
            // Clean up the uploaded file
            fs.unlink(inputPath, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
            
            res.json({
                downloadUrl: `/download?file=${path.basename(outputPath)}`
            });
        });
    }, 2000);
});

// File download endpoint
app.get('/download', (req, res) => {
    const filePath = path.join('converted', req.query.file);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }
    
    res.download(filePath, (err) => {
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

// Create necessary directories if they don't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

if (!fs.existsSync('converted')) {
    fs.mkdirSync('converted');
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});