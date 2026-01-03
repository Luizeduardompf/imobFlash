#!/usr/bin/env python3
"""
Script para gerar ícones da extensão ImobFlash Agent
Gera ícones nos tamanhos: 16x16, 48x48, 128x128
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    """Cria um ícone no tamanho especificado"""
    # Cria imagem com fundo transparente
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Cores do gradiente (roxo/azul)
    color1 = (102, 126, 234)  # #667eea
    color2 = (118, 75, 162)   # #764ba2
    
    # Desenha fundo com gradiente circular
    center = size // 2
    radius = size // 2 - 2
    
    # Cria gradiente simples (círculo preenchido)
    for i in range(radius):
        # Interpolação de cor
        ratio = i / radius
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        
        # Desenha círculo concêntrico
        draw.ellipse(
            [center - radius + i, center - radius + i, 
             center + radius - i, center + radius - i],
            fill=(r, g, b, 255)
        )
    
    # Desenha borda branca sutil
    draw.ellipse(
        [2, 2, size - 2, size - 2],
        outline=(255, 255, 255, 200),
        width=max(1, size // 32)
    )
    
    # Desenha ícone de robô/casa
    # Cabeça do robô (retângulo arredondado)
    head_size = int(size * 0.4)
    head_x = center - head_size // 2
    head_y = center - head_size // 2 - int(size * 0.1)
    
    # Corpo (casa)
    body_width = int(size * 0.5)
    body_height = int(size * 0.35)
    body_x = center - body_width // 2
    body_y = center + int(size * 0.05)
    
    # Desenha casa (corpo do robô)
    # Telhado (triângulo)
    roof_points = [
        (center, body_y - int(size * 0.15)),
        (body_x, body_y),
        (body_x + body_width, body_y)
    ]
    draw.polygon(roof_points, fill=(255, 255, 255, 255))
    
    # Corpo da casa (retângulo)
    draw.rectangle(
        [body_x, body_y, body_x + body_width, body_y + body_height],
        fill=(255, 255, 255, 255)
    )
    
    # Porta (retângulo pequeno)
    door_width = int(size * 0.15)
    door_height = int(size * 0.2)
    door_x = center - door_width // 2
    door_y = body_y + body_height - door_height
    draw.rectangle(
        [door_x, door_y, door_x + door_width, door_y + door_height],
        fill=(102, 126, 234, 255)
    )
    
    # Olhos do robô (dois círculos pequenos no telhado)
    eye_size = max(2, size // 16)
    eye_y = body_y - int(size * 0.1)
    draw.ellipse(
        [center - int(size * 0.12) - eye_size, eye_y - eye_size,
         center - int(size * 0.12) + eye_size, eye_y + eye_size],
        fill=(102, 126, 234, 255)
    )
    draw.ellipse(
        [center + int(size * 0.12) - eye_size, eye_y - eye_size,
         center + int(size * 0.12) + eye_size, eye_y + eye_size],
        fill=(102, 126, 234, 255)
    )
    
    return img

def main():
    """Gera todos os ícones necessários"""
    sizes = [16, 48, 128]
    icons_dir = 'icons'
    
    # Cria diretório de ícones se não existir
    os.makedirs(icons_dir, exist_ok=True)
    
    print("🎨 Gerando ícones da extensão ImobFlash Agent...")
    
    for size in sizes:
        icon = create_icon(size)
        filename = f'{icons_dir}/icon{size}.png'
        icon.save(filename, 'PNG')
        print(f"✅ Criado: {filename} ({size}x{size})")
    
    print("\n✨ Ícones gerados com sucesso!")
    print(f"📁 Diretório: {icons_dir}/")

if __name__ == '__main__':
    main()

