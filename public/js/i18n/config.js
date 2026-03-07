/**
 * Copyright (c) 2026 Sociedad Comercial Yepsen LTDA. All rights reserved.
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, distribution, or use of this file, via any medium, is strictly prohibited.
 */

// i18next 配置文件
const i18nConfig = {
    // 默认语言为西班牙语
    lng: 'es',
    // 当语言不存在时使用的回退语言
    fallbackLng: 'en',
    // 是否启用调试模式
    debug: false,
    // 插值选项
    interpolation: {
        escapeValue: false, // React 已经安全地转义字符串
        formatSeparator: ',',
        format: (value, format, lng) => {
            if (format === 'uppercase') return value.toUpperCase();
            return value;
        }
    },
    // 资源加载选项
    resources: {
        // 资源将通过单独的JSON文件加载
    }
};

// 导出配置
window.i18nConfig = i18nConfig;