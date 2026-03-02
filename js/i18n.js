export class I18nManager {
    constructor() {
        this.translations = {};
        this.lang = 'ja';
    }

    async init() {
        const userLang = navigator.language || navigator.userLanguage;
        this.lang = userLang.startsWith('en') ? 'en' : 'ja';

        try {
            const response = await fetch(`./js/i18n/${this.lang}.json`);
            this.translations = await response.json();
            this.applyTranslations();
            document.documentElement.lang = this.lang;
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    t(key) {
        return this.translations[key] || key;
    }

    applyTranslations() {
        // [data-i18n] 属性を持つ要素のテキストを更新
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'MWC-TEXTFIELD' || el.tagName === 'MWC-BUTTON' || el.tagName === 'MWC-FAB') {
                el.label = this.t(key);
            } else if (el.tagName === 'MWC-ICON-BUTTON') {
                el.title = this.t(key);
            } else {
                el.textContent = this.t(key);
            }
        });

        // titleタグの更新
        const titleKey = document.querySelector('title').getAttribute('data-i18n');
        if (titleKey) {
            document.title = this.t(titleKey);
        }
    }
}
