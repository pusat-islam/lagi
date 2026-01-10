import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  // Periksa apakah variabel ada di environment
  if (!vercelToken) {
    return res.json({ 
      success: false, 
      message: 'Environment Variable VERCEL_TOKEN tidak ditemukan di server. Pastikan sudah ditambahkan di dashboard Vercel (Settings > Environment Variables) dan proyek sudah di-redeploy.' 
    });
  }
  if (!projectId) {
    return res.json({ 
      success: false, 
      message: 'Environment Variable VERCEL_PROJECT_ID tidak ditemukan di server. Pastikan sudah ditambahkan di dashboard Vercel (Settings > Environment Variables) dan proyek sudah di-redeploy.' 
    });
  }

  // Coba lakukan panggilan API sungguhan untuk memvalidasi token
  try {
    const response = await axios.get('https://api.vercel.com/v4/user', {
      headers: {
        'Authorization': `Bearer ${vercelToken}`
      }
    });

    // Token valid, sekarang cek project ID
    try {
      const projectResponse = await axios.get(`https://api.vercel.com/v9/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${vercelToken}`
        }
      });

      // Semua valid!
      return res.json({ 
        success: true, 
        message: 'Konfigurasi Vercel sempurna!',
        projectName: projectResponse.data.name
      });

    } catch (projectError) {
      let projectErrorMessage = 'VERCEL_PROJECT_ID tidak valid.';
      if (projectError.response?.status === 404) {
        projectErrorMessage = `VERCEL_PROJECT_ID tidak ditemukan. Pastikan Anda menyalin ID yang benar (dimulai dengan "prj_"). ID yang Anda gunakan: ${projectId}`;
      } else {
        projectErrorMessage = `Kesalahan saat memeriksa Project ID: ${projectError.response?.data?.message || projectError.message}`;
      }
      return res.json({ success: false, message: projectErrorMessage });
    }

  } catch (tokenError) {
    let tokenErrorMessage = 'VERCEL_TOKEN tidak valid.';
    if (tokenError.response?.status === 401 || tokenError.response?.status === 403) {
      tokenErrorMessage = 'VERCEL_TOKEN tidak valid atau kadaluarsa. Buat token baru di Vercel Dashboard > Account > Tokens dengan izin "Create Deployments" dan "Manage Projects".';
    }
    return res.json({ success: false, message: tokenErrorMessage });
  }
}
