document.addEventListener('DOMContentLoaded', function() {
    // Create stars in the night sky
    const nightSky = document.getElementById('nightSky');
    const starCount = 200;
    const shootingStarCount = 3;
    
    // Create regular stars
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        // Random position
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        
        // Random size
        const size = Math.random() * 3 + 1;
        
        // Random animation delay
        const delay = Math.random() * 3;
        
        star.style.left = `${left}%`;
        star.style.top = `${top}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.animationDelay = `${delay}s`;
        
        // Add glow effect to some stars
        if (Math.random() > 0.7) {
            star.classList.add('bright');
        } else if (Math.random() > 0.4) {
            star.classList.add('medium');
        }
        
        nightSky.appendChild(star);
    }
    
    // Create shooting stars
    for (let i = 0; i < shootingStarCount; i++) {
        const shootingStar = document.createElement('div');
        shootingStar.className = 'shooting-star';
        
        // Random position and size
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
    
    // Elements
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
    
    // File upload handling
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
    
    // Drag and drop handling
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
        
        // Validate website name
        if (!/^[a-z0-9-]+$/.test(websiteName)) {
            showNotification('error', 'Error', 'Nama website hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).');
            return;
        }
        
        // Validate file type
        if (!file.name.match(/\.(html|htm)$/i)) {
            showNotification('error', 'Error', 'Hanya file HTML yang diperbolehkan.');
            return;
        }
        
        // Start deployment process
        startDeployment(websiteName, file);
    });
    
    // Copy URL menggunakan modern Clipboard API
    copyUrl.addEventListener('click', async function() {
        const url = deploymentUrl.value;
        try {
            await navigator.clipboard.writeText(url);
            showNotification('success', 'Berhasil', 'URL telah disalin ke clipboard.');
        } catch (err) {
            console.error('Gagal menyalin teks: ', err);
            // Fallback untuk browser lama
            deploymentUrl.select();
            document.execCommand('copy');
            showNotification('success', 'Berhasil', 'URL telah disalin ke clipboard.');
        }
    });
    
    // Show notification
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
    
    // Start deployment process
    function startDeployment(websiteName, file) {
        // Reset UI
        deployButton.disabled = true;
        deployButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mendeploy...';
        deploymentStatus.style.display = 'block';
        resultCard.style.display = 'none';
        
        // Reset progress
        const progressBar = document.querySelector('.progress-bar');
        progressBar.style.width = '0%';
        
        // Reset status steps
        document.querySelectorAll('.status-step').forEach(step => {
            step.classList.remove('active');
            step.querySelector('i').className = 'bi bi-circle';
        });
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('websiteName', websiteName);
        formData.append('htmlFile', file);
        
        // Make API call to serverless function
        fetch('/api/deploy', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                // Coba mendapatkan pesan error dari response
                return response.json().then(err => {
                    throw new Error(err.message || `Server error with status: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            // Update UI based on response
            if (data.success) {
                // Show success steps
                updateStep(1, true);
                progressBar.style.width = '25%';
                
                setTimeout(() => {
                    updateStep(2, true);
                    progressBar.style.width = '50%';
                }, 500);
                
                setTimeout(() => {
                    updateStep(3, true);
                    progressBar.style.width = '75%';
                }, 1000);
                
                setTimeout(() => {
                    updateStep(4, true);
                    progressBar.style.width = '100%';
                    
                    // Show result
                    showResult(true, 'Deployment Berhasil!', 'Website Anda telah berhasil di-deploy ke Vercel.', data.url);
                }, 1500);
            } else {
                showResult(false, 'Deployment Gagal', data.message || 'Terjadi kesalahan saat melakukan deployment.');
            }
            
            // Reset button
            deployButton.disabled = false;
            deployButton.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Deploy ke Vercel';
        })
        .catch(error => {
            console.error('Error:', error);
            showResult(false, 'Deployment Gagal', error.message || 'Terjadi kesalahan saat menghubungi server. Silakan coba lagi.');
            
            // Reset button
            deployButton.disabled = false;
            deployButton.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Deploy ke Vercel';
        });
    }
    
    // Update step status
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
    
    // Show result
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