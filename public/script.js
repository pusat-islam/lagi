document.addEventListener('DOMContentLoaded', function() {
    // ... (kode untuk bintang-bintang tetap sama di bagian awal) ...
    const nightSky = document.getElementById('nightSky');
    const starCount = 200;
    const shootingStarCount = 3;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const size = Math.random() * 3 + 1;
        const delay = Math.random() * 3;
        star.style.left = `${left}%`;
        star.style.top = `${top}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        if (Math.random() > 0.7) {
            star.classList.add('bright');
        } else if (Math.random() > 0.4) {
            star.classList.add('medium');
        }
        nightSky.appendChild(star);
    }
    
    for (let i = 0; i < shootingStarCount; i++) {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        const left = Math.random() * 50;
        const top = Math.random() * 50;
        const width = Math.random() * 100 + 50;
        const delay = Math.random() * 10 + 5;
        shootingStar.style.left = `${left}%`;
        shootingStar.style.top = `${top}%`;
        shootingStar.style.width = `${width}px`;
        shootingStar.style.animationDelay = `${delay}s`;
        nightSky.appendChild(shootingStar);
    }

    // Elemen UI
    const deployForm = document.getElementById('deployForm');
    const fileUploadArea = document.getElementById('fileUploadArea');
    const htmlFile = document.getElementById('htmlFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    const deployButton = document.getElementById('deployButton');
    const deploymentStatus = document.getElementById('deploymentStatus');
    const resultCard = document.getElementById('resultCard');
    const urlResult = document.getElementById('urlResult');
    const deploymentUrl = document.getElementById('deploymentUrl');
    const copyUrl = document.getElementById('copyUrl');
    const visitUrl = document.getElementById('visitUrl');
    const notificationToast = document.getElementById('notificationToast');
    const toast = new bootstrap.Toast(notificationToast);
    
    // TAMBAHAN: Elemen untuk pesan error konfigurasi
    const configErrorDiv = document.getElementById('configError');

    // FUNGSI YANG DIPERBAIKI: Periksa konfigurasi saat halaman dimuat
async function checkServerConfig() {
    try {
        const response = await fetch('/api/check-config');
        const data = await response.json();

        if (!data.success) {
            // Tampilkan pesan error YANG SANGAT SPESIFIK dari server
            const configErrorDiv = document.getElementById('configError');
            configErrorDiv.innerHTML = `⚠️ <strong>Kesalahan Konfigurasi Server:</strong> ${data.message}`;
            configErrorDiv.style.display = 'block';
            // Nonaktifkan tombol deploy
            deployButton.disabled = true;
            deployButton.textContent = 'Server Tidak Dikonfigurasi';
        } else {
            console.log('✅ Konfigurasi server valid:', data.message);
            // Sembunyikan div error jika sebelumnya ada
            const configErrorDiv = document.getElementById('configError');
            configErrorDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Gagal memeriksa konfigurasi server:', error);
        const configErrorDiv = document.getElementById('configError');
        configErrorDiv.innerHTML = `⚠️ <strong>Tidak Terhubung ke Server:</strong> Tidak dapat memeriksa konfigurasi. Pastikan web sudah di-deploy dengan benar.`;
        configErrorDiv.style.display = 'block';
        deployButton.disabled = true;
    }
}

// Panggil fungsi pemeriksaan
checkServerConfig();

// ... (sisa kode JavaScript tetap sama) ...
    
    // ... (kode event listener untuk file upload, drag-drop, dll tetap sama) ...
    htmlFile.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            fileName.textContent = file.name;
            fileInfo.style.display = 'block';
        }
    });
    
    removeFile.addEventListener('click', function() {
        htmlFile.value = '';
        fileInfo.style.display = 'none';
    });
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        fileUploadArea.classList.add('dragover');
    }
    
    function unhighlight() {
        fileUploadArea.classList.remove('dragover');
    }
    
    fileUploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            htmlFile.files = files;
            const event = new Event('change', { bubbles: true });
            htmlFile.dispatchEvent(event);
        }
    }
    
    // Form submission
    deployForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const websiteName = document.getElementById('websiteName').value.trim();
        const file = htmlFile.files[0];
        
        if (!websiteName || !file) {
            showNotification('error', 'Error', 'Mohon lengkapi semua field yang diperlukan.');
            return;
        }
        
        if (!/^[a-z0-9-]+$/.test(websiteName)) {
            showNotification('error', 'Error', 'Nama website hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).');
            return;
        }
        
        if (!file.name.match(/\.(html|htm)$/i)) {
            showNotification('error', 'Error', 'Hanya file HTML yang diperbolehkan.');
            return;
        }
        
        startDeployment(websiteName, file);
    });
    
    copyUrl.addEventListener('click', async function() {
        const url = deploymentUrl.value;
        try {
            await navigator.clipboard.writeText(url);
            showNotification('success', 'Berhasil', 'URL telah disalin ke clipboard.');
        } catch (err) {
            deploymentUrl.select();
            document.execCommand('copy');
            showNotification('success', 'Berhasil', 'URL telah disalin ke clipboard.');
        }
    });
    
    function showNotification(type, title, message) {
        const toastIcon = document.getElementById('toastIcon');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        if (type === 'success') {
            toastIcon.className = 'bi bi-check-circle-fill me-2 text-success';
        } else if (type === 'error') {
            toastIcon.className = 'bi bi-exclamation-triangle-fill me-2 text-danger';
        } else {
            toastIcon.className = 'bi bi-info-circle-fill me-2 text-primary';
        }
        
        toast.show();
    }
    
    function startDeployment(websiteName, file) {
        deployButton.disabled = true;
        deployButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mendeploy...';
        deploymentStatus.style.display = 'block';
        resultCard.style.display = 'none';
        
        const progressBar = document.querySelector('.progress-bar');
        progressBar.style.width = '0%';
        
        document.querySelectorAll('.status-step').forEach(step => {
            step.classList.remove('active');
            step.querySelector('i').className = 'bi bi-circle';
        });
        
        const formData = new FormData();
        formData.append('websiteName', websiteName);
        formData.append('htmlFile', file);
        
        fetch('/api/deploy', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `Server error with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // ... (animasi sukses tetap sama) ...
                updateStep(1, true);
                progressBar.style.width = '25%';
                setTimeout(() => { updateStep(2, true); progressBar.style.width = '50%'; }, 500);
                setTimeout(() => { updateStep(3, true); progressBar.style.width = '75%'; }, 1000);
                setTimeout(() => {
                    updateStep(4, true);
                    progressBar.style.width = '100%';
                    showResult(true, 'Deployment Berhasil!', 'Website Anda telah berhasil di-deploy ke Vercel.', data.url);
                }, 1500);
            } else {
                // PERBAIKAN: Tampilkan pesan error yang SANGAT SPESIFIK dari backend
                showResult(false, 'Deployment Gagal', data.message);
            }
            
            deployButton.disabled = false;
            deployButton.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Deploy ke Vercel';
        })
        .catch(error => {
            console.error('Error:', error);
            // PERBAIKAN: Tampilkan pesan error yang SANGAT SPESIFIK dari backend
            showResult(false, 'Deployment Gagal', error.message);
            
            deployButton.disabled = false;
            deployButton.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Deploy ke Vercel';
        });
    }
    
    function updateStep(stepNumber, isActive) {
        const step = document.getElementById(`step${stepNumber}`);
        if (isActive) {
            step.classList.add('active');
            step.querySelector('i').className = 'bi bi-check-circle-fill text-success';
        } else {
            step.classList.remove('active');
            step.querySelector('i').className = 'bi bi-circle';
        }
    }
    
    function showResult(success, title, message, url = null) {
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        
        resultCard.style.display = 'block';
        
        if (success) {
            resultCard.className = 'result-card success';
            resultIcon.className = 'bi bi-check-circle-fill text-success me-2';
            urlResult.style.display = 'flex';
            deploymentUrl.value = url;
            visitUrl.href = url;
        } else {
            resultCard.className = 'result-card error';
            resultIcon.className = 'bi bi-exclamation-triangle-fill text-danger me-2';
            urlResult.style.display = 'none';
        }
        
        resultTitle.textContent = title;
        resultMessage.textContent = message;
    }
});
