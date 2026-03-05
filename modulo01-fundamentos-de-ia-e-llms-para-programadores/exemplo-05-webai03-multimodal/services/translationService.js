export class TranslationService {
    constructor() {
        this.translator = null;
        this.languageDetector = null;
        this.isDownloading = false;
    }

    async initialize() {
        try {
            // Check availability first
            const availability = await Translator.availability({
                sourceLanguage: 'en',
                targetLanguage: 'pt'
            });
            console.log('Translator availability:', availability);

            // If already available, initialize directly
            if (availability === 'available') {
                await this.createTranslator();
            }
            // If downloadable or downloading, we need user gesture
            // The translator will be created when user clicks the download button

            // Language detector should work
            this.languageDetector = await LanguageDetector.create();
            console.log('Language Detector initialized');

            return availability;
        } catch (error) {
            console.error('Error initializing translation:', error);
            throw new Error('⚠️ Erro ao inicializar APIs de tradução.');
        }
    }

    async createTranslator() {
        if (this.translator) {
            return true;
        }

        this.translator = await Translator.create({
            sourceLanguage: 'en',
            targetLanguage: 'pt',
            monitor(m) {
                m.addEventListener('downloadprogress', (e) => {
                    const percent = ((e.loaded / e.total) * 100).toFixed(0);
                    console.log(`Translator downloaded ${percent}%`);
                });
            }
        });
        console.log('Translator initialized');
        return true;
    }

    // Method to be called from user gesture (button click)
    async downloadTranslator() {
        if (this.translator) {
            return true;
        }

        if (this.isDownloading) {
            console.log('Already downloading translator');
            return false;
        }

        this.isDownloading = true;
        try {
            await this.createTranslator();
            return true;
        } catch (error) {
            console.error('Error downloading translator:', error);
            this.isDownloading = false;
            throw error;
        }
    }

    async translateToPortuguese(text) {
        // If translator not available, try to create it (may require user gesture)
        if (!this.translator) {
            console.warn('Translator not available, attempting to create...');
            try {
                await this.createTranslator();
            } catch (error) {
                console.warn('Could not create translator, returning original text:', error.message);
                return text;
            }
        }

        try {
            // Detect language first
            if (this.languageDetector) {
                const detectionResults = await this.languageDetector.detect(text);
                console.log('Detected languages:', detectionResults);

                // If already in Portuguese, no need to translate
                if (detectionResults && detectionResults[0]?.detectedLanguage === 'pt') {
                    console.log('Text is already in Portuguese');
                    return text;
                }
            }

            // Use streaming translation
            const stream = this.translator.translateStreaming(text);
            let translated = '';
            for await (const chunk of stream) {
                translated = chunk; // Each chunk is the full translation so far
            }
            console.log('Translated text:', translated);
            return translated;
        } catch (error) {
            console.error('Translation error:', error);
            return text; // Return original text if translation fails
        }
    }

    isTranslatorReady() {
        return this.translator !== null;
    }
}
