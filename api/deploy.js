import formidable from 'formidable';
import axios from 'axios';
import fs from 'fs';

// Nonaktifkan body parser bawaan Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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

    // Validasi nama website
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
    const teamId = process.env.VERCEL_TEAM_ID || null;

    if (!vercelToken || !projectId) {
      console.error('Konfigurasi Hilang: VERCEL_TOKEN atau VERCEL_PROJECT_ID tidak diatur.');
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server tidak lengkap. Pastikan VERCEL_TOKEN dan VERCEL_PROJECT_ID sudah diatur dengan benar.'
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

    // PERBAIKAN: Buat payload deployment yang BENAR
    // Kita TIDAK menggunakan 'name' di sini agar tidak bentrok dengan 'project'
    const deploymentPayload = {
      files: filesToUpload,
      project: projectId, // Target ke proyek host yang sudah ada
      target: 'production' // Gunakan 'production' agar URL lebih stabil
    };

    // Jika menggunakan tim, tambahkan teamId
    if (teamId) {
      deploymentPayload.teamId = teamId;
    }

    console.log('Mengirim permintaan deployment ke Vercel...');

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
    console.log('Deployment dibuat, ID:', deployment.id);

    let attempts = 0;
    const maxAttempts = 30;

    // Polling status deployment
    while (deployment.readyState !== 'READY' && deployment.readyState !== 'ERROR' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
        console.log(`Status deployment: ${deployment.readyState} (Percobaan ${attempts + 1})`);
      } catch (statusError) {
        // Log error spesifik dari API Vercel
        const apiError = statusError.response?.data;
        console.error('Error saat mengecek status:', apiError || statusError.message);
      }
      
      attempts++;
    }

    // Hapus file sementara
    fs.unlinkSync(htmlFile.filepath);

    // Cek hasil akhir deployment
    if (deployment.readyState === 'ERROR') {
      // Ambil pesan error yang lebih spesifik jika ada
      const errorMessage = deployment.errorMessage || deployment.error?.message || 'Kesalahan tidak diketahui.';
      return res.status(500).json({
        success: false,
        message: `Deployment gagal: ${errorMessage}`
      });
    }

    if (deployment.readyState !== 'READY') {
      return res.status(500).json({
        success: false,
        message: 'Deployment timeout. Proses di Vercel terlalu lama.'
      });
    }

    // Deployment berhasil
    console.log('Deployment berhasil, URL:', deployment.url);
    res.json({
      success: true,
      url: deployment.url
    });

  } catch (error) {
    console.error('ERROR KESALAHAN UTAMA:', error.response?.data || error.message);
    
    // Hapus file sementara jika ada
    if (req.files?.htmlFile?.[0]?.filepath) {
      try {
        fs.unlinkSync(req.files.htmlFile[0].filepath);
      } catch (cleanupError) {
        console.error('Error menghapus file sementara:', cleanupError.message);
      }
    }

    // Kirim error yang sangat spesifik dari API Vercel
    const apiError = error.response?.data?.error?.message;
    const finalMessage = apiError || error.message || 'Terjadi kesalahan internal server.';
    
    res.status(500).json({
      success: false,
      message: `Terjadi kesalahan: ${finalMessage}`
    });
  }
}
