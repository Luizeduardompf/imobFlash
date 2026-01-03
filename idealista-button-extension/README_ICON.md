# Gerando Ícones da Extensão

A extensão precisa de ícones nos tamanhos: **16x16**, **48x48** e **128x128** pixels.

## Opção 1: Usando o script Node.js (Recomendado)

1. Instale a dependência:
```bash
npm install canvas
```

2. Execute o script:
```bash
node generate_icon.js
```

Os ícones serão criados na pasta `icons/`.

## Opção 2: Converter SVG online

1. Abra o arquivo `icon.svg` em um editor de imagens ou navegador
2. Use uma ferramenta online como:
   - https://convertio.co/svg-png/
   - https://cloudconvert.com/svg-to-png
3. Converta para PNG nos tamanhos:
   - 16x16 → `icon16.png`
   - 48x48 → `icon48.png`
   - 128x128 → `icon128.png`
4. Salve os arquivos na pasta `icons/`

## Opção 3: Usando Python (se tiver PIL/Pillow)

1. Instale Pillow:
```bash
pip install Pillow
```

2. Execute o script:
```bash
python3 generate_icon.py
```

## Estrutura Final

Após gerar os ícones, a estrutura deve ser:

```
idealista-button-extension/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── manifest.json (já configurado)
```

O `manifest.json` já está configurado para usar esses ícones!

