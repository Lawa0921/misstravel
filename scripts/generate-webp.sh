#!/bin/bash
# 批量生成 WebP 圖片
# 用法: ./scripts/generate-webp.sh

ASSETS_DIR="assets/images"
QUALITY=80

echo "開始生成 WebP 圖片..."
echo "品質設定: $QUALITY"
echo ""

count=0
skip=0

find "$ASSETS_DIR" -type f \( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" \) | while read file; do
    webp_file="${file%.*}.webp"

    # 如果 WebP 已存在且比原檔新，跳過
    if [ -f "$webp_file" ] && [ "$webp_file" -nt "$file" ]; then
        echo "跳過 (已存在): $webp_file"
        continue
    fi

    echo "轉換: $file -> $webp_file"
    convert "$file" -quality $QUALITY "$webp_file"

    if [ $? -eq 0 ]; then
        original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        webp_size=$(stat -f%z "$webp_file" 2>/dev/null || stat -c%s "$webp_file" 2>/dev/null)
        savings=$((100 - (webp_size * 100 / original_size)))
        echo "  節省: ${savings}% (${original_size} -> ${webp_size} bytes)"
    fi
done

echo ""
echo "WebP 生成完成！"
