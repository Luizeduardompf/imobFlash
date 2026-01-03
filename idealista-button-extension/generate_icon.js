#!/usr/bin/env node
/**
 * Script para gerar ícones da extensão ImobFlash Agent
 * Requer: npm install canvas (ou usar ferramenta online)
 * 
 * Alternativa: Use https://convertio.co/svg-png/ para converter icon.svg
 * para os tamanhos: 16x16, 48x48, 128x128
 */

const fs = require('fs');
const path = require('path');

// Verifica se canvas está disponível
let Canvas;
try {
    Canvas = require('canvas');
} catch (e) {
    console.log('⚠️  Biblioteca "canvas" não encontrada.');
    console.log('📝 Instale com: npm install canvas');
    console.log('📝 Ou use o arquivo icon.svg e converta online em: https://convertio.co/svg-png/');
    console.log('\n✨ Tamanhos necessários: 16x16, 48x48, 128x128');
    process.exit(1);
}

function createIcon(size) {
    const canvas = Canvas.createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fundo transparente
    ctx.clearRect(0, 0, size, size);
    
    // Gradiente circular
    const center = size / 2;
    const radius = size / 2 - 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // Círculo de fundo
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = Math.max(1, size / 64);
    ctx.stroke();
    
    // Casa (corpo do robô)
    const houseWidth = size * 0.5;
    const houseHeight = size * 0.35;
    const houseX = center - houseWidth / 2;
    const houseY = center + size * 0.05;
    
    // Telhado (triângulo)
    ctx.beginPath();
    ctx.moveTo(center, houseY - size * 0.15);
    ctx.lineTo(houseX, houseY);
    ctx.lineTo(houseX + houseWidth, houseY);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Corpo da casa
    ctx.fillStyle = 'white';
    ctx.fillRect(houseX, houseY, houseWidth, houseHeight);
    
    // Porta
    const doorWidth = size * 0.15;
    const doorHeight = size * 0.2;
    const doorX = center - doorWidth / 2;
    const doorY = houseY + houseHeight - doorHeight;
    ctx.fillStyle = '#667eea';
    ctx.fillRect(doorX, doorY, doorWidth, doorHeight);
    
    // Olhos do robô (no telhado)
    const eyeSize = Math.max(2, size / 16);
    const eyeY = houseY - size * 0.1;
    ctx.fillStyle = '#667eea';
    
    // Olho esquerdo
    ctx.beginPath();
    ctx.arc(center - size * 0.12, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Olho direito
    ctx.beginPath();
    ctx.arc(center + size * 0.12, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas;
}

function main() {
    const sizes = [16, 48, 128];
    const iconsDir = path.join(__dirname, 'icons');
    
    // Cria diretório se não existir
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }
    
    console.log('🎨 Gerando ícones da extensão ImobFlash Agent...\n');
    
    sizes.forEach(size => {
        const icon = createIcon(size);
        const filename = path.join(iconsDir, `icon${size}.png`);
        const buffer = icon.toBuffer('image/png');
        fs.writeFileSync(filename, buffer);
        console.log(`✅ Criado: icons/icon${size}.png (${size}x${size})`);
    });
    
    console.log('\n✨ Ícones gerados com sucesso!');
    console.log(`📁 Diretório: ${iconsDir}/`);
}

main();

