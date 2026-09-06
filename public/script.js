// Core State Management
const state = {
    seed: '#6366f1',
    harmonies: [],
    theme: localStorage.getItem('theme') || 'dark'
};

document.documentElement.setAttribute('data-theme', state.theme);

// Theme Toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    document.querySelector('#theme-toggle i').className = state.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
});

// Color Math Utilities (HEX <-> HSL <-> RGB)
function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#',''), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

function hexToHsl(hex) {
    let { r, g, b } = hexToRgb(hex);
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
    
    return rgbToHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

// WCAG Contrast Calculation
function getLuminance(hex) {
    let { r, g, b } = hexToRgb(hex);
    let a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
    let lum1 = getLuminance(hex1);
    let lum2 = getLuminance(hex2);
    let brightest = Math.max(lum1, lum2);
    let darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

// Generate Harmonies
function generatePalettes() {
    let seedHex = document.getElementById('seed-hex').value;
    if (!/^#[0-9A-F]{6}$/i.test(seedHex)) return;
    state.seed = seedHex;
    
    let { h, s, l } = hexToHsl(seedHex);
    
    // Mathematical Harmony Offsets
    let harmonyHues = [
        h,                                      // Base
        (h + 30) % 360,                         // Analogous
        (h + 180) % 360,                        // Complementary
        (h + 120) % 360,                        // Triadic 1
        (h + 240) % 360                         // Triadic 2
    ];

    state.harmonies = harmonyHues.map(hue => hslToHex(hue, s, l));
    renderSwatches();
    updateExportSnippet();
}

function renderSwatches() {
    let container = document.getElementById('swatch-container');
    container.innerHTML = '';
    
    state.harmonies.forEach((hex, index) => {
        let card = document.createElement('div');
        card.className = 'swatch-card';
        card.style.backgroundColor = hex;
        
        let textColor = getLuminance(hex) > 0.5 ? '#000000' : '#ffffff';
        card.style.color = textColor;
        
        card.innerHTML = `
            <span style="font-weight: 600; font-size: 0.9rem;">Swatch 0${index + 1}</span>
            <span style="font-family: monospace; font-size: 0.8rem;">${hex.toUpperCase()}</span>
        `;
        
        card.addEventListener('click', () => {
            navigator.clipboard.writeText(hex);
            alert(`Copied ${hex} to clipboard!`);
            updateContrastMatrix(hex);
        });
        
        container.appendChild(card);
    });
}

function updateContrastMatrix(hex) {
    let contrastWithWhite = getContrastRatio(hex, '#ffffff').toFixed(2);
    let contrastWithBlack = getContrastRatio(hex, '#000000').toFixed(2);
    
    document.getElementById('contrast-matrix').innerHTML = `
        <p><strong>Selected:</strong> <span style="color:${hex}; font-family:monospace;">${hex}</span></p>
        <p>Contrast vs White (#FFFFFF): <strong>${contrastWithWhite}:1</strong> (${contrastWithWhite >= 4.5 ? 'WCAG AA Pass' : 'Fail'})</p>
        <p>Contrast vs Black (#000000): <strong>${contrastWithBlack}:1</strong> (${contrastWithBlack >= 4.5 ? 'WCAG AA Pass' : 'Fail'})</p>
    `;
}

function updateExportSnippet() {
    let cssVars = state.harmonies.map((hex, i) => `  --color-scale-${(i+1)*100}: ${hex};`).join('\n');
    let snippet = `:root {\n${cssVars}\n}`;
    document.getElementById('export-code').textContent = snippet;
}

function copyExportCode() {
    let code = document.getElementById('export-code').textContent;
    navigator.clipboard.writeText(code);
    alert('CSS variables copied to clipboard!');
}

// Canvas Image Color Extractor
document.getElementById('image-upload').addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (!file) return;
    
    let reader = new FileReader();
    reader.onload = function(event) {
        let img = new Image();
        img.onload = function() {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            canvas.width = 100;
            canvas.height = 100;
            ctx.drawImage(img, 0, 0, 100, 100);
            
            let imgData = ctx.getImageData(0, 0, 100, 100).data;
            let colors = [];
            // Simple sampling quantizer
            for (let i = 0; i < imgData.length; i += 4 * 50) {
                colors.push(rgbToHex(imgData[i], imgData[i+1], imgData[i+2]));
            }
            
            // Pick first unique 5
            let uniqueColors = [...new Set(colors)].slice(0, 5);
            state.harmonies = uniqueColors;
            renderSwatches();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// Event Listeners for Seed Picker
document.getElementById('seed-picker').addEventListener('input', (e) => {
    document.getElementById('seed-hex').value = e.target.value;
    generatePalettes();
});

document.getElementById('seed-hex').addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('seed-picker').value = e.target.value;
        generatePalettes();
    }
});

document.getElementById('generate-btn').addEventListener('click', generatePalettes);

// Initial Load
generatePalettes();

function openCheckout() {
    alert('Redirecting to secure Stripe Checkout for Chromatic Pro ($1.99/mo)...');
}