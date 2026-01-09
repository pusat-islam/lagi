import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID || null;

  if (!vercelToken) {
    return res.json({ success: false, message: 'Environment Variable VERCEL_TOKEN tidak diatur.' });
  }
  if (!projectId) {
    return res.json({ success: false, message: 'Environment Variable VERCEL_PROJECT_ID tidak diatur.' });
  }

  try {
    // Coba akses informasi proyek untuk memvalidasi token dan project ID
    const projectUrl = teamId 
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`;

    const response = await axios.get(projectUrl, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`
      }
    });

    // Jika berhasil, berarti konfigurasi benar
    res.json({ 
      success: true, 
      message: 'Konfigurasi Vercel valid!',
      projectName: response.data.name
    });

  } catch (error) {
    let errorMessage = 'Konfigurasi Vercel tidak valid.';
    if (error.response) {
      if (error.response.status === 403 || error.response.status === 401) {
        errorMessage = 'VERCEL_TOKEN tidak valid atau tidak memiliki izin yang cukup (butuh izin "Manage Projects").';
      } else if (error.response.status === 404) {
        errorMessage = 'VERCEL_PROJECT_ID tidak ditemukan. Pastikan Anda menyalin ID yang benar (dimulai dengan "prj_").';
      } else {
        errorMessage = `Kesalahan dari Vercel: ${error.response.data?.message || 'Status ' + error.response.status}`;
      }
    }
    res.json({ success: false, message: errorMessage });
  }
}
