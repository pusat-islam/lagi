import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metode tidak diizinkan' });
  }

  const vercelToken = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelToken) {
    return res.json({ 
      success: false, 
      message: 'Environment Variable VERCEL_TOKEN tidak ditemukan. Pastikan sudah ditambahkan di dashboard Vercel dan proyek sudah di-redeploy.' 
    });
  }
  if (!projectId) {
    return res.json({ 
      success: false, 
      message: 'Environment Variable VERCEL_PROJECT_ID tidak ditemukan. Pastikan sudah ditambahkan di dashboard Vercel dan proyek sudah di-redeploy.' 
    });
  }

  // Langkah 1: Validasi token itu sendiri
  try {
    await axios.get('https://api.vercel.com/v4/user', {
      headers: { 'Authorization': `Bearer ${vercelToken}` }
    });
  } catch (tokenError) {
    let tokenErrorMessage = 'VERCEL_TOKEN tidak valid.';
    if (tokenError.response?.status === 401) {
      // Error 401 berarti token salah atau tidak ada
      tokenErrorMessage = 'VERCEL_TOKEN tidak valid atau salah ketik. Periksa kembali token yang Anda salin ke Environment Variables.';
    } else if (tokenError.response?.status === 403) {
      // Error 403 berarti token valid tapi tidak punya izin
      tokenErrorMessage = 'VERCEL_TOKEN valid tetapi tidak memiliki izin (scope) yang cukup. Saat membuat token, Anda WAJIB mencentang "Create Deployments" DAN "Manage Projects".';
    }
    return res.json({ success: false, message: tokenErrorMessage });
  }

  // Langkah 2: Validasi Project ID (jika token valid)
  try {
    const projectResponse = await axios.get(`https://api.vercel.com/v9/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${vercelToken}` }
    });
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
}
