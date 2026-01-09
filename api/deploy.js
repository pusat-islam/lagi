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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const websiteName = fields.websiteName?.[0];
    const htmlFile = files.htmlFile?.[0];

    // Validasi input dasar
    if (!websiteName || !htmlFile) {
      return res.status(400).json({
        success: false,
        message: 'Nama website dan file HTML diperlukan.'
      });
    }
    if (!/^[a-z0-9-]+$/.test(websiteName)) {
      return res.status(400).json({
        success: false,
        message: 'Nama website hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).'
      });
    }
    if (!htmlFile.originalFilename?.match(/\.(html|htm)$/i)) {
      return res.status(400).json({
        success: false,
        message: 'Hanya file .html atau .htm yang diperbolehkan.'
      });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID || null;

    if (!vercelToken || !projectId) {
      return res.status(500).json({
        success: false,
        message: 'Konfigurasi server tidak lengkap. Pastikan VERCEL_TOKEN dan VERCEL_PROJECT_ID sudah diatur di Environment Variables Vercel.'
      });
    }

    const fileContent = fs.readFileSync(htmlFile.filepath);
    const filesToUpload = [
      {
        file: 'index.html',
        data: fileContent.toString('base64'),
        encoding: 'base64'
      }
    ];

    // Payload yang paling sederhana dan stabil
    const deploymentPayload = {
      files: filesToUpload,
      project: projectId,
      target: 'preview' // Gunakan preview untuk menghindari masalah izin
    };

    if (teamId) {
      deploymentPayload.teamId = teamId;
    }

    console.log('Mengirim permintaan deployment ke Vercel...');

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

    // Polling status
    let attempts = 0;
    const maxAttempts = 30;
    while (deployment.readyState !== 'READY' && deployment.readyState !== 'ERROR' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        const statusResponse = await axios.get(
          `https://api.vercel.com/v13/deployments/${deployment.id}`,
          { headers: { 'Authorization': `Bearer ${vercelToken}` } }
        );
        deployment = statusResponse.data;
      } catch (statusError) {
        // Abaikan error sementara saat polling
      }
      attempts++;
    }

    // Hapus file sementara
    fs.unlinkSync(htmlFile.filepath);

    if (deployment.readyState === 'ERROR') {
      const errorMessage = deployment.error?.message || deployment.errorMessage || 'Kesalahan tidak diketahui dari Vercel.';
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

    console.log('Deployment berhasil, URL:', deployment.url);
    res.json({
      success: true,
      url: deployment.url
    });

  } catch (error) {
    console.error('ERROR UTAMA:', error.response?.data || error.message);
    
    // Hapus file sementara jika ada
    if (req.files?.htmlFile?.[0]?.filepath) {
      try { fs.unlinkSync(req.files.htmlFile[0].filepath); } catch (e) {}
    }

    // Kirim error yang sangat jelas dari API Vercel
    let finalMessage = 'Terjadi kesalahan internal server.';
    if (error.response) {
      const apiError = error.response.data?.error?.message || error.response.data?.message;
      if (apiError) {
        finalMessage = `Kesalahan dari Vercel: ${apiError}`;
      } else {
        finalMessage = `Kesalahan dari Vercel (HTTP ${error.response.status}): ${JSON.stringify(error.response.data)}`;
      }
    } else if (error.request) {
      finalMessage = 'Tidak dapat terhubung ke server Vercel. Periksa koneksi internet.';
    } else {
      finalMessage = `Kesalahan tak terduga: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: finalMessage
    });
  }
}
