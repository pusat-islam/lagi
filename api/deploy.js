const formidable = require('formidable');
const axios = require('axios');
const fs = require('fs');

// Nonaktifkan body parser bawaan Vercel untuk bisa menangani multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  try {
    // Parsing data form dengan formidable
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const websiteName = fields.websiteName?.[0];
    const htmlFile = files.htmlFile?.[0];

    // Validasi input
    if (!websiteName || !htmlFile) {
      return res.status(400).json({
        success: false,
        message: 'Nama website dan file HTML diperlukan.'
      });
    }

    // Validasi nama website (hanya huruf kecil, angka, dan hyphen)
    if (!/^[a-z0-9-]+$/.test(websiteName)) {
      return res.status(400).json({
        success: false,
        message: 'Nama website hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).'
      });
    }

    // Validasi tipe file
    if (!htmlFile.originalFilename?.match(/\.(html|htm)$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Hanya file .html atau .htm yang diperbolehkan.'
      });
    }

    // Dapatkan kredensial dari environment variables
    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID || null; // Opsional, jika menggunakan tim

    if (!vercelToken || !projectId) {
      console.error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server tidak lengkap. Hubungi administrator.'
      });
    }

    // Baca file HTML
    const fileContent = fs.readFileSync(htmlFile.filepath);

    // Siapkan file untuk di-upload ke Vercel
    const filesToUpload = [
      {
        file: 'index.html',
        data: fileContent.toString('base64'),
        encoding: 'base64'
      }
    ];

    // Buat deployment ke proyek yang sudah ada
    const deploymentPayload = {
      name: websiteName, // Nama deployment, bukan nama proyek
      files: filesToUpload,
      project: projectId, // Target ke proyek yang sudah ada
      target: 'production' // Bisa 'production' atau 'preview'
    };

    // Jika menggunakan tim, tambahkan teamId
    if (teamId) {
      deploymentPayload.teamId = teamId;
    }

    // Kirim request ke API Vercel
    const deploymentResponse = await axios.post(
      'https://api.vercel.com/v13/deployments',
      deploymentPayload,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let deployment = deploymentResponse.data;
    let attempts = 0;
    const maxAttempts = 30; // Maksimal 60 detik (30 * 2 detik)

    // Polling status deployment hingga selesai atau timeout
    while (deployment.readyState !== 'READY' && deployment.readyState !== 'ERROR' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik
      
      try {
        const statusResponse = await axios.get(
          `https://api.vercel.com/v13/deployments/${deployment.id}`,
          {
            headers: {
              'Authorization': `Bearer ${vercelToken}`
            }
          }
        );
        deployment = statusResponse.data;
      } catch (statusError) {
        console.error('Error checking deployment status:', statusError.response?.data || statusError.message);
        // Lanjutkan, mungkin hanya error sementara
      }
      
      attempts++;
    }

    // Hapus file sementara
    fs.unlinkSync(htmlFile.filepath);

    // Cek hasil akhir deployment
    if (deployment.readyState === 'ERROR') {
      return res.status(500).json({
        success: false,
        message: `Deployment gagal: ${deployment.errorMessage || 'Kesalahan tidak diketahui.'}`
      });
    }

    if (deployment.readyState !== 'READY') {
      return res.status(500).json({
        success: false,
        message: 'Deployment timeout. Proses terlalu lama.'
      });
    }

    // Deployment berhasil
    res.json({
      success: true,
      url: deployment.url // URL unik dari deployment ini
    });

  } catch (error) {
    console.error('Error during deployment process:', error.response?.data || error.message);
    
    // Hapus file sementara jika ada
    if (req.files?.htmlFile?.[0]?.filepath) {
      try {
        fs.unlinkSync(req.files.htmlFile[0].filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError.message);
      }
    }

    // Kirim error yang lebih spesifik jika ada
    const errorMessage = error.response?.data?.error?.message || error.message || 'Terjadi kesalahan internal server.';
    
    res.status(500).json({
      success: false,
      message: `Terjadi kesalahan: ${errorMessage}`
    });
  }
};